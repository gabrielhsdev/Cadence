import React, { useCallback, useEffect, useState } from 'react';
import { DifficultySettings, TopicSetting } from '../types';
import { api } from '../renderer/api';

export default function SettingsScreen(): React.ReactElement {
  const [topics, setTopics] = useState<TopicSetting[]>([]);
  const [difficulties, setDifficulties] = useState<DifficultySettings>({ easy: false, medium: true, hard: true });
  const [lists, setLists] = useState<string[]>([]);
  const [activeList, setActiveList] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [t, d, ls, al] = await Promise.all([
      api.settings.getTopics(),
      api.settings.getDifficulties(),
      api.settings.getLists(),
      api.settings.getActiveList(),
    ]);
    setTopics(t);
    setDifficulties(d);
    setLists(ls);
    setActiveList(al);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleTopicChange(topic: string, field: 'enabled' | 'problems_per_day', value: boolean | number): Promise<void> {
    const updated = topics.map((t) =>
      t.topic === topic ? { ...t, [field]: value } : t
    );
    setTopics(updated);
    const setting = updated.find((t) => t.topic === topic);
    if (setting) await api.settings.updateTopic(setting);
  }

  async function handleDifficultyToggle(key: keyof DifficultySettings): Promise<void> {
    setSaving(true);
    const updated = { ...difficulties, [key]: !difficulties[key] };
    setDifficulties(updated);
    await api.settings.updateDifficulties(updated);
    setSaving(false);
  }

  async function handleActiveListChange(list: string): Promise<void> {
    setActiveList(list);
    await api.settings.setActiveList(list);
  }

  if (loading) return <div className="spinner">Loading settings…</div>;

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Settings</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Configure which topics and difficulties appear in your daily queue.
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Problem List</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
          Which list the daily queue draws from. Changes apply to your next day or when you
          reset today — your current queue stays as is.
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Active list</span>
          <div className="settings-row-controls">
            <select
              className="number-input"
              style={{ width: 'auto', minWidth: 160 }}
              value={activeList}
              onChange={(e) => handleActiveListChange(e.target.value)}
            >
              <option value="">All Problems</option>
              {lists.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Difficulty Filters</div>
        <div className="settings-row">
          <span className="settings-row-label">Enabled difficulties</span>
          <div className="diff-chips">
            {(['Easy', 'Medium', 'Hard'] as const).map((d) => {
              const key = d.toLowerCase() as keyof DifficultySettings;
              return (
                <button
                  key={d}
                  className={`diff-chip ${d}${difficulties[key] ? ' active' : ''}`}
                  onClick={() => handleDifficultyToggle(key)}
                  disabled={saving}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Review Scheduling</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          Review timing is handled automatically by <strong>FSRS</strong>, which learns
          each problem&apos;s memory strength from your ratings and schedules the next review
          for when you&apos;re about to forget it. The more confidently you rate a problem, the
          longer until it returns. See the <strong>Forecast</strong> tab for what&apos;s coming up.
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Topics</div>
        {topics.map((t) => (
          <div key={t.topic} className="settings-row">
            <span className="settings-row-label">{t.topic}</span>
            <div className="settings-row-controls">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{t.problems_per_day}/day</span>
                <input
                  type="number"
                  className="number-input"
                  min={0}
                  max={10}
                  value={t.problems_per_day}
                  disabled={!t.enabled}
                  onChange={(e) => handleTopicChange(t.topic, 'problems_per_day', parseInt(e.target.value, 10) || 0)}
                />
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={t.enabled}
                  onChange={(e) => handleTopicChange(t.topic, 'enabled', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
