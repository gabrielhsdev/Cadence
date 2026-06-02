import React, { useCallback, useEffect, useState } from 'react';
import { Problem, QueueGroupedByTopic, QueueItemWithProblem } from '../types';
import { api } from '../renderer/api';
import QueueItem from '../components/QueueItem';
import ReviewModal from '../components/ReviewModal';
import AddToQueueModal from '../components/AddToQueueModal';

export default function QueueScreen(): React.ReactElement {
  const [groups, setGroups] = useState<QueueGroupedByTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reviewItem, setReviewItem] = useState<QueueItemWithProblem | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [addingTopic, setAddingTopic] = useState<string | null>(null);
  const [topicNotice, setTopicNotice] = useState<{ topic: string; text: string } | null>(null);

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
    setGenerating(true);
    const data = await api.queue.generate();
    setGroups(data);
    setGenerating(false);
  }

  async function handleOpen(item: QueueItemWithProblem): Promise<void> {
    await api.shell.openUrl(item.problem.leetcode_url);
    setReviewItem(item);
  }

  async function handleRefresh(item: QueueItemWithProblem): Promise<void> {
    setRefreshingId(item.id);
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
    setRefreshingId(null);
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
    setAddingTopic(topic);
    const result = await api.queue.addMoreForTopic(topic, 2);
    if (result.added > 0) {
      const data = await api.queue.getToday();
      setGroups(data);
      setTopicNotice(null);
    } else {
      setTopicNotice({ topic, text: 'No more eligible problems in this topic.' });
      setTimeout(() => setTopicNotice(null), 3000);
    }
    setAddingTopic(null);
  }

  async function handleResetToday(): Promise<void> {
    setResetting(true);
    const data = await api.queue.resetToday();
    setGroups(data);
    setConfirmReset(false);
    setResetting(false);
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
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Queue'}
          </button>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.topic} className="topic-group">
            <div className="topic-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>{group.topic}</span>
              <button
                className="btn btn-sm"
                onClick={() => handleAddMoreForTopic(group.topic)}
                disabled={addingTopic === group.topic}
                style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 500 }}
              >
                {addingTopic === group.topic ? '…' : '+ More'}
              </button>
            </div>
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
                refreshing={refreshingId === item.id}
              />
            ))}
          </div>
        ))
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
        <div className="modal-overlay" onClick={() => setConfirmReset(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Refresh today's queue?</div>
            <div className="modal-subtitle" style={{ marginBottom: 20, lineHeight: 1.6 }}>
              This clears all pending and skipped problems for today and regenerates the queue from your current settings.
              <br />
              <strong style={{ color: 'var(--text)' }}>Completed reviews are kept.</strong>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleResetToday}
                disabled={resetting}
              >
                {resetting ? 'Regenerating…' : 'Yes, refresh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
