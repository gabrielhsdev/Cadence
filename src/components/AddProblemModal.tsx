import React, { useState } from 'react';
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

interface Props {
  topics: string[];
  lists: string[];
  onAdd: (problem: Problem) => void;
  onClose: () => void;
}

export default function AddProblemModal({ topics, lists, onAdd, onClose }: Props): React.ReactElement {
  const [form, setForm] = useState<NewProblem>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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
    onAdd(created);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
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
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Add Problem'}
          </button>
        </div>
      </div>
    </div>
  );
}
