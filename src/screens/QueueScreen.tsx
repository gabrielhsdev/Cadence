import React, { useCallback, useEffect, useState } from 'react';
import { Problem, QueueGroupedByTopic, QueueItemWithProblem } from '../types';
import { api } from '../renderer/api';
import QueueItem from '../components/QueueItem';
import ReviewModal from '../components/ReviewModal';
import AddToQueueModal from '../components/AddToQueueModal';
import ConfirmModal from '../components/ConfirmModal';

interface BusyState {
  generating: boolean;
  resetting: boolean;
  addingTopic: string | null;
  refreshingId: number | null;
}

const IDLE: BusyState = {
  generating: false,
  resetting: false,
  addingTopic: null,
  refreshingId: null,
};

// Per-topic collapsed state is a UI preference, persisted in localStorage (not
// the DB) so it survives reloads without touching app data.
const COLLAPSED_KEY = 'cadence.queue.collapsedTopics';

function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveCollapsed(value: Record<string, boolean>): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / unavailable storage */
  }
}

export default function QueueScreen(): React.ReactElement {
  const [groups, setGroups] = useState<QueueGroupedByTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyState>(IDLE);
  const [reviewItem, setReviewItem] = useState<QueueItemWithProblem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [topicNotice, setTopicNotice] = useState<{ topic: string; text: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsed);

  function setBusyField<K extends keyof BusyState>(key: K, value: BusyState[K]): void {
    setBusy((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTopic(topic: string): void {
    setCollapsed((prev) => {
      const next = { ...prev, [topic]: !prev[topic] };
      saveCollapsed(next);
      return next;
    });
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const totalItems = groups.reduce((s, g) => s + g.items.length, 0);
  const completedItems = groups.reduce(
    (s, g) => s + g.items.filter((i) => i.status === 'completed').length,
    0
  );

  const load = useCallback(async () => {
    const data = await api.queue.getToday();
    setGroups(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate(): Promise<void> {
    setBusyField('generating', true);
    const data = await api.queue.generate();
    setGroups(data);
    setBusyField('generating', false);
  }

  async function handleOpen(item: QueueItemWithProblem): Promise<void> {
    await api.shell.openUrl(item.problem.leetcode_url);
    setReviewItem(item);
  }

  async function handleRefresh(item: QueueItemWithProblem): Promise<void> {
    setBusyField('refreshingId', item.id);
    const replacement = await api.queue.refreshItem(item.id, item.problem.topic);
    if (replacement) {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.topic !== item.problem.topic) return g;
          return {
            ...g,
            items: g.items.map((i) => (i.id === item.id ? replacement : i)),
          };
        })
      );
    }
    setBusyField('refreshingId', null);
  }

  async function handleSkip(item: QueueItemWithProblem): Promise<void> {
    await api.queue.skipItem(item.id);
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          i.id === item.id ? { ...i, status: 'skipped' as const } : i
        ),
      }))
    );
  }

  async function handleAddMoreForTopic(topic: string): Promise<void> {
    setBusyField('addingTopic', topic);
    const result = await api.queue.addMoreForTopic(topic, 2);
    if (result.added > 0) {
      const data = await api.queue.getToday();
      setGroups(data);
      setTopicNotice(null);
    } else {
      setTopicNotice({ topic, text: 'No more eligible problems in this topic.' });
      setTimeout(() => setTopicNotice(null), 3000);
    }
    setBusyField('addingTopic', null);
  }

  async function handleResetToday(): Promise<void> {
    setBusyField('resetting', true);
    const data = await api.queue.resetToday();
    setGroups(data);
    setConfirmReset(false);
    setBusyField('resetting', false);
  }

  function handleProblemAddedToQueue(_problem: Problem): void {
    // Reload the full queue so the new item appears in the right topic group
    load();
  }

  async function handleReviewSave(rating: number, notes: string): Promise<void> {
    if (!reviewItem) return;
    await api.review.submit({
      queue_item_id: reviewItem.id,
      problem_id: reviewItem.problem_id,
      rating,
      notes,
    });
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          i.id === reviewItem.id ? { ...i, status: 'completed' as const } : i
        ),
      }))
    );
    setReviewItem(null);
  }

  if (loading) {
    return <div className="spinner">Loading queue…</div>;
  }

  return (
    <>
      <div className="queue-header">
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Today's Queue</div>
          <div className="queue-date">{today}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {totalItems > 0 && (
            <span className="queue-stats">
              {completedItems} / {totalItems} done
            </span>
          )}
          <button className="btn" onClick={() => setShowAddModal(true)}>
            + Specific Problem
          </button>
          <button
            className="btn"
            style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
            onClick={() => setConfirmReset(true)}
          >
            ↺ Refresh Today
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <h3>No problems queued</h3>
          <p>Your enabled topics may have no eligible problems, or all due problems are filtered by difficulty settings.</p>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={busy.generating}>
            {busy.generating ? 'Generating…' : 'Generate Queue'}
          </button>
        </div>
      ) : (
        groups.map((group) => {
          const isCollapsed = !!collapsed[group.topic];
          const doneCount = group.items.filter((i) => i.status === 'completed').length;
          return (
            <div key={group.topic} className="topic-group">
              <div className="topic-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <button
                  className="topic-toggle"
                  onClick={() => toggleTopic(group.topic)}
                  title={isCollapsed ? 'Expand topic' : 'Collapse topic'}
                  aria-expanded={!isCollapsed}
                >
                  <span className="topic-toggle-caret">{isCollapsed ? '▸' : '▾'}</span>
                  <span>{group.topic}</span>
                  <span className="topic-toggle-count">{doneCount}/{group.items.length}</span>
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => handleAddMoreForTopic(group.topic)}
                  disabled={busy.addingTopic === group.topic}
                  style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 500 }}
                >
                  {busy.addingTopic === group.topic ? '…' : '+ More'}
                </button>
              </div>
              {!isCollapsed && (
                <>
                  {topicNotice?.topic === group.topic && (
                    <div style={{ fontSize: 11, color: 'var(--warning)', marginBottom: 6 }}>
                      {topicNotice.text}
                    </div>
                  )}
                  {group.items.map((item) => (
                    <QueueItem
                      key={item.id}
                      item={item}
                      onOpen={() => handleOpen(item)}
                      onReview={() => setReviewItem(item)}
                      onRefresh={() => handleRefresh(item)}
                      onSkip={() => handleSkip(item)}
                      refreshing={busy.refreshingId === item.id}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })
      )}

      {reviewItem && (
        <ReviewModal
          item={reviewItem}
          onSave={handleReviewSave}
          onClose={() => setReviewItem(null)}
        />
      )}

      {showAddModal && (
        <AddToQueueModal
          onAdd={handleProblemAddedToQueue}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {confirmReset && (
        <ConfirmModal
          title="Refresh today's queue?"
          confirmLabel={busy.resetting ? 'Regenerating…' : 'Yes, refresh'}
          confirmDisabled={busy.resetting}
          onConfirm={handleResetToday}
          onClose={() => setConfirmReset(false)}
        >
          This clears all pending and skipped problems for today and regenerates the queue from your current settings.
          <br />
          <strong style={{ color: 'var(--text)' }}>Completed reviews are kept.</strong>
        </ConfirmModal>
      )}
    </>
  );
}
