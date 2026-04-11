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
  russian:     '🇷🇺 Русская',
  european:    '🇪🇺 Европейская',
  asian:       '🍜 Паназиатская',
  japanese:    '🍣 Японская',
  korean:      '🥘 Корейская',
  chinese:     '🥢 Китайская',
  italian:     '🍕 Итальянская',
  georgian:    '🫕 Грузинская',
  american:    '🍔 Американская',
  middle_east: '🧆 Ближневосточная',
  other:       '🌍 Другая',
};

const PRICE_LABELS = { 1: '₽', 2: '₽₽', 3: '₽₽₽', 4: '₽₽₽₽' };

function Avatar({ user, size = 'xs', onClick }) {
  const cls = `avatar avatar-${size}${onClick ? ' clickable' : ''}`;
  if (user.avatar)
    return <img src={`${UPLOADS_URL}/avatars/${user.avatar}`} alt={user.username} className={cls} onClick={onClick} />;
  return (
    <div className={`${cls} avatar-placeholder`} onClick={onClick}>
      {user.username[0].toUpperCase()}
    </div>
  );
}

// One user's combined card: photos + rating + text
function UserContribution({ review, photos, isOwn, onUserClick, onRefresh, placeId }) {
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(review?.text || '');
  const [editRating, setEditRating] = useState(review?.rating || 5);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const user = { username: review?.username || photos[0]?.username, avatar: review?.avatar || photos[0]?.avatar };
  const userId = review?.user_id || photos[0]?.user_id;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/reviews/${review.id}`, { rating: editRating, text: editText });
      setEditing(false);
      await onRefresh();
    } catch {
      alert('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    try {
      await api.post(`/places/${placeId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await onRefresh();
    } catch {
      alert('Не удалось загрузить фото');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={`contribution-card${isOwn ? ' own' : ''}`}>
      {/* Header */}
      <div className="contribution-header">
        <button className="user-link" onClick={() => onUserClick(userId)}>
          <Avatar user={user} size="sm" />
          <span className="review-author">{user.username}</span>
        </button>
        {review && !editing && <StarRating value={review.rating} readonly size="sm" />}
        {isOwn && !editing && (
          <button className="btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setEditing(true)} title="Редактировать">✏️</button>
        )}
      </div>

      {/* Edit form */}
      {editing ? (
        <div className="contribution-edit">
          <StarRating value={editRating} onChange={setEditRating} size="md" />
          <textarea
            className="form-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            style={{ marginTop: 8 }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Отмена</button>
          </div>
        </div>
      ) : (
        review?.text && <p className="review-text">{review.text}</p>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="photos-grid" style={{ marginTop: 8 }}>
          {photos.map((ph) => (
            <img
              key={ph.id}
              src={`${UPLOADS_URL}/places/${ph.filename}`}
              alt=""
              className="photo-thumb"
              onClick={() => setLightbox(ph.filename)}
            />
          ))}
        </div>
      )}

      {/* Upload button for own card */}
      {isOwn && (
        <label className="btn btn-outline btn-sm upload-btn" style={{ marginTop: 8 }}>
          {uploading ? 'Загрузка...' : '+ Фото'}
          <input type="file" multiple accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
        </label>
      )}

      {/* Date */}
      {review && (
        <span className="text-xs text-muted" style={{ display: 'block', marginTop: 6 }}>
          {new Date(review.created_at).toLocaleDateString('ru-RU')}
        </span>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={`${UPLOADS_URL}/places/${lightbox}`} alt="" />
        </div>
      )}
    </div>
  );
}

export default function PlacePanel({ place, onClose, onDelete, onRefresh, onUserClick }) {
  const { user } = useAuth();
  const [tab, setTab]               = useState('info');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked]           = useState(!!place.user_liked);
  const [likesCount, setLikesCount] = useState(place.likes_count || 0);

  const isOwner     = user && place.user_id === user.id;
  const myReview    = user && place.reviews?.find((r) => r.user_id === user.id);
  const avgRating   = place.review_count > 0 ? Number(place.avg_rating).toFixed(1) : null;

  // Group photos by user_id
  const photosByUser = {};
  (place.photos || []).forEach((ph) => {
    if (!photosByUser[ph.user_id]) photosByUser[ph.user_id] = [];
    photosByUser[ph.user_id].push(ph);
  });

  // Build combined contributor list: union of reviewers and photo uploaders
  const allUserIds = new Set([
    ...(place.reviews || []).map((r) => r.user_id),
    ...Object.keys(photosByUser).map(Number),
  ]);
  const contributors = Array.from(allUserIds).map((uid) => ({
    uid,
    review: (place.reviews || []).find((r) => r.user_id === uid) || null,
    photos: photosByUser[uid] || [],
  }));
  // Own card first
  contributors.sort((a, b) => (b.uid === user?.id ? 1 : 0) - (a.uid === user?.id ? 1 : 0));

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

  const handleLikePlace = async () => {
    if (!user) return;
    const prev = liked;
    setLiked(!prev);
    setLikesCount((c) => (prev ? c - 1 : c + 1));
    try {
      await api.post(`/places/${place.id}/like`);
    } catch {
      setLiked(prev);
      setLikesCount((c) => (prev ? c + 1 : c - 1));
    }
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

  return (
    <div className="place-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-main">
          <h2 className="panel-title">{place.name}</h2>
          <span className="panel-category">{CATEGORY_LABELS[place.category] || place.category}</span>
        </div>
        <div className="panel-header-actions">
          {user && (
            <button className={`like-place-btn${liked ? ' liked' : ''}`} onClick={handleLikePlace} title={liked ? 'Убрать из избранного' : 'В избранное'}>
              {liked ? '❤️' : '🤍'}{likesCount > 0 ? ` ${likesCount}` : ''}
            </button>
          )}
          {isOwner && <button className="btn btn-danger btn-sm" onClick={handleDeletePlace}>Удалить</button>}
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
          <div className="rating-chip">★ {avgRating}<span className="rating-count">({place.review_count})</span></div>
        )}
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        {[
          { id: 'info',    label: 'Инфо' },
          { id: 'reviews', label: `Отзывы${contributors.length ? ` (${contributors.length})` : ''}` },
        ].map((t) => (
          <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel-body">
        {/* INFO TAB */}
        {tab === 'info' && (
          <div>
            {place.own_rating > 0 && (
              <div className="own-rating-badge">
                <span className="own-rating-label">Моя оценка</span>
                <span className="own-rating-value">{place.own_rating}/10</span>
              </div>
            )}
            <div className="place-chips">
              {place.cuisine && CUISINE_LABELS[place.cuisine] && (
                <span className="place-chip">{CUISINE_LABELS[place.cuisine]}</span>
              )}
              {place.price_level > 0 && (
                <span className="place-chip">{PRICE_LABELS[place.price_level]}</span>
              )}
            </div>
            {place.address && <p className="place-address">📍 {place.address}</p>}
            {place.description
              ? <p className="place-desc">{place.description}</p>
              : <p className="text-muted text-sm">Описание не добавлено</p>}
            {place.website && (
              <a href={place.website.startsWith('http') ? place.website : `https://${place.website}`}
                target="_blank" rel="noopener noreferrer" className="place-website">
                🌐 {place.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {place.hashtags && <p className="place-hashtags">{place.hashtags}</p>}
            <p className="text-xs text-muted" style={{ marginTop: '1rem' }}>
              Добавлено {new Date(place.created_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
        )}

        {/* REVIEWS TAB */}
        {tab === 'reviews' && (
          <div>
            {/* Add review form — only if user logged in and hasn't reviewed yet */}
            {user && !myReview && (
              <form onSubmit={handleAddReview} className="review-form">
                <h4>Ваш отзыв</h4>
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
                <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} disabled={submitting}>
                  {submitting ? 'Отправка...' : 'Отправить'}
                </button>
              </form>
            )}

            {!user && <div className="alert-info">Войдите, чтобы оставить отзыв</div>}

            {contributors.length === 0 && (
              <p className="text-muted" style={{ marginTop: '.75rem' }}>Пока нет отзывов. Будьте первым!</p>
            )}

            {contributors.map(({ uid, review, photos }) => (
              <UserContribution
                key={uid}
                review={review}
                photos={photos}
                isOwn={user?.id === uid}
                onUserClick={onUserClick}
                onRefresh={onRefresh}
                placeId={place.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
