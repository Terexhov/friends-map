import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import Supercluster from 'supercluster';
import { UPLOADS_URL } from '../api';

const STYLE_URL = 'https://api.protomaps.com/styles/v5/light/en.json?key=b393d0b2be907b6d';

const CATEGORY_COLORS = {
  cafe:        '#f59e0b',
  coffee:      '#d97706',
  fastfood:    '#ef4444',
  restaurant:  '#ef4444',
  bar:         '#8b5cf6',
  other:       '#6b7280',
};

function getColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
}

export default function MapView({ places, selectedPlace, onPlaceClick, onMapClick }) {
  const mapRef = useRef(null);
  const [popup, setPopup] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: 37.6173,
    latitude: 55.7558,
    zoom: 11,
  });

  // Build supercluster index
  const supercluster = useMemo(() => {
    const sc = new Supercluster({ radius: 60, maxZoom: 16 });
    sc.load(
      places.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { ...p },
      }))
    );
    return sc;
  }, [places]);

  // Compute clusters for current viewport
  const clusters = useMemo(() => {
    if (!supercluster) return [];
    const zoom = Math.floor(viewState.zoom);
    return supercluster.getClusters([-180, -85, 180, 85], zoom);
  }, [supercluster, viewState.zoom]);

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

  const handleClusterClick = useCallback(
    (e, clusterId, lng, lat) => {
      e.originalEvent.stopPropagation();
      const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(clusterId), 20);
      mapRef.current?.flyTo({ center: [lng, lat], zoom: expansionZoom, duration: 500 });
    },
    [supercluster]
  );

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(e) => setViewState(e.viewState)}
      style={{ flex: 1, height: '100%' }}
      mapStyle={STYLE_URL}
      onClick={handleMapClick}
    >
      <NavigationControl position="top-right" visualizePitch />
      <ScaleControl position="bottom-left" />

      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const { cluster, cluster_id, point_count } = feature.properties;

        if (cluster) {
          return (
            <Marker key={`cluster-${cluster_id}`} longitude={lng} latitude={lat} anchor="center">
              <div
                className="map-cluster"
                style={{ '--cluster-size': Math.min(28 + point_count * 2, 56) + 'px' }}
                onClick={(e) => handleClusterClick(e, cluster_id, lng, lat)}
              >
                {point_count}
              </div>
            </Marker>
          );
        }

        const place = feature.properties;
        const isSelected = selectedPlace === place.id;
        const color = getColor(place.category);

        return (
          <Marker
            key={place.id}
            longitude={lng}
            latitude={lat}
            anchor="bottom"
            onClick={(e) => handleMarkerClick(e, place)}
          >
            <div
              className={`map-pin${isSelected ? ' selected' : ''}`}
              style={{ '--pin-color': color }}
              title={place.name}
            >
              {place.avatar ? (
                <img
                  src={`${UPLOADS_URL}/avatars/${place.avatar}`}
                  alt={place.username}
                  className="pin-avatar"
                />
              ) : (
                <span className="pin-initial">{place.username?.[0]?.toUpperCase()}</span>
              )}
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
        >
          <div style={{ minWidth: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <strong>{popup.name}</strong>
              {popup.is_featured ? <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>✦</span> : null}
            </div>
            {popup.review_count > 0 && (
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                ★ {Number(popup.avg_rating).toFixed(1)}{' '}
                <span style={{ color: '#94a3b8' }}>({popup.review_count} отзывов)</span>
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{popup.username}</div>
          </div>
        </Popup>
      )}
    </Map>
  );
}
