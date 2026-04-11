import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { UPLOADS_URL } from '../api';
import StarRating from './StarRating';

export default function ProfileModal({ userId, onClose, onPlaceClick }) {
  const { user: me, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const isOwn = me && me.id === userId;

  const load = () => {
    setLoading(true);
    api.get(`/users/${userId}`)
      .then((res) => {
        setProfile(res.data);
        setBio(res.data.user.bio || '');
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [userId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append('bio', bio);
    if (avatarFile) fd.append('avatar', avatarFile);
    try {
      const res = await api.put('/users/me', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data);
      setProfile((p) => ({ ...p, user: res.data }));
      setEditing(false);
      setAvatarFile(null);
    } catch {
      alert('Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  const inner = () => {
    if (loading) return <div className="modal-loading">Загрузка...</div>;
    if (!profile) return <div className="modal-loading">Пользователь не найден</div>;

    const { user, places, reviews } = profile;

    return (
      <>
        {/* Avatar + name */}
        <div className="profile-hero">
          {user.avatar ? (
            <img src={`${UPLOADS_URL}/avatars/${user.avatar}`} alt={user.username} className="avatar avatar-xl" />
          ) : (
            <div className="avatar avatar-xl avatar-placeholder">{user.username[0].toUpperCase()}</div>
          )}
          <div className="profile-hero-info">
            <h2>{user.username}</h2>
            {!editing && <p className="text-muted">{user.bio || 'Нет описания'}</p>}
            {isOwn && !editing && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setEditing(true)}>
                Редактировать
              </button>
            )}
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <form onSubmit={handleSave} className="profile-edit">
            <div className="form-group">
              <label className="form-label">Аватар</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                onChange={(e) => setAvatarFile(e.target.files[0])}
              />
            </div>
            <div className="form-group">
              <label className="form-label">О себе</label>
              <textarea
                className="form-input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Расскажите о себе..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat">
            <strong>{places.length}</strong>
            <span>мест</span>
          </div>
          <div className="stat">
            <strong>{reviews.length}</strong>
            <span>отзывов</span>
          </div>
        </div>

        {/* Places */}
        {places.length > 0 && (
          <div className="profile-section">
            <h4>Места</h4>
            <div className="place-list">
              {places.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  className="place-list-item"
                  onClick={() => { onClose(); onPlaceClick(p.id); }}
                >
                  <span className="place-list-name">{p.name}</span>
                  {p.review_count > 0 && (
                    <span className="text-xs text-muted">★ {Number(p.avg_rating).toFixed(1)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="profile-section">
            <h4>Последние отзывы</h4>
            {reviews.slice(0, 3).map((r) => (
              <div key={r.id} className="mini-review">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    className="link-inline"
                    style={{ fontWeight: 600, fontSize: '0.875rem' }}
                    onClick={() => { onClose(); onPlaceClick(r.place_id); }}
                  >
                    {r.place_name}
                  </button>
                  <StarRating value={r.rating} readonly size="sm" />
                </div>
                {r.text && <p className="text-sm" style={{ marginTop: 4 }}>{r.text}</p>}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>Профиль</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{inner()}</div>
      </div>
    </div>
  );
}
