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

// Unified contribution card — handles add / view / edit states
function UserContribution({ review, photos, isOwn, onUserClick, onRefresh, placeId, placeCreatedAt }) {
  const { user } = useAuth();

  // Determine initial mode: if own card with no review yet → 'add', otherwise 'view'
  const [mode, setMode]             = useState(!review && isOwn ? 'add' : 'view');
  const [editText, setEditText]     = useState(review?.text || '');
  const [editRating, setEditRating] = useState(review?.rating || 5);
  const [composePhotos, setComposePhotos] = useState([]); // local files, not yet uploaded
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [lightbox, setLightbox]     = useState(null);

  const cardUser = review
    ? { username: review.username, avatar: review.avatar, id: review.user_id }
    : photos[0]
      ? { username: photos[0].username, avatar: photos[0].avatar, id: photos[0].user_id }
      : { username: user?.username, avatar: user?.avatar, id: user?.id };

  const handleAdd = async () => {
    setSaving(true);
    try {
      await api.post('/reviews', { place_id: placeId, rating: editRating, text: editText });
      // upload photos together with the review submission
      if (composePhotos.length) {
        const fd = new FormData();
        composePhotos.forEach((f) => fd.append('photos', f));
        await api.post(`/places/${placeId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setMode('view');
      await onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Не удалось добавить отзыв');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/reviews/${review.id}`, { rating: editRating, text: editText });
      setMode('view');
      await onRefresh();
    } catch {
      alert('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить ваш отзыв?')) return;
    setDeleting(true);
    try {
      await api.delete(`/reviews/${review.id}`);
      await onRefresh();
    } catch {
      alert('Не удалось удалить отзыв');
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = () => {
    setEditText(review?.text || '');
    setEditRating(review?.rating || 5);
    setMode('edit');
  };

  return (
    <div className={`contribution-card${isOwn ? ' own' : ''}`}>
      {/* Header: avatar + name + (own add/edit: stars) + (own view: actions) */}
      <div className="cc-header">
        <button className="cc-user" onClick={() => onUserClick(cardUser.id)}>
          <Avatar user={cardUser} size="sm" />
          <span className="cc-username">{cardUser.username}</span>
        </button>
        {isOwn && (mode === 'add' || mode === 'edit') && (
          <StarRating value={editRating} onChange={setEditRating} size="sm" />
        )}
        {isOwn && mode === 'view' && review && (
          <div className="cc-actions">
            <button className="btn-icon-sm" onClick={startEdit} title="Редактировать">✏️</button>
            <button className="btn-icon-sm" onClick={handleDelete} disabled={deleting} title="Удалить">🗑️</button>
          </div>
        )}
      </div>

      {/* Stars + date below header */}
      {mode === 'view' && (review || isOwn) && (
        <div className="cc-meta">
          {review && <StarRating value={review.rating} readonly size="sm" />}
          <span className="cc-date">
            {review
              ? new Date(review.created_at).toLocaleDateString('ru-RU')
              : placeCreatedAt
                ? new Date(placeCreatedAt).toLocaleDateString('ru-RU')
                : ''}
          </span>
        </div>
      )}

      {/* ── OWN CARD: photos only, no text ── */}
      {isOwn && (
        <>
          {mode === 'add' && (
            <div className="contribution-compose">
              {photos.length > 0 && (
                <div className="photos-grid" style={{ marginTop: 8 }}>
                  {photos.map((ph) => (
                    <img key={ph.id} src={`${UPLOADS_URL}/places/${ph.filename}`} alt=""
                      className="photo-thumb" onClick={() => setLightbox(ph.filename)} />
                  ))}
                </div>
              )}
              {composePhotos.length > 0 && (
                <div className="compose-photos-preview">
                  {composePhotos.map((f, i) => (
                    <div key={i} className="compose-photo-remove">
                      <img src={URL.createObjectURL(f)} alt="" className="compose-photo-thumb" />
                      <button onClick={() => setComposePhotos((p) => p.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving}>
                  {saving ? 'Отправка...' : 'Отправить'}
                </button>
                {composePhotos.length + photos.length < 5 && (
                  <label className="btn btn-outline btn-sm upload-btn">
                    + Фото {composePhotos.length + photos.length > 0 ? `(${composePhotos.length + photos.length}/5)` : ''}
                    <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => {
                        const remaining = 5 - composePhotos.length - photos.length;
                        setComposePhotos((p) => [...p, ...Array.from(e.target.files).slice(0, remaining)]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {mode === 'edit' && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setMode('view')}>Отмена</button>
            </div>
          )}

          {mode === 'view' && (
            <>
              {photos.length > 0 && (
                <div className="photos-grid" style={{ marginTop: 8 }}>
                  {photos.map((ph) => (
                    <img key={ph.id} src={`${UPLOADS_URL}/places/${ph.filename}`} alt=""
                      className="photo-thumb" onClick={() => setLightbox(ph.filename)} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── OTHER PEOPLE: photos first, then text below ── */}
      {!isOwn && mode === 'view' && (
        <>
          {photos.length > 0 && (
            <div className="photos-grid" style={{ marginTop: 8 }}>
              {photos.map((ph) => (
                <img key={ph.id} src={`${UPLOADS_URL}/places/${ph.filename}`} alt=""
                  className="photo-thumb" onClick={() => setLightbox(ph.filename)} />
              ))}
            </div>
          )}
          {review?.text && (
            <p className="review-text" style={{ marginTop: photos.length ? 6 : 0 }}>{review.text}</p>
          )}
        </>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={`${UPLOADS_URL}/places/${lightbox}`} alt="" />
        </div>
      )}
    </div>
  );
}

// Inline edit form for place info (owner)
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
  const [place, setPlace]       = useState(initialPlace);
  const [liked, setLiked]       = useState(!!place.user_liked);
  const [likesCount, setLikesCount] = useState(place.likes_count || 0);
  const [featured, setFeatured] = useState(!!place.is_featured);
  const [editing, setEditing]   = useState(false);

  const isOwner = user && place.user_id === user.id;
  const avgRating = place.review_count > 0 ? Number(place.avg_rating).toFixed(1) : null;

  // Group photos by user_id
  const photosByUser = {};
  (place.photos || []).forEach((ph) => {
    if (!photosByUser[ph.user_id]) photosByUser[ph.user_id] = [];
    photosByUser[ph.user_id].push(ph);
  });

  // Build contributor list: union of reviewers + photo uploaders + current user (always shown)
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
  // Own card always first
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
      {/* Featured banner */}
      {featured && (
        <div className="featured-banner">
          <span className="featured-banner-icon">✦</span>
          <span>Моё особое место</span>
          <span className="featured-banner-icon">✦</span>
        </div>
      )}

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
              {liked ? '❤️' : '🤍'}{likesCount > 0 ? ` ${likesCount}` : ''}
            </button>
          )}
          {isOwner && <button className="btn btn-danger btn-sm" onClick={handleDeletePlace}>Удалить</button>}
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Meta: rating only, no author row */}
      {avgRating && (
        <div className="panel-meta">
          <div className="rating-chip">★ {avgRating}<span className="rating-count">({place.review_count})</span></div>
        </div>
      )}

      <div className="panel-body">

        {/* ── PLACE INFO ── */}
        <div className="panel-section">
          <div className="panel-section-header">
            <span className="panel-section-title">О месте</span>
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

        <div className="panel-divider" />

        {/* ── CONTRIBUTIONS ── */}
        <div className="panel-section">
          {/* Featured toggle (owner only) */}
          {isOwner && (
            <div className="panel-section-header">
              <button
                className={`feature-toggle-btn feature-toggle-inline${featured ? ' active' : ''}`}
                onClick={handleFeatureToggle}
              >
                <span>✦</span> Особое
              </button>
            </div>
          )}

          {!user && (
            <div className="alert-info">Войдите, чтобы оставить отзыв</div>
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
              placeCreatedAt={place.created_at}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
