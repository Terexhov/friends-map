import { useState, useEffect, useRef, useCallback } from 'react';

function formatDisplay(r) {
  const a = r.address || {};
  const road = a.road || a.pedestrian || a.path || a.footway || a.cycleway || '';
  const house = a.house_number ? `, ${a.house_number}` : '';
  const city = a.city || a.town || a.village || a.municipality || a.county || '';
  if (road) return `${road}${house}${city ? ', ' + city : ''}`;
  // fallback to first 3 parts of display_name
  return r.display_name.split(', ').slice(0, 3).join(', ');
}

function classifyResult(r) {
  const gt = r.geojson?.type;
  const isStreet = (gt === 'LineString' || gt === 'MultiLineString') && r.class === 'highway';
  return isStreet;
}

export default function AddressSearch({ onSelect, onClear }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const containerRef   = useRef(null);
  const timerRef       = useRef(null);
  const activeQueryRef = useRef(''); // guards against stale fetch results

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const search = useCallback(async (q) => {
    setLoading(true);
    setOpen(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(q)}&format=json&addressdetails=1` +
        `&limit=8&polygon_geojson=1&accept-language=ru`;
      const res  = await fetch(url);
      const data = await res.json();
      if (activeQueryRef.current !== q) return; // query changed while fetching
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      if (activeQueryRef.current === q) setResults([]);
    } finally {
      if (activeQueryRef.current === q) setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    activeQueryRef.current = q;
    clearTimeout(timerRef.current);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => search(q), 400);
  };

  const handleSelect = (r) => {
    const label    = formatDisplay(r);
    const isStreet = classifyResult(r);
    setQuery(label);
    setOpen(false);
    onSelect({
      lat:      parseFloat(r.lat),
      lng:      parseFloat(r.lon),
      geojson:  isStreet ? r.geojson : null,
      isStreet,
    });
  };

  const handleClear = () => {
    activeQueryRef.current = '';
    setQuery('');
    setResults([]);
    setOpen(false);
    onClear();
  };

  return (
    <div className="addr-search" ref={containerRef}>
      <div className="addr-search-row">
        <span className="addr-search-icon">🔍</span>
        <input
          className="addr-search-input"
          type="text"
          placeholder="Поиск адреса..."
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {query && (
          <button className="addr-search-clear" onClick={handleClear} title="Очистить">✕</button>
        )}
      </div>

      {open && (
        <ul className="addr-search-results">
          {loading && <li className="addr-search-hint">Поиск…</li>}
          {!loading && results.length === 0 && (
            <li className="addr-search-hint">Ничего не найдено</li>
          )}
          {!loading && results.map((r, i) => {
            const isStreet = classifyResult(r);
            return (
              <li key={i} className="addr-search-item" onClick={() => handleSelect(r)}>
                <span className="addr-search-item-icon">{isStreet ? '🛣️' : '📍'}</span>
                <span className="addr-search-item-label">{formatDisplay(r)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
