import { useState, useEffect } from 'react';
import api from '../api';

const CATEGORIES = [
  { value: 'cafe',        label: '☕ Кафе' },
  { value: 'coffee',      label: '☕ Кофейня' },
  { value: 'fastfood',    label: '🍔 Фастфуд' },
  { value: 'restaurant',  label: '🍽️ Ресторан' },
  { value: 'bar',         label: '🍺 Бар' },
  { value: 'other',       label: '📍 Другое' },
];

const CUISINES = [
  { value: '', label: '— не указана —' },
  { value: 'russian',    label: '🇷🇺 Русская' },
  { value: 'european',   label: '🇪🇺 Европейская' },
  { value: 'asian',      label: '🍜 Паназиатская' },
  { value: 'japanese',   label: '🍣 Японская' },
  { value: 'korean',     label: '🥘 Корейская' },
  { value: 'chinese',    label: '🥢 Китайская' },
  { value: 'italian',    label: '🍕 Итальянская' },
  { value: 'georgian',   label: '🫕 Грузинская' },
  { value: 'american',   label: '🍔 Американская' },
  { value: 'middle_east',label: '🧆 Ближневосточная' },
  { value: 'other',      label: '🌍 Другая' },
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
    const parts = [
      a.road,
      a.house_number,
      a.city || a.town || a.village,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : data.display_name?.split(',').slice(0, 2).join(',').trim() || '';
  } catch {
    return '';
  }
}

export default function AddPlaceModal({ coords, onClose, onAdded }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [cuisine, setCuisine] = useState('');
  const [priceLevel, setPriceLevel] = useState(0);
  const [website, setWebsite] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setGeocoding(true);
    reverseGeocode(coords.lat, coords.lng).then((addr) => {
      setAddress(addr);
      setGeocoding(false);
    });
  }, [coords]);

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
    fd.append('lat', coords.lat);
    fd.append('lng', coords.lng);
    photos.forEach((p) => fd.append('photos', p));

    try {
      const res = await api.post('/places', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onAdded(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось добавить место');
    } finally {
      setLoading(false);
    }
  };

  const showCuisine = ['cafe', 'coffee', 'fastfood', 'restaurant', 'bar'].includes(category);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Добавить место</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
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
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Цена</label>
              <select className="form-input" value={priceLevel} onChange={(e) => setPriceLevel(Number(e.target.value))}>
                {PRICE_LEVELS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {showCuisine && (
            <div className="form-group">
              <label className="form-label">Кухня</label>
              <select className="form-input" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                {CUISINES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

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
              <input
                className="form-input"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Хэштеги</label>
              <input
                className="form-input"
                placeholder="#уютно #кофе"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Фотографии</label>
            <input
              type="file"
              multiple
              accept="image/*"
              className="form-input"
              onChange={(e) => setPhotos(Array.from(e.target.files))}
            />
            {photos.length > 0 && (
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>Выбрано: {photos.length} фото</p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохраняем...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
