import React, { useState } from 'react';
import { QueueItemWithProblem } from '../types';

interface Props {
  item: QueueItemWithProblem;
  onSave: (rating: number, notes: string) => void;
  onClose: () => void;
}

const RATINGS = [1, 2, 3, 4, 5] as const;
const RATING_LABELS = ['Could not solve', 'Barely recalled', 'Solved with difficulty', 'Solved comfortably', 'Solved immediately'];

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
              key={r}
              className={`rating-btn${rating === r ? ' selected' : ''}`}
              onClick={() => setRating(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="rating-descriptions">
          {RATING_LABELS.map((label, i) => (
            <span key={i} className="rating-desc">{label}</span>
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
