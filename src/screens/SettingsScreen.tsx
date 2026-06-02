import React, { useCallback, useEffect, useState } from 'react';
import { DifficultySettings, RatingIntervals, TopicSetting } from '../types';
import { api } from '../renderer/api';

const RATINGS = [1, 2, 3, 4, 5] as const;

export default function SettingsScreen(): React.ReactElement {
  const [topics, setTopics] = useState<TopicSetting[]>([]);
  const [difficulties, setDifficulties] = useState<DifficultySettings>({ easy: false, medium: true, hard: true });
  const [intervals, setIntervals] = useState<RatingIntervals>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [t, d, iv] = await Promise.all([
      api.settings.getTopics(),
      api.settings.getDifficulties(),
      api.settings.getIntervals(),
    ]);
    setTopics(t);
    setDifficulties(d);
    setIntervals(iv);
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

  async function handleIntervalChange(rating: number, days: number): Promise<void> {
    const safeDays = Math.max(1, days);
    const updated = { ...intervals, [rating]: safeDays };
    setIntervals(updated);
    await api.settings.updateIntervals(updated);
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
        <div className="settings-section-title">Review Intervals</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
          Days until a problem is due again, based on the rating you give it (1 = hardest, 5 = easiest).
        </div>
        {RATINGS.map((rating) => (
          <div key={rating} className="settings-row">
            <span className="settings-row-label">Rating {rating}</span>
            <div className="settings-row-controls">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <input
                  type="number"
                  className="number-input"
                  min={1}
                  max={3650}
                  value={intervals[rating] ?? ''}
                  onChange={(e) => handleIntervalChange(rating, parseInt(e.target.value, 10) || 1)}
                />
                <span>days</span>
              </label>
            </div>
          </div>
        ))}
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
