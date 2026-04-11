import { useAuth } from '../contexts/AuthContext';
import { UPLOADS_URL } from '../api';
import { getDrafts } from '../drafts';

export default function Navbar({ onAuthClick, onProfileClick, onDraftsClick }) {
  const { user, logout } = useAuth();
  const draftsCount = user ? getDrafts().length : 0;

  return (
    <nav className="navbar">
      <div className="navbar-brand">🗺️ FriendMap</div>

      <div className="navbar-hint">
        {user
          ? '📍 Кликните на карту, чтобы добавить отзыв'
          : '👋 Войдите, чтобы делиться местами'}
      </div>

      <div className="navbar-actions">
        {user ? (
          <>
            {draftsCount > 0 && (
              <button className="btn btn-outline btn-sm drafts-btn" onClick={onDraftsClick}>
                ✏️ <span className="drafts-count">{draftsCount}</span>
              </button>
            )}
            <button className="user-btn" onClick={() => onProfileClick(user.id)}>
              {user.avatar ? (
                <img
                  src={`${UPLOADS_URL}/avatars/${user.avatar}`}
                  alt={user.username}
                  className="avatar avatar-sm"
                />
              ) : (
                <div className="avatar avatar-sm avatar-placeholder">
                  {user.username[0].toUpperCase()}
                </div>
              )}
              <span className="user-btn-name">{user.username}</span>
            </button>
            <button className="btn btn-outline btn-sm" onClick={logout}>
              Выйти
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => onAuthClick('login')}>
              Войти
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => onAuthClick('register')}>
              Регистрация
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
