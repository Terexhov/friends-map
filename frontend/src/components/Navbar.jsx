import { useAuth } from '../contexts/AuthContext';
import { UPLOADS_URL } from '../api';

export default function Navbar({ onAuthClick, onProfileClick }) {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">🗺️ FriendMap</div>

      <div className="navbar-hint">
        {user
          ? '📍 Кликните на карту, чтобы добавить место'
          : '👋 Войдите, чтобы добавлять места и отзывы'}
      </div>

      <div className="navbar-actions">
        {user ? (
          <>
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
              <span>{user.username}</span>
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
