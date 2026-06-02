import React, { useCallback, useEffect, useState } from 'react';
import { Difficulty, NewProblem, Problem } from '../types';
import { api } from '../renderer/api';

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const EMPTY_FORM: NewProblem = {
  title: '',
  topic: '',
  difficulty: 'Medium',
  leetcode_url: '',
  list_name: '',
};

export default function ProblemsScreen(): React.ReactElement {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filtered, setFiltered] = useState<Problem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewProblem>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
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

  function setField<K extends keyof NewProblem>(key: K, value: NewProblem[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  }

  async function handleSave(): Promise<void> {
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.topic.trim()) { setFormError('Topic is required.'); return; }
    if (!form.list_name.trim()) { setFormError('List name is required.'); return; }

    setSaving(true);
    const created = await api.problems.add(form);
    setProblems((prev) => [...prev, created].sort((a, b) =>
      a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title)
    ));
    // Update autocomplete lists
    setTopics((prev) => [...new Set([...prev, created.topic])].sort());
    setLists((prev) => [...new Set([...prev, created.list_name])].sort());
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
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
          <div style={{ fontWeight: 600, fontSize: 15 }}>Problem Library</div>
          <div className="queue-date">{problems.length} problems across {topics.length} topics</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormError(''); }}>
          + New Problem
        </button>
      </div>

      <input
        className="notes-input"
        style={{ minHeight: 'unset', height: 36, marginBottom: 20, resize: 'none' }}
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

      {/* Add Problem modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">New Problem</div>
            <div className="modal-subtitle">Add a problem to your library.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Title */}
              <div>
                <span className="modal-label">Title *</span>
                <input
                  className="notes-input"
                  style={{ minHeight: 'unset', height: 36, resize: 'none' }}
                  placeholder="e.g. Word Ladder"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                />
              </div>

              {/* Topic */}
              <div>
                <span className="modal-label">Topic *</span>
                <input
                  className="notes-input"
                  style={{ minHeight: 'unset', height: 36, resize: 'none' }}
                  list="topics-list"
                  placeholder="e.g. Graphs"
                  value={form.topic}
                  onChange={(e) => setField('topic', e.target.value)}
                />
                <datalist id="topics-list">
                  {topics.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>

              {/* Difficulty */}
              <div>
                <span className="modal-label">Difficulty *</span>
                <div className="diff-chips" style={{ marginTop: 0 }}>
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      className={`diff-chip ${d}${form.difficulty === d ? ' active' : ''}`}
                      onClick={() => setField('difficulty', d)}
                      type="button"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* LeetCode URL */}
              <div>
                <span className="modal-label">LeetCode URL</span>
                <input
                  className="notes-input"
                  style={{ minHeight: 'unset', height: 36, resize: 'none' }}
                  placeholder="https://leetcode.com/problems/…"
                  value={form.leetcode_url}
                  onChange={(e) => setField('leetcode_url', e.target.value)}
                />
              </div>

              {/* List name */}
              <div>
                <span className="modal-label">List *</span>
                <input
                  className="notes-input"
                  style={{ minHeight: 'unset', height: 36, resize: 'none' }}
                  list="lists-list"
                  placeholder="e.g. NeetCode 150"
                  value={form.list_name}
                  onChange={(e) => setField('list_name', e.target.value)}
                />
                <datalist id="lists-list">
                  {lists.map((l) => <option key={l} value={l} />)}
                </datalist>
              </div>
            </div>

            {formError && (
              <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{formError}</div>
            )}

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Add Problem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
