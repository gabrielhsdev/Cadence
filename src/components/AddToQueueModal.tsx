import React, { useEffect, useRef, useState } from 'react';
import { Problem } from '../types';
import { api } from '../renderer/api';

interface Props {
  onAdd: (problem: Problem) => void;
  onClose: () => void;
}

export default function AddToQueueModal({ onAdd, onClose }: Props): React.ReactElement {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Problem[]>([]);
  const [adding, setAdding] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    api.problems.search(q).then(setResults);
  }, [query]);

  async function handleAdd(problem: Problem): Promise<void> {
    setAdding(problem.id);
    const result = await api.queue.addProblem(problem.id);
    if (result.ok && result.item) {
      onAdd(problem);
      onClose();
    } else if (result.reason === 'already_in_queue') {
      setNotice('Already in today\'s queue or reviewed today.');
      setAdding(null);
    } else {
      setNotice('Could not add problem.');
      setAdding(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Add to Today's Queue</div>
        <div className="modal-subtitle">Search for any problem in your library.</div>

        <input
          ref={inputRef}
          className="notes-input"
          style={{ minHeight: 'unset', height: 36, marginBottom: 12, resize: 'none' }}
          placeholder="Search by title or topic…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setNotice(''); }}
        />

        {notice && (
          <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 10 }}>{notice}</div>
        )}

        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {results.length === 0 && query.trim() !== '' && (
            <div className="search-hint" style={{ color: 'var(--text-muted)' }}>
              No problems found.
            </div>
          )}
          {results.length === 0 && query.trim() === '' && (
            <div className="search-hint" style={{ color: 'var(--text-dim)' }}>
              Start typing to search…
            </div>
          )}
          {results.map((p) => (
            <div key={p.id} className="search-result">
              <div style={{ minWidth: 0 }}>
                <div className="search-result-title">
                  {p.title}
                </div>
                <div className="search-result-meta">
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.topic}</span>
                  <span className={`difficulty-badge ${p.difficulty}`} style={{ fontSize: 11 }}>{p.difficulty}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.list_name}</span>
                </div>
              </div>
              <button
                className="btn btn-sm btn-primary"
                style={{ flexShrink: 0 }}
                onClick={() => handleAdd(p)}
                disabled={adding === p.id}
              >
                {adding === p.id ? '…' : '+ Add'}
              </button>
            </div>
          ))}
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
