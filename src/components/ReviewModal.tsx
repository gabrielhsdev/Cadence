import React, { useState } from 'react';
import { QueueItemWithProblem } from '../types';
import { RATINGS } from '../ratings';

interface Props {
  item: QueueItemWithProblem;
  onSave: (rating: number, notes: string) => void;
  onClose: () => void;
}

export default function ReviewModal({ item, onSave, onClose }: Props): React.ReactElement {
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  function handleSave(): void {
    if (rating === null) return;
    onSave(rating, notes);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{item.problem.title}</div>
        <div className="modal-subtitle">
          {item.problem.topic} · {item.problem.difficulty}
        </div>

        <span className="modal-label">How did it go?</span>
        <div className="rating-row">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              className={`rating-btn${rating === r.value ? ' selected' : ''}`}
              onClick={() => setRating(r.value)}
            >
              {r.value}
            </button>
          ))}
        </div>
        <div className="rating-descriptions">
          {RATINGS.map((r) => (
            <span key={r.value} className="rating-desc">{r.description}</span>
          ))}
        </div>

        <span className="modal-label">Notes (optional)</span>
        <textarea
          className="notes-input"
          placeholder="Key insight, edge case, approach..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={rating === null}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
