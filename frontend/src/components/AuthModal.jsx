import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const GOOGLE_CLIENT_ID = '603994231432-bu9qli32eq7u4sn5a73fi3gd4cgbrr53.apps.googleusercontent.com';

export default function AuthModal({ mode, onClose, onSwitch }) {
  const { login, register, googleLogin } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await googleLogin(response.credential);
            onClose();
          } catch (err) {
            setError(err.response?.data?.error || 'Ошибка Google-авторизации');
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        locale: 'ru',
        width: googleBtnRef.current.offsetWidth || 320,
      });
    };

    if (window.google) {
      initGoogle();
    } else {
      const iv = setInterval(() => {
        if (window.google) { clearInterval(iv); initGoogle(); }
      }, 100);
      return () => clearInterval(iv);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.username, form.email, form.password);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <h3>{mode === 'login' ? 'Вход' : 'Регистрация'}</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Имя пользователя</label>
                <input
                  className="form-input"
                  placeholder="username"
                  value={form.username}
                  onChange={set('username')}
                  autoFocus
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                autoFocus={mode === 'login'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Пароль</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••"
                value={form.password}
                onChange={set('password')}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>

            <div className="auth-divider"><span>или</span></div>
            <div ref={googleBtnRef} className="google-btn-container" />

            <p className="auth-switch">
              {mode === 'login' ? (
                <>Нет аккаунта?{' '}
                  <button type="button" className="link-inline" onClick={() => onSwitch('register')}>
                    Зарегистрироваться
                  </button>
                </>
              ) : (
                <>Уже есть аккаунт?{' '}
                  <button type="button" className="link-inline" onClick={() => onSwitch('login')}>
                    Войти
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
