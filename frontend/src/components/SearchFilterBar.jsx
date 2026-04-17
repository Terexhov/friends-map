import { useState, useEffect, useRef, useMemo } from 'react';
import { UPLOADS_URL } from '../api';

const CATEGORY_LABELS = {
  cafe: '☕ Кафе', coffee: '☕ Кофейня', fastfood: '🍔 Фастфуд',
  restaurant: '🍽️ Ресторан', bar: '🍺 Бар', bistro: '🍽 Столовая', other: '📍 Другое',
};

const CATEGORIES = [
  { value: 'cafe', label: '☕ Кафе' },
  { value: 'coffee', label: '☕ Кофейня' },
  { value: 'fastfood', label: '🍔 Фастфуд' },
  { value: 'restaurant', label: '🍽️ Ресторан' },
  { value: 'bar', label: '🍺 Бар' },
  { value: 'bistro', label: '🍽 Столовая' },
  { value: 'other', label: '📍 Другое' },
];

const CUISINE_LABELS = {
  russian: '🇷🇺 Русская', european: '🇪🇺 Европейская', asian: '🍜 Паназиатская',
  japanese: '🍣 Японская', korean: '🥘 Корейская', chinese: '🥢 Китайская',
  italian: '🍕 Итальянская', georgian: '🫕 Грузинская', american: '🍔 Американская',
  middle_east: '🧆 Ближневосточная', central_asian: '🥘 Среднеазиатская',
  indian: '🍛 Индийская', other: '🌍 Другая',
};

const CUISINES = [
  { value: 'russian', label: '🇷🇺 Русская' },
  { value: 'european', label: '🇪🇺 Европейская' },
  { value: 'asian', label: '🍜 Паназиатская' },
  { value: 'japanese', label: '🍣 Японская' },
  { value: 'korean', label: '🥘 Корейская' },
  { value: 'chinese', label: '🥢 Китайская' },
  { value: 'italian', label: '🍕 Итальянская' },
  { value: 'georgian', label: '🫕 Грузинская' },
  { value: 'american', label: '🍔 Американская' },
  { value: 'middle_east', label: '🧆 Ближневосточная' },
  { value: 'central_asian', label: '🥘 Среднеазиатская' },
  { value: 'indian', label: '🍛 Индийская' },
  { value: 'other', label: '🌍 Другая' },
];

export default function SearchFilterBar({ places, filters, onFiltersChange, hasPanel }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [friendSearch, setFriendSearch] = useState('');
  const barRef = useRef(null);

  const users = useMemo(() => {
    const map = new Map();
    places.forEach((p) => {
      if (!map.has(p.user_id))
        map.set(p.user_id, { id: p.user_id, username: p.username, avatar: p.avatar });
    });
    return Array.from(map.values()).sort((a, b) => a.username.localeCompare(b.username));
  }, [places]);

  const filteredFriends = useMemo(
    () => users.filter((u) => u.username.toLowerCase().includes(friendSearch.toLowerCase())),
    [users, friendSearch]
  );

  useEffect(() => {
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const set = (key, value) => onFiltersChange({ ...filters, [key]: value });

  const clearAll = () => {
    onFiltersChange({ search: '', category: '', cuisine: '', rating: 0, userId: null });
  };

  const toggle = (name) => setOpenDropdown((d) => (d === name ? null : name));

  const activeCount = [filters.category, filters.cuisine, filters.rating, filters.userId].filter(Boolean).length;

  const selectedUser = filters.userId ? users.find((u) => u.id === filters.userId) : null;

  return (
    <div className={`sfbar-wrap${hasPanel ? ' sfbar-wrap--hidden' : ''}`} ref={barRef}>
      <div className="sfbar">
        {/* Search input */}
        <div className="sfbar-search">
          <span className="sfbar-search-icon">🔍</span>
          <input
            className="sfbar-input"
            placeholder="Поиск по названию..."
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
          />
          {filters.search && (
            <button className="sfbar-input-clear" onClick={() => set('search', '')}>✕</button>
          )}
        </div>

        {/* Filter chips row */}
        <div className="sfbar-chips">
          {/* Category */}
          <div className="sfbar-chip-wrap">
            <button
              className={`sfbar-chip${filters.category ? ' active' : ''}`}
              onClick={() => toggle('category')}
            >
              {filters.category ? CATEGORY_LABELS[filters.category] : 'Категория'} <span className="sfbar-caret">▾</span>
            </button>
            {openDropdown === 'category' && (
              <div className="sfbar-dropdown">
                <button className="sfbar-dd-item" onClick={() => { set('category', ''); setOpenDropdown(null); }}>
                  Все категории
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    className={`sfbar-dd-item${filters.category === c.value ? ' selected' : ''}`}
                    onClick={() => { set('category', c.value); setOpenDropdown(null); }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cuisine */}
          <div className="sfbar-chip-wrap">
            <button
              className={`sfbar-chip${filters.cuisine ? ' active' : ''}`}
              onClick={() => toggle('cuisine')}
            >
              {filters.cuisine ? CUISINE_LABELS[filters.cuisine] : 'Кухня'} <span className="sfbar-caret">▾</span>
            </button>
            {openDropdown === 'cuisine' && (
              <div className="sfbar-dropdown sfbar-dropdown--scroll">
                <button className="sfbar-dd-item" onClick={() => { set('cuisine', ''); setOpenDropdown(null); }}>
                  Любая кухня
                </button>
                {CUISINES.map((c) => (
                  <button
                    key={c.value}
                    className={`sfbar-dd-item${filters.cuisine === c.value ? ' selected' : ''}`}
                    onClick={() => { set('cuisine', c.value); setOpenDropdown(null); }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="sfbar-chip-wrap">
            <button
              className={`sfbar-chip${filters.rating ? ' active' : ''}`}
              onClick={() => toggle('rating')}
            >
              {filters.rating ? `★ ${filters.rating}+` : 'Рейтинг'} <span className="sfbar-caret">▾</span>
            </button>
            {openDropdown === 'rating' && (
              <div className="sfbar-dropdown">
                <button className="sfbar-dd-item" onClick={() => { set('rating', 0); setOpenDropdown(null); }}>
                  Любой рейтинг
                </button>
                {[5, 4, 3].map((r) => (
                  <button
                    key={r}
                    className={`sfbar-dd-item${filters.rating === r ? ' selected' : ''}`}
                    onClick={() => { set('rating', r); setOpenDropdown(null); }}
                  >
                    {'★'.repeat(r)}{'☆'.repeat(5 - r)} — от {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Friend / Author */}
          <div className="sfbar-chip-wrap">
            <button
              className={`sfbar-chip${filters.userId ? ' active' : ''}`}
              onClick={() => { toggle('friend'); setFriendSearch(''); }}
            >
              {selectedUser ? selectedUser.username : 'Автор'} <span className="sfbar-caret">▾</span>
            </button>
            {openDropdown === 'friend' && (
              <div className="sfbar-dropdown sfbar-dropdown--scroll">
                <input
                  className="sfbar-friend-search"
                  placeholder="Поиск по имени..."
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  autoFocus
                />
                <button
                  className="sfbar-dd-item"
                  onClick={() => { set('userId', null); setOpenDropdown(null); setFriendSearch(''); }}
                >
                  Все авторы
                </button>
                {filteredFriends.map((u) => (
                  <button
                    key={u.id}
                    className={`sfbar-dd-item sfbar-dd-user${filters.userId === u.id ? ' selected' : ''}`}
                    onClick={() => { set('userId', u.id); setOpenDropdown(null); setFriendSearch(''); }}
                  >
                    {u.avatar
                      ? <img src={`${UPLOADS_URL}/avatars/${u.avatar}`} className="avatar avatar-xs" alt="" />
                      : <span className="sfbar-user-initial">{u.username[0].toUpperCase()}</span>
                    }
                    {u.username}
                  </button>
                ))}
                {filteredFriends.length === 0 && (
                  <div className="sfbar-dd-empty">Не найдено</div>
                )}
              </div>
            )}
          </div>

          {/* Clear all */}
          {activeCount > 0 && (
            <button className="sfbar-chip sfbar-chip--clear" onClick={clearAll}>
              ✕ Сбросить {activeCount > 1 ? `(${activeCount})` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
