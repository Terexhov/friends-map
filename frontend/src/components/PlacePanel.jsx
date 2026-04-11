import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { UPLOADS_URL } from '../api';
import StarRating from './StarRating';

const CATEGORY_LABELS = {
  cafe:        '☕ Кафе',
  coffee:      '☕ Кофейня',
  fastfood:    '🍔 Фастфуд',
  restaurant:  '🍽️ Ресторан',
  bar:         '🍺 Бар',
  other:       '📍 Другое',
};

const CUISINE_LABELS = {
  russian:    '🇷🇺 Русская',
  european:   '🇪🇺 Европейская',
  asian:      '🍜 Паназиатская',
  japanese:   '🍣 Японская',
  korean:     '🥘 Корейская',
  chinese:    '🥢 Китайская',
  italian:    '🍕 Итальянская',
  georgian:   '🫕 Грузинская',
  american:   '🍔 Американская',
  middle_east:'🧆 Ближневосточная',
  other:      '🌍 Другая',
};

const PRICE_LABELS = { 1: '₽', 2: '₽₽', 3: '₽₽₽', 4: '₽₽₽₽' };

function Avatar({ user, size = 'xs', onClick }) {
  const cls = `avatar avatar-${size} ${onClick ? 'clickable' : ''}`;
  if (user.avatar)
    return <img src={`${UPLOADS_URL}/avatars/${user.avatar}`} alt={user.username} className={cls} onClick={onClick} />;
  return (
    <div className={`${cls} avatar-placeholder`} onClick={onClick}>
      {user.username[0].toUpperCase()}
    </div>
  );
}

export default function PlacePanel({ place, onClose, onDelete, onRefresh, onUserClick }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('info');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const isOwner = user && place.user_id === user.id;
  const userReviewed = user && place.reviews?.some((r) => r.user_id === user.id);
  const avgRating = place.review_count > 0 ? Number(place.avg_rating).toFixed(1) : null;
  const [liked, setLiked] = useState(!!place.user_liked);
  const [likesCount, setLikesCount] = useState(place.likes_count || 0);

  const handleLikePlace = async () => {
    if (!user) return;
    const prev = liked;
    setLiked(!prev);
    setLikesCount(c => prev ? c - 1 : c + 1);
    try {
      await api.post(`/places/${place.id}/like`);
    } catch {
      setLiked(prev);
      setLikesCount(c => prev ? c + 1 : c - 1);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/reviews', { place_id: place.id, rating: reviewRating, text: reviewText });
      setReviewText('');
      setReviewRating(5);
      await onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Не удалось добавить отзыв');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (reviewId) => {
    if (!user) return;
    try {
      await api.post(`/reviews/${reviewId}/like`);
      await onRefresh();
    } catch {}
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Удалить отзыв?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      await onRefresh();
    } catch {}
  };

  const handleDeletePlace = async () => {
    if (!window.confirm('Удалить это место? Все отзывы и фото будут удалены.')) return;
    try {
      await api.delete(`/places/${place.id}`);
      onDelete(place.id);
    } catch {
      alert('Не удалось удалить место');
    }
  };

  const handleUploadPhotos = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    try {
      await api.post(`/places/${place.id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await onRefresh();
    } catch {
      alert('Не удалось загрузить фото');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <div className="place-panel">
        {/* Header */}
        <div className="panel-header">
          <div className="panel-header-main">
            <h2 className="panel-title">{place.name}</h2>
            <span className="panel-category">{CATEGORY_LABELS[place.category] || place.category}</span>
          </div>
          <div className="panel-header-actions">
            {user && (
              <button
                className={`like-place-btn${liked ? ' liked' : ''}`}
                onClick={handleLikePlace}
                title={liked ? 'Убрать из избранного' : 'В избранное'}
              >
                {liked ? '❤️' : '🤍'} {likesCount > 0 ? likesCount : ''}
              </button>
            )}
            {isOwner && (
              <button className="btn btn-danger btn-sm" onClick={handleDeletePlace}>Удалить</button>
            )}
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Meta */}
        <div className="panel-meta">
          <button className="user-link" onClick={() => onUserClick(place.user_id)}>
            <Avatar user={{ username: place.username, avatar: place.avatar }} size="xs" />
            <span>{place.username}</span>
          </button>
          {avgRating && (
            <div className="rating-chip">
              ★ {avgRating}
              <span className="rating-count">({place.review_count})</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="panel-tabs">
          {[
            { id: 'info', label: 'Инфо' },
            { id: 'photos', label: `Фото${place.photos?.length ? ` (${place.photos.length})` : ''}` },
            { id: 'reviews', label: `Отзывы${place.reviews?.length ? ` (${place.reviews.length})` : ''}` },
          ].map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="panel-body">
          {/* INFO TAB */}
          {tab === 'info' && (
            <div>
              {/* Own rating */}
              {place.own_rating > 0 && (
                <div className="own-rating-badge">
                  <span className="own-rating-label">Моя оценка</span>
                  <span className="own-rating-value">{place.own_rating}/10</span>
                </div>
              )}

              {/* Meta chips */}
              <div className="place-chips">
                {place.cuisine && CUISINE_LABELS[place.cuisine] && (
                  <span className="place-chip">{CUISINE_LABELS[place.cuisine]}</span>
                )}
                {place.price_level > 0 && (
                  <span className="place-chip">{PRICE_LABELS[place.price_level]}</span>
                )}
              </div>

              {place.address && (
                <p className="place-address">📍 {place.address}</p>
              )}

              {place.description ? (
                <p className="place-desc">{place.description}</p>
              ) : (
                <p className="text-muted text-sm">Описание не добавлено</p>
              )}

              {place.website && (
                <a
                  href={place.website.startsWith('http') ? place.website : `https://${place.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="place-website"
                >
                  🌐 {place.website.replace(/^https?:\/\//, '')}
                </a>
              )}

              {place.hashtags && (
                <p className="place-hashtags">{place.hashtags}</p>
              )}

              <p className="text-xs text-muted" style={{ marginTop: '1rem' }}>
                Добавлено {new Date(place.created_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
          )}

          {/* PHOTOS TAB */}
          {tab === 'photos' && (
            <div>
              {place.photos?.length > 0 ? (
                <div className="photos-grid">
                  {place.photos.map((ph) => (
                    <img
                      key={ph.id}
                      src={`${UPLOADS_URL}/places/${ph.filename}`}
                      alt=""
                      className="photo-thumb"
                      onClick={() => setLightbox(ph.filename)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted">Пока нет фотографий</p>
              )}
              {user && (
                <label className="btn btn-outline btn-sm upload-btn">
                  {uploading ? 'Загрузка...' : '+ Добавить фото'}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUploadPhotos}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          )}

          {/* REVIEWS TAB */}
          {tab === 'reviews' && (
            <div>
              {/* Add review form */}
              {user && !userReviewed && (
                <form onSubmit={handleAddReview} className="review-form">
                  <h4>Написать отзыв</h4>
                  <div style={{ margin: '0.5rem 0' }}>
                    <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
                  </div>
                  <textarea
                    className="form-input"
                    placeholder="Поделитесь впечатлениями..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={3}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.5rem' }}
                    disabled={submitting}
                  >
                    {submitting ? 'Отправка...' : 'Отправить'}
                  </button>
                </form>
              )}

              {userReviewed && (
                <div className="alert-info">Вы уже оставили отзыв для этого места</div>
              )}

              {!user && (
                <div className="alert-info">Войдите, чтобы оставить отзыв</div>
              )}

              {place.reviews?.length === 0 && (
                <p className="text-muted" style={{ marginTop: '0.75rem' }}>
                  Пока нет отзывов. Будьте первым!
                </p>
              )}

              {place.reviews?.map((r) => (
                <div key={r.id} className="review-card">
                  <div className="review-top">
                    <button className="user-link" onClick={() => onUserClick(r.user_id)}>
                      <Avatar user={{ username: r.username, avatar: r.avatar }} size="xs" />
                      <span className="review-author">{r.username}</span>
                    </button>
                    <StarRating value={r.rating} readonly size="sm" />
                  </div>
                  {r.text && <p className="review-text">{r.text}</p>}
                  <div className="review-bottom">
                    <span className="text-xs text-muted">
                      {new Date(r.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    <div className="review-actions">
                      <button
                        className={`like-btn ${r.user_liked ? 'liked' : ''}`}
                        onClick={() => handleLike(r.id)}
                        disabled={!user || r.user_id === user?.id}
                        title="Нравится"
                      >
                        ♥ {r.likes_count > 0 ? r.likes_count : ''}
                      </button>
                      {user && r.user_id === user.id && (
                        <button
                          className="text-xs text-danger"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => handleDeleteReview(r.id)}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={`${UPLOADS_URL}/places/${lightbox}`} alt="" />
        </div>
      )}
    </>
  );
}
