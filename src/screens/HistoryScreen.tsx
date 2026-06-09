import React, { useCallback, useEffect, useState } from 'react';
import { ReviewHistoryEntry } from '../types';
import { api } from '../renderer/api';
import { parseIsoLocal } from '../dateUtils';
import { ratingLabel, ratingColor } from '../ratings';
import ConfirmModal from '../components/ConfirmModal';

function formatDate(iso: string): string {
  return parseIsoLocal(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HistoryScreen(): React.ReactElement {
  const [entries, setEntries] = useState<ReviewHistoryEntry[]>([]);
  const [filtered, setFiltered] = useState<ReviewHistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const data = await api.history.getAll();
    setEntries(data);
    setFiltered(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(entries);
    } else {
      setFiltered(
        entries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.topic.toLowerCase().includes(q)
        )
      );
    }
  }, [search, entries]);

  function showNotice(text: string, ok: boolean): void {
    setNotice({ text, ok });
    setTimeout(() => setNotice(null), 4000);
  }

  async function handleExport(): Promise<void> {
    const result = await api.history.export();
    if (!result.ok) {
      if (result.reason !== 'canceled') showNotice(`Export failed: ${result.reason}`, false);
      return;
    }
    showNotice(`Exported ${result.count} review${result.count !== 1 ? 's' : ''} to CSV`, true);
  }

  async function handleImport(): Promise<void> {
    const result = await api.history.import();
    if (!result.ok) {
      if (result.reason !== 'canceled') showNotice(`Import failed: ${result.reason}`, false);
      return;
    }
    showNotice(
      `Imported ${result.imported} review${result.imported !== 1 ? 's' : ''}${result.skipped ? ` · ${result.skipped} skipped (duplicates)` : ''}`,
      true
    );
    // Reload list
    const data = await api.history.getAll();
    setEntries(data);
  }

  async function handleReset(): Promise<void> {
    setResetting(true);
    await api.history.reset();
    setEntries([]);
    setFiltered([]);
    setConfirmReset(false);
    setResetting(false);
  }

  if (loading) return <div className="spinner">Loading history…</div>;

  return (
    <>
      {notice && (
        <div className={`toast ${notice.ok ? 'toast-ok' : 'toast-err'}`}>
          {notice.text}
        </div>
      )}

      <div className="queue-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="screen-title">Review History</div>
          <div className="queue-date">
            {entries.length} review{entries.length !== 1 ? 's' : ''} total
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={handleImport}>Import CSV</button>
          <button className="btn" onClick={handleExport} disabled={entries.length === 0}>Export CSV</button>
          <button
            className="btn"
            style={{ color: 'var(--hard)', borderColor: 'var(--hard)' }}
            onClick={() => setConfirmReset(true)}
          >
            Reset Progress
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <input
          className="notes-input input-line"
          style={{ marginBottom: 16 }}
          placeholder="Search by problem or topic…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{entries.length === 0 ? 'No reviews yet' : 'No matches'}</h3>
          <p>
            {entries.length === 0
              ? 'Complete problems from your daily queue and they will appear here.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Problem</th>
              <th>Topic</th>
              <th>Difficulty</th>
              <th>Rating</th>
              <th>Reviewed</th>
              <th>Next due</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.review_id}>
                <td>
                  <button
                    className="link-btn"
                    onClick={() => api.shell.openUrl(e.leetcode_url)}
                    title={e.leetcode_url}
                  >
                    {e.title}
                  </button>
                </td>
                <td className="cell-muted">{e.topic}</td>
                <td>
                  <span className={`difficulty-badge ${e.difficulty}`}>{e.difficulty}</span>
                </td>
                <td>
                  <span
                    className="rating-pill"
                    style={{ color: ratingColor(e.rating) }}
                  >
                    {e.rating} — {ratingLabel(e.rating)}
                  </span>
                </td>
                <td className="cell-muted">{formatDate(e.reviewed_at)}</td>
                <td className="cell-muted">{formatDate(e.next_review_at)}</td>
                <td className="cell-notes">{e.notes || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmReset && (
        <ConfirmModal
          title="Reset all progress?"
          confirmLabel={resetting ? 'Resetting…' : 'Yes, reset everything'}
          confirmDisabled={resetting}
          confirmClassName="btn"
          confirmStyle={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' }}
          onConfirm={handleReset}
          onClose={() => setConfirmReset(false)}
        >
          This permanently deletes all reviews, today's queue, and scheduling history.
          Your problem list and settings are kept.
          <br />
          <strong style={{ color: 'var(--text)' }}>This cannot be undone.</strong>
        </ConfirmModal>
      )}
    </>
  );
}
