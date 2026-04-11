import { useState } from 'react';
import api from '../api';

const CATEGORIES = [
  { value: 'restaurant', label: '🍽️ Ресторан' },
  { value: 'cafe',        label: '☕ Кафе' },
  { value: 'bar',         label: '🍺 Бар' },
  { value: 'park',        label: '🌳 Парк' },
  { value: 'museum',      label: '🏛️ Музей' },
  { value: 'shop',        label: '🛍️ Магазин' },
  { value: 'entertainment', label: '🎭 Развлечения' },
  { value: 'other',       label: '📍 Другое' },
];

export default function AddPlaceModal({ coords, onClose, onAdded }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Введите название'); return; }

    setLoading(true);
    setError('');
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('description', description);
    fd.append('category', category);
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

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Добавить место</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="coords-badge">
            📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
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

          <div className="form-group">
            <label className="form-label">Категория</label>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Описание</label>
            <textarea
              className="form-input"
              placeholder="Расскажите об этом месте..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
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
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                Выбрано: {photos.length} фото
              </p>
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
