import React, { useCallback, useEffect, useState } from 'react';
import { Problem } from '../types';
import { api } from '../renderer/api';
import AddProblemModal from '../components/AddProblemModal';

export default function ProblemsScreen(): React.ReactElement {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filtered, setFiltered] = useState<Problem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [lists, setLists] = useState<string[]>([]);

  const load = useCallback(async () => {
    const data = await api.problems.getAll();
    setProblems(data);
    setFiltered(data);
    // Derive unique topics + list names for datalist autocomplete
    setTopics([...new Set(data.map((p) => p.topic))].sort());
    setLists([...new Set(data.map((p) => p.list_name))].sort());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) { setFiltered(problems); return; }
    setFiltered(
      problems.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.topic.toLowerCase().includes(q) ||
          p.list_name.toLowerCase().includes(q)
      )
    );
  }, [search, problems]);

  function handleProblemAdded(created: Problem): void {
    setProblems((prev) => [...prev, created].sort((a, b) =>
      a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title)
    ));
    setTopics((prev) => [...new Set([...prev, created.topic])].sort());
    setLists((prev) => [...new Set([...prev, created.list_name])].sort());
  }

  // Group filtered problems by topic
  const grouped = filtered.reduce<Record<string, Problem[]>>((acc, p) => {
    if (!acc[p.topic]) acc[p.topic] = [];
    acc[p.topic].push(p);
    return acc;
  }, {});

  if (loading) return <div className="spinner">Loading problems…</div>;

  return (
    <>
      <div className="queue-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="screen-title">Problem Library</div>
          <div className="queue-date">{problems.length} problems across {topics.length} topics</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + New Problem
        </button>
      </div>

      <input
        className="notes-input input-line"
        style={{ marginBottom: 20 }}
        placeholder="Search by title, topic, or list…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <h3>No problems found</h3>
          <p>{problems.length === 0 ? 'Run npm run seed to populate the library.' : 'Try a different search.'}</p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([topic, items]) => (
            <div key={topic} className="topic-group">
              <div className="topic-label">
                {topic} <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>({items.length})</span>
              </div>
              {items.map((p) => (
                <div key={p.id} className="queue-item">
                  <div className="problem-info">
                    <button
                      className="link-btn problem-title"
                      onClick={() => api.shell.openUrl(p.leetcode_url)}
                    >
                      {p.title}
                    </button>
                    <div className="problem-meta">
                      <span className={`difficulty-badge ${p.difficulty}`}>{p.difficulty}</span>
                      <span className="list-name">{p.list_name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
      )}

      {showForm && (
        <AddProblemModal
          topics={topics}
          lists={lists}
          onAdd={handleProblemAdded}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}
