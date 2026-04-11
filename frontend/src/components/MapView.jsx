import { useEffect, useRef, useState, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';

const STYLE_URL = 'https://api.protomaps.com/styles/v5/dark/en.json?key=b393d0b2be907b6d';

const CATEGORIES = {
  restaurant:    { emoji: '🍽️', color: '#ef4444' },
  cafe:          { emoji: '☕', color: '#f59e0b' },
  bar:           { emoji: '🍺', color: '#8b5cf6' },
  park:          { emoji: '🌳', color: '#10b981' },
  museum:        { emoji: '🏛️', color: '#3b82f6' },
  shop:          { emoji: '🛍️', color: '#ec4899' },
  entertainment: { emoji: '🎭', color: '#f97316' },
  other:         { emoji: '📍', color: '#6b7280' },
};

export default function MapView({ places, selectedPlace, onPlaceClick, onMapClick }) {
  const mapRef = useRef(null);
  const [popup, setPopup] = useState(null);

  // Fly to selected place
  useEffect(() => {
    if (!selectedPlace || !mapRef.current) return;
    const place = places.find((p) => p.id === selectedPlace);
    if (!place) return;
    mapRef.current.flyTo({
      center: [place.lng, place.lat],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: 800,
    });
  }, [selectedPlace]);

  // Close popup when a different place is selected (or deselected)
  useEffect(() => {
    if (popup && popup.id !== selectedPlace) setPopup(null);
  }, [selectedPlace]);

  const handleMapClick = useCallback(
    (e) => {
      const { lng, lat } = e.lngLat;
      onMapClick(lat, lng);
    },
    [onMapClick]
  );

  const handleMarkerClick = useCallback(
    (e, place) => {
      e.originalEvent.stopPropagation();
      onPlaceClick(place.id);
      setPopup(place);
    },
    [onPlaceClick]
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 37.6173, latitude: 55.7558, zoom: 11 }}
      style={{ flex: 1, height: '100%' }}
      mapStyle={STYLE_URL}
      onClick={handleMapClick}
    >
      <NavigationControl position="top-right" visualizePitch />
      <ScaleControl position="bottom-left" />

      {places.map((place) => {
        const cfg = CATEGORIES[place.category] || CATEGORIES.other;
        const isSelected = selectedPlace === place.id;
        const size = isSelected ? 52 : 42;
        return (
          <Marker
            key={place.id}
            longitude={place.lng}
            latitude={place.lat}
            anchor="bottom"
            onClick={(e) => handleMarkerClick(e, place)}
          >
            <div
              className={`map-pin${isSelected ? ' selected' : ''}`}
              style={{ background: cfg.color, width: size, height: size }}
              title={place.name}
            >
              <span>{cfg.emoji}</span>
            </div>
          </Marker>
        );
      })}

      {popup && popup.id === selectedPlace && (
        <Popup
          longitude={popup.lng}
          latitude={popup.lat}
          anchor="top"
          offset={[0, 8]}
          closeButton
          closeOnClick={false}
          onClose={() => setPopup(null)}
          className="map-popup"
        >
          <div style={{ minWidth: 140 }}>
            <strong style={{ display: 'block', marginBottom: 2 }}>{popup.name}</strong>
            {popup.review_count > 0 && (
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                ★ {Number(popup.avg_rating).toFixed(1)}{' '}
                <span style={{ color: '#94a3b8' }}>({popup.review_count} отзывов)</span>
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
              {popup.username}
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}
