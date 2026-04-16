import { useState } from 'react';
import { getDrafts, removeDraft } from '../drafts';

const CATEGORY_LABELS = {
  cafe: '☕ Кафе', coffee: '☕ Кофейня', fastfood: '🍔 Фастфуд',
  restaurant: '🍽️ Ресторан', bar: '🍺 Бар', bistro: '🍽 Столовая', other: '📍 Другое',
};

export default function DraftsModal({ onClose, onResume }) {
  const [drafts, setDrafts] = useState(getDrafts);

  const handleDelete = (id) => {
    removeDraft(id);
    setDrafts(getDrafts());
  };

  return (
    <div className="overlay">
      <div className="modal modal-sm">
        <div className="modal-header">
          <h3>Черновики</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {drafts.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
              Нет сохранённых черновиков
            </p>
          ) : (
            <div className="draft-list">
              {drafts.map((d) => (
                <div key={d.id} className="draft-item">
                  <div className="draft-info">
                    <span className="draft-name">{d.name || 'Без названия'}</span>
                    <span className="draft-meta">
                      {CATEGORY_LABELS[d.category] || d.category}
                      {d.address ? ` · ${d.address}` : ''}
                    </span>
                    <span className="draft-date">
                      {new Date(d.savedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="draft-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => { onResume(d); onClose(); }}>
                      Открыть
                    </button>
                    <button className="btn-icon" onClick={() => handleDelete(d.id)} title="Удалить черновик">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
