import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { UPLOADS_URL } from '../api';

const CATEGORY_LABELS = {
  cafe:        '☕ Кафе',
  coffee:      '☕ Кофейня',
  fastfood:    '🍔 Фастфуд',
  restaurant:  '🍽️ Ресторан',
  bar:         '🍺 Бар',
  other:       '📍 Другое',
};

const CATEGORIES = [
  { value: 'cafe',       label: '☕ Кафе' },
  { value: 'coffee',     label: '☕ Кофейня' },
  { value: 'fastfood',   label: '🍔 Фастфуд' },
  { value: 'restaurant', label: '🍽️ Ресторан' },
  { value: 'bar',        label: '🍺 Бар' },
  { value: 'other',      label: '📍 Другое' },
];

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
  indian:      '🍛 Индийская',
  other:       '🌍 Другая',
};

const CUISINES = [
  { value: '',            label: '— не указана —' },
  { value: 'russian',     label: '🇷🇺 Русская' },
  { value: 'european',    label: '🇪🇺 Европейская' },
  { value: 'asian',       label: '🍜 Паназиатская' },
  { value: 'japanese',    label: '🍣 Японская' },
  { value: 'korean',      label: '🥘 Корейская' },
  { value: 'chinese',     label: '🥢 Китайская' },
  { value: 'italian',     label: '🍕 Итальянская' },
  { value: 'georgian',    label: '🫕 Грузинская' },
  { value: 'american',    label: '🍔 Американская' },
  { value: 'middle_east', label: '🧆 Ближневосточная' },
  { value: 'indian',      label: '🍛 Индийская' },
  { value: 'other',       label: '🌍 Другая' },
];

const PRICE_LABELS = { 1: '₽', 2: '₽₽', 3: '₽₽₽', 4: '₽₽₽₽' };
const PRICE_LEVELS = [
  { value: 0, label: '— не указана —' },
  { value: 1, label: '₽ Дёшево' },
  { value: 2, label: '₽₽ Средне' },
  { value: 3, label: '₽₽₽ Дорого' },
  { value: 4, label: '₽₽₽₽ Очень дорого' },
];

// Contribution card — view and edit modes, no internal edit toggle
function UserContribution({ review, photos, isOwn, onRefresh, placeId, isEditMode, onEditClose }) {
  const { user } = useAuth();
  const [editText, setEditText]         = useState(review?.text || '');
  const [editRating, setEditRating]     = useState(review?.rating || 5);
  const [newPhotos, setNewPhotos]         = useState([]);
  const [pendingDeletes, setPendingDeletes] = useState([]); // photo ids to delete on save
  const [internalEdit, setInternalEdit]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [lightbox, setLightbox]         = useState(null); // index into photos[]
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (review?.id) {
      api.get(`/reviews/${review.id}/comments`)
        .then((res) => setComments(res.data))
        .catch(() => {});
    }
  }, [review?.id]);

  const effectiveEdit = isEditMode || internalEdit;

  // Sync edit fields whenever edit mode is entered
  useEffect(() => {
    if (isEditMode || internalEdit) {
      setEditText(review?.text || '');
      setEditRating(review?.rating || 5);
      setNewPhotos([]);
      setPendingDeletes([]);
    }
  }, [isEditMode, internalEdit]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await api.post(`/reviews/${review.id}/comments`, { text: commentText });
      setComments((prev) => [...prev, res.data]);
      setCommentText('');
    } catch {
      alert('Не удалось добавить комментарий');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/reviews/${review.id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      alert('Не удалось удалить комментарий');
    }
  };

  if (!effectiveEdit && !review && photos.length === 0) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (review) {
        // Single PUT: review fields + new photos + deletions
        const fd = new FormData();
        fd.append('rating', editRating);
        fd.append('text', editText);
        if (pendingDeletes.length) fd.append('delete_photo_ids', JSON.stringify(pendingDeletes));
        newPhotos.forEach((f) => fd.append('photos', f));
        await api.put(`/reviews/${review.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else if (editText.trim()) {
        // Create new review, then upload photos separately
        await api.post('/reviews', { place_id: placeId, rating: editRating, text: editText });
        if (newPhotos.length) {
          const fd = new FormData();
          newPhotos.forEach((f) => fd.append('photos', f));
          await api.post(`/places/${placeId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      }
      setNewPhotos([]);
      setPendingDeletes([]);
      await onRefresh();
      if (internalEdit) setInternalEdit(false);
      else onEditClose?.();
    } catch {
      alert('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!window.confirm('Удалить ваш отзыв?')) return;
    setDeleting(true);
    try {
      await api.delete(`/reviews/${review.id}`);
      await onRefresh();
      onEditClose?.();
    } catch {
      alert('Не удалось удалить отзыв');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`contribution-card${isOwn ? ' own' : ''}`}>
      {/* EDIT mode */}
      {isOwn && effectiveEdit && (
        <div className="contribution-edit">
          <textarea
            className="form-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            placeholder="Ваш отзыв..."
          />

          {/* Unified photo grid: existing + new + add-tile */}
          <div className="photos-grid edit-photos-grid">
            {photos
              .filter((ph) => !pendingDeletes.includes(ph.id))
              .map((ph) => (
                <div key={`e-${ph.id}`} className="photo-thumb-wrap">
                  <img src={`${UPLOADS_URL}/places/${ph.filename}`} alt="" className="photo-thumb" />
                  <button className="photo-delete-btn"
                    onClick={() => setPendingDeletes((p) => [...p, ph.id])}
                    title="Удалить фото">✕</button>
                </div>
              ))}
            {newPhotos.map((f, i) => (
              <div key={`n-${i}`} className="photo-thumb-wrap">
                <img src={URL.createObjectURL(f)} alt="" className="photo-thumb" />
                <button className="photo-delete-btn"
                  onClick={() => setNewPhotos((p) => p.filter((_, j) => j !== i))}
                  title="Убрать">✕</button>
              </div>
            ))}
            {photos.filter((ph) => !pendingDeletes.includes(ph.id)).length + newPhotos.length < 5 && (
              <label className="photo-add-tile">
                + Фото
                <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => {
                    const kept = photos.filter((ph) => !pendingDeletes.includes(ph.id)).length;
                    const remaining = 5 - kept - newPhotos.length;
                    setNewPhotos((p) => [...p, ...Array.from(e.target.files).slice(0, remaining)]);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button className="btn btn-outline btn-sm"
              onClick={() => { setNewPhotos([]); setPendingDeletes([]); if (internalEdit) setInternalEdit(false); else onEditClose?.(); }}>
              Отмена
            </button>
            {review && (
              <button className="btn btn-outline btn-sm"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginLeft: 'auto' }}
                onClick={handleDeleteReview} disabled={deleting}>
                Удалить отзыв
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW mode */}
      {(!isOwn || !effectiveEdit) && (
        <>
          {isOwn && (review || photos.length > 0) && (
            <div style={{ textAlign: 'right', marginBottom: 4 }}>
              <button className="btn-icon-sm" onClick={() => setInternalEdit(true)} title="Редактировать отзыв">✏️</button>
            </div>
          )}
          {photos.length > 0 && (
            <div className="photos-grid">
              {photos.map((ph, i) => (
                <img key={ph.id} src={`${UPLOADS_URL}/places/${ph.filename}`} alt=""
                  className="photo-thumb" onClick={() => setLightbox(i)} />
              ))}
            </div>
          )}
          {review?.text && (
            <p className="review-text" style={{ marginTop: photos.length ? 6 : 0 }}>{review.text}</p>
          )}

          {/* Comments — shown for any review, input only for non-authors */}
          {review && (
            <div className="review-comments">
              {comments.map((c) => (
                <div key={c.id} className="review-comment">
                  <span className="review-comment-author">{c.username}</span>
                  <span className="review-comment-text">{c.text}</span>
                  {user?.id === c.user_id && (
                    <button className="review-comment-delete" onClick={() => handleDeleteComment(c.id)} title="Удалить">✕</button>
                  )}
                </div>
              ))}
              {user && user.id !== review.user_id && (
                <div className="review-comment-input">
                  <input
                    type="text"
                    placeholder="Написать комментарий..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !postingComment && handleAddComment()}
                  />
                  <button onClick={handleAddComment} disabled={postingComment || !commentText.trim()}>
                    {postingComment ? '...' : 'Отправить'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {lightbox !== null && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={`${UPLOADS_URL}/places/${photos[lightbox]?.filename}`} alt="" onClick={(e) => e.stopPropagation()} />
          {photos.length > 1 && (
            <>
              <button className="lightbox-btn lightbox-btn--prev"
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length); }}>
                ‹
              </button>
              <button className="lightbox-btn lightbox-btn--next"
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % photos.length); }}>
                ›
              </button>
              <span className="lightbox-counter">{lightbox + 1} / {photos.length}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EditPlaceForm({ place, onSave, onCancel }) {
  const [name, setName]           = useState(place.name || '');
  const [description, setDesc]    = useState(place.description || '');
  const [category, setCategory]   = useState(place.category || 'other');
  const [cuisine, setCuisine]     = useState(place.cuisine || '');
  const [priceLevel, setPrice]    = useState(place.price_level || 0);
  const [website, setWebsite]     = useState(place.website || '');
  const [hashtags, setHashtags]   = useState(place.hashtags || '');
  const [address, setAddress]     = useState(place.address || '');
  const [ownRating, setOwnRating] = useState(place.own_rating || 0);
  const [saving, setSaving]       = useState(false);

  const showCuisine = ['cafe', 'coffee', 'fastfood', 'restaurant', 'bar'].includes(category);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(), description, category,
        cuisine: showCuisine ? cuisine : '',
        price_level: priceLevel, website: website.trim(),
        hashtags: hashtags.trim(), address: address.trim(),
        own_rating: ownRating || '',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-place-form">
      <div className="form-group">
        <label className="form-label">Название *</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Категория</label>
          <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Цена</label>
          <select className="form-input" value={priceLevel} onChange={(e) => setPrice(Number(e.target.value))}>
            {PRICE_LEVELS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      {showCuisine && (
        <div className="form-group">
          <label className="form-label">Кухня</label>
          <select className="form-input" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
            {CUISINES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Моя оценка</label>
        <div className="rating-10-row">
          {[1,2,3,4,5,6,7,8,9,10].map((n) => (
            <button key={n} type="button"
              className={`rating-10-btn${ownRating === n ? ' active' : ''}${n <= 5 ? ' low' : n <= 7 ? ' mid' : ' high'}`}
              onClick={() => setOwnRating(ownRating === n ? 0 : n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Адрес</label>
        <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Улица, дом" />
      </div>
      <div className="form-group">
        <label className="form-label">Описание</label>
        <textarea className="form-input" value={description} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Расскажите об этом месте..." />
      </div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Сайт</label>
          <input className="form-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Хэштеги</label>
          <input className="form-input" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#уютно" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}

export default function PlacePanel({ place: initialPlace, onClose, onDelete, onRefresh, onUserClick }) {
  const { user } = useAuth();
  const [place, setPlace]           = useState(initialPlace);
  const [liked, setLiked]           = useState(!!place.user_liked);
  const [likesCount, setLikesCount] = useState(place.likes_count || 0);
  const [featured, setFeatured]     = useState(!!place.is_featured);
  const [editing, setEditing]       = useState(false);

  const isOwner = user && place.user_id === user.id;
  const avgRating = place.review_count > 0 ? Number(place.avg_rating).toFixed(1) : null;

  const photosByUser = {};
  (place.photos || []).forEach((ph) => {
    if (!photosByUser[ph.user_id]) photosByUser[ph.user_id] = [];
    photosByUser[ph.user_id].push(ph);
  });

  const allUserIds = new Set([
    ...(place.reviews || []).map((r) => r.user_id),
    ...Object.keys(photosByUser).map(Number),
    ...(user ? [user.id] : []),
  ]);
  const contributors = Array.from(allUserIds).map((uid) => ({
    uid,
    review: (place.reviews || []).find((r) => r.user_id === uid) || null,
    photos: photosByUser[uid] || [],
  }));
  contributors.sort((a, b) => (b.uid === user?.id ? 1 : 0) - (a.uid === user?.id ? 1 : 0));

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

  const handleFeatureToggle = async () => {
    if (!isOwner) return;
    const prev = featured;
    setFeatured(!prev);
    try {
      await api.post(`/places/${place.id}/feature`);
    } catch {
      setFeatured(prev);
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

  const handleSaveEdit = async (data) => {
    const res = await api.put(`/places/${place.id}`, data);
    setPlace((p) => ({ ...p, ...res.data }));
    setEditing(false);
    await onRefresh();
  };

  return (
    <div className={`place-panel${featured ? ' place-panel--featured' : ''}`}>
      {featured && (
        <div className="featured-banner">
          <span className="featured-banner-icon">✦</span>
          <span>Моё особое место</span>
          <span className="featured-banner-icon">✦</span>
        </div>
      )}

      {/* Header: title row + actions row */}
      <div className="panel-header">
        <div className="panel-header-top">
          <h2 className="panel-title">{place.name}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="panel-header-bottom">
          <span className="panel-category">{CATEGORY_LABELS[place.category] || place.category}</span>
          <div className="panel-header-actions">
            {isOwner && (
              <button
                className={`feature-toggle-btn${featured ? ' active' : ''}`}
                onClick={handleFeatureToggle}
              >
                <span>✦</span> Моё особое место
              </button>
            )}
            {user && (
              <button
                className={`btn btn-sm like-place-btn${liked ? ' liked' : ''}`}
                onClick={handleLikePlace}
              >
                {liked ? '❤️' : '🤍'}{likesCount > 0 ? ` ${likesCount}` : ''}
              </button>
            )}
            {isOwner && <button className="btn btn-danger btn-sm" onClick={handleDeletePlace}>Удалить</button>}
          </div>
        </div>
      </div>

      {avgRating && (
        <div className="panel-meta">
          <div className="rating-chip">★ {avgRating}<span className="rating-count">({place.review_count})</span></div>
        </div>
      )}

      <div className="panel-body">
        <div className="panel-section">
          <div className="panel-section-header">
            <span className="panel-section-title">Об отзыве</span>
            {/* ONE edit button for owner — edits place fields + own review/photos */}
            {isOwner && !editing && (
              <button className="btn-icon-sm" onClick={() => setEditing(true)} title="Редактировать">✏️</button>
            )}
          </div>

          {editing ? (
            <EditPlaceForm place={place} onSave={handleSaveEdit} onCancel={() => setEditing(false)} />
          ) : (
            <>
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
                <a
                  href={place.website.startsWith('http') ? place.website : `https://${place.website}`}
                  target="_blank" rel="noopener noreferrer" className="place-website"
                >
                  🌐 {place.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {place.hashtags && <p className="place-hashtags">{place.hashtags}</p>}
            </>
          )}
        </div>

        <div className="panel-section">
          {!user && (
            <div className="alert-info">Войдите, чтобы оставить отзыв</div>
          )}

          {contributors.map(({ uid, review, photos }) => {
            const username = review?.username ?? photos[0]?.username;
            const isOwn = user?.id === uid;
            if (!username && !review && photos.length === 0) return null;
            return (
              <div key={uid}>
                {username && (
                  <div className="panel-section-header" style={{ marginTop: 8 }}>
                    <button className="cc-review-author-btn panel-section-title" onClick={() => onUserClick?.(uid)}>
                      {username}
                    </button>
                    {isOwn && <span className="cc-review-own-label">вы</span>}
                  </div>
                )}
                <UserContribution
                  review={review}
                  photos={photos}
                  isOwn={isOwn}
                  onRefresh={onRefresh}
                  placeId={place.id}
                  isEditMode={editing && isOwn}
                  onEditClose={() => setEditing(false)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
