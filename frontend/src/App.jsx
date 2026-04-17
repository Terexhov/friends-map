import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MapView from './components/MapView';
import Navbar from './components/Navbar';
import PlacePanel from './components/PlacePanel';
import AddPlaceModal from './components/AddPlaceModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import DraftsModal from './components/DraftsModal';
import SearchFilterBar from './components/SearchFilterBar';
import api from './api';

const EMPTY_FILTERS = { search: '', category: '', cuisine: '', rating: 0, userId: null };

function AppContent() {
  const { user } = useAuth();
  const [places, setPlaces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [addCoords, setAddCoords] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [activeDraft, setActiveDraft] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const loadPlaces = useCallback(async () => {
    try {
      const res = await api.get('/places');
      setPlaces(res.data);
    } catch (err) {
      console.error('Failed to load places', err);
    }
  }, []);

  useEffect(() => { loadPlaces(); }, [loadPlaces]);

  const openPlace = useCallback(async (id) => {
    setSelectedId(id);
    setSelectedData(null);
    try {
      const res = await api.get(`/places/${id}`);
      setSelectedData(res.data);
    } catch {}
  }, []);

  // Auto-open place from ?place=ID share URL
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('place');
    if (id) {
      openPlace(Number(id));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [openPlace]);

  const filteredPlaces = useMemo(() => {
    const { search, category, cuisine, rating, userId } = filters;
    return places.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category && p.category !== category) return false;
      if (cuisine && p.cuisine !== cuisine) return false;
      if (rating && (!p.avg_rating || p.avg_rating < rating)) return false;
      if (userId && p.user_id !== userId) return false;
      return true;
    });
  }, [places, filters]);

  const refreshPlace = useCallback(async () => {
    if (!selectedId) return;
    try {
      const res = await api.get(`/places/${selectedId}`);
      setSelectedData(res.data);
    } catch {}
  }, [selectedId]);

  const handleMapClick = (lat, lng) => {
    if (!user) { setAuthModal('login'); return; }
    setActiveDraft(null);
    setAddCoords({ lat, lng });
  };

  const handlePlaceAdded = (newPlace) => {
    setPlaces((prev) => [newPlace, ...prev]);
    setAddCoords(null);
    setActiveDraft(null);
    openPlace(newPlace.id);
  };

  const handlePlaceDeleted = (id) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));
    setSelectedId(null);
    setSelectedData(null);
  };

  const handleResumeDraft = (draft) => {
    setActiveDraft(draft);
    setAddCoords(draft.coords);
  };

  return (
    <div className="app">
      <Navbar
        onAuthClick={setAuthModal}
        onProfileClick={setProfileUserId}
        onDraftsClick={() => setShowDrafts(true)}
      />

      <div className="main-content">
        <MapView
          places={filteredPlaces}
          selectedPlace={selectedId}
          onPlaceClick={openPlace}
          onMapClick={handleMapClick}
        />
        <div className="map-hint-chip">
          {user ? '📍 Нажмите на карту, чтобы добавить место' : '👋 Войдите, чтобы добавлять места и отзывы'}
        </div>

        <SearchFilterBar
          places={places}
          filters={filters}
          onFiltersChange={setFilters}
          hasPanel={!!selectedData}
        />

        {selectedData && (
          <PlacePanel
            key={selectedData.id}
            place={selectedData}
            onClose={() => { setSelectedId(null); setSelectedData(null); }}
            onDelete={handlePlaceDeleted}
            onRefresh={refreshPlace}
            onUserClick={setProfileUserId}
          />
        )}
      </div>

      {addCoords && (
        <AddPlaceModal
          coords={addCoords}
          draft={activeDraft}
          onClose={() => { setAddCoords(null); setActiveDraft(null); }}
          onAdded={handlePlaceAdded}
        />
      )}

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={setAuthModal}
        />
      )}

      {profileUserId && (
        <ProfileModal
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
          onPlaceClick={(id) => { setProfileUserId(null); openPlace(id); }}
        />
      )}

      {showDrafts && (
        <DraftsModal
          onClose={() => setShowDrafts(false)}
          onResume={handleResumeDraft}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
