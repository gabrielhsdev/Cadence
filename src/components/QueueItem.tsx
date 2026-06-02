import React from 'react';
import { QueueItemWithProblem } from '../types';

interface Props {
  item: QueueItemWithProblem;
  onOpen: () => void;
  onReview: () => void;
  onRefresh: () => void;
  onSkip: () => void;
  refreshing: boolean;
}

const STATUS_ICON: Record<string, string> = {
  pending: '○',
  completed: '✓',
  skipped: '⏭',
};

export default function QueueItem({ item, onOpen, onReview, onRefresh, onSkip, refreshing }: Props): React.ReactElement {
  const isPending = item.status === 'pending';
  const icon = STATUS_ICON[item.status] ?? '○';

  return (
    <div className={`queue-item item-status-${item.status}`}>
      <span className="status-icon" style={{ color: item.status === 'completed' ? 'var(--success)' : item.status === 'skipped' ? 'var(--text-dim)' : 'var(--text-muted)' }}>
        {icon}
      </span>

      <div className="problem-info">
        <div className="problem-title">{item.problem.title}</div>
        <div className="problem-meta">
          <span className={`difficulty-badge ${item.problem.difficulty}`}>
            {item.problem.difficulty}
          </span>
          <span className="list-name">{item.problem.list_name}</span>
        </div>
      </div>

      {isPending && (
        <div className="item-actions">
          <button className="btn btn-sm" onClick={onOpen} title="Open LeetCode + review">Open</button>
          <button className="btn btn-sm" onClick={onReview} title="Review without opening LeetCode">Review</button>
          <button className="btn btn-sm" onClick={onRefresh} disabled={refreshing} title="Swap for a different problem">
            {refreshing ? 'Swapping…' : 'Swap'}
          </button>
          <button className="btn btn-sm" onClick={onSkip} title="Skip for today">Skip</button>
        </div>
      )}
    </div>
  );
}
