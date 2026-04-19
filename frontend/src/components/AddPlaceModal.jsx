import { useState, useEffect } from 'react';
import api from '../api';
import { saveDraft, removeDraft } from '../drafts';

const CATEGORIES = [
  { value: 'cafe',        label: '☕ Кафе' },
  { value: 'coffee',      label: '☕ Кофейня' },
  { value: 'fastfood',    label: '🍔 Фастфуд' },
  { value: 'restaurant',  label: '🍽️ Ресторан' },
  { value: 'bar',         label: '🍺 Бар' },
  { value: 'bistro',      label: '🍽 Столовая' },
  { value: 'other',       label: '📍 Другое' },
];

const CUISINES = [
  { value: '', label: '— не указана —' },
  { value: 'russian',     label: '🇷🇺 Русская' },
  { value: 'european',    label: '🇪🇺 Европейская' },
  { value: 'asian',       label: '🍜 Паназиатская' },
  { value: 'japanese',    label: '🍣 Японская' },
  { value: 'korean',      label: '🥘 Корейская' },
  { value: 'chinese',     label: '🥢 Китайская' },
  { value: 'italian',     label: '🍕 Итальянская' },
  { value: 'georgian',    label: '🫕 Грузинская' },
  { value: 'american',    label: '🍔 Американская' },
  { value: 'middle_east',   label: '🧆 Ближневосточная' },
  { value: 'central_asian', label: '🥘 Среднеазиатская' },
  { value: 'indian',        label: '🍛 Индийская' },
  { value: 'other',         label: '🌍 Другая' },
];

const PRICE_LEVELS = [
  { value: 0, label: '— не указана —' },
  { value: 1, label: '₽ Дёшево' },
  { value: 2, label: '₽₽ Средне' },
  { value: 3, label: '₽₽₽ Дорого' },
  { value: 4, label: '₽₽₽₽ Очень дорого' },
];

async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`,
      { headers: { 'Accept-Language': 'ru' } }
    );
    const data = await r.json();
    const a = data.address || {};
    const parts = [a.road, a.house_number, a.city || a.town || a.village].filter(Boolean);
    return parts.length ? parts.join(', ') : data.display_name?.split(',').slice(0, 2).join(',').trim() || '';
  } catch {
    return '';
  }
}

export default function AddPlaceModal({ coords, draft, onClose, onAdded }) {
  const [name, setName]               = useState(draft?.name || '');
  const [description, setDescription] = useState(draft?.description || '');
  const [category, setCategory]       = useState(draft?.category || 'other');
  const [cuisine, setCuisine]         = useState(draft?.cuisine || '');
  const [priceLevel, setPriceLevel]   = useState(draft?.priceLevel || 0);
  const [website, setWebsite]         = useState(draft?.website || '');
  const [hashtags, setHashtags]       = useState(draft?.hashtags || '');
  const [address, setAddress]         = useState(draft?.address || '');
  const [ownRating, setOwnRating]     = useState(draft?.ownRating || 0);
  const [geocoding, setGeocoding]     = useState(!draft?.address);
  const [photos, setPhotos]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (draft?.address) return;
    setGeocoding(true);
    reverseGeocode(coords.lat, coords.lng).then((addr) => {
      setAddress(addr);
      setGeocoding(false);
    });
  }, []);

  const currentDraft = () => ({
    id: draft?.id || Date.now(),
    coords,
    name, description, category, cuisine,
    priceLevel, website, hashtags, address, ownRating,
    savedAt: new Date().toISOString(),
  });

  const handleClose = () => {
    // save draft only if there's something worth keeping
    if (name.trim() || description.trim() || website.trim() || hashtags.trim() || ownRating > 0) {
      saveDraft(currentDraft());
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Введите название'); return; }

    setLoading(true);
    setError('');
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('description', description);
    fd.append('category', category);
    fd.append('cuisine', cuisine);
    fd.append('price_level', priceLevel);
    fd.append('website', website.trim());
    fd.append('hashtags', hashtags.trim());
    fd.append('address', address.trim());
    fd.append('own_rating', ownRating || '');
    fd.append('lat', coords.lat);
    fd.append('lng', coords.lng);
    photos.forEach((p) => fd.append('photos', p));

    try {
      const res = await api.post('/places', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (draft?.id) removeDraft(draft.id);
      onAdded(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось добавить место');
    } finally {
      setLoading(false);
    }
  };

  const showCuisine = ['cafe', 'coffee', 'fastfood', 'restaurant', 'bar'].includes(category);

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Добавить отзыв</h3>
          <button className="btn-icon" onClick={handleClose}>✕</button>
        </div>
        <form id="add-place-form" onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div
            className="modal-body"
            onFocus={(e) => {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 320);
              }
            }}
          >
            <div className="coords-badge">
              📍 {geocoding ? 'Определяем адрес...' : (address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`)}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Название *</label>
              <input
                className="form-input"
                placeholder="Название места"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
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
                <select className="form-input" value={priceLevel} onChange={(e) => setPriceLevel(Number(e.target.value))}>
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
                  <button
                    key={n}
                    type="button"
                    className={`rating-10-btn${ownRating === n ? ' active' : ''}${n <= 5 ? ' low' : n <= 7 ? ' mid' : ' high'}`}
                    onClick={() => setOwnRating(ownRating === n ? 0 : n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Адрес</label>
              <input
                className="form-input"
                placeholder="Улица, дом"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Описание</label>
              <textarea
                className="form-input"
                placeholder="Расскажите об этом месте..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Сайт</label>
                <input className="form-input" placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Хэштеги</label>
                <input className="form-input" placeholder="#уютно #кофе" value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Фотографии</label>
              <input type="file" multiple accept="image/*" className="form-input"
                onChange={(e) => setPhotos(Array.from(e.target.files))} />
              {photos.length > 0 && <p className="text-sm text-muted" style={{ marginTop: 4 }}>Выбрано: {photos.length} фото</p>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={handleClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохраняем...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
