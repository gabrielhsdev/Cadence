import React from 'react';
import { QueueGroupedByTopic, QueueItemWithProblem } from '../types';
import QueueItem from './QueueItem';

interface Props {
  group: QueueGroupedByTopic;
  collapsed: boolean;
  onToggle: () => void;
  addingMore: boolean;
  onAddMore: () => void;
  notice?: string;
  refreshingId: number | null;
  onOpen: (item: QueueItemWithProblem) => void;
  onReview: (item: QueueItemWithProblem) => void;
  onRefresh: (item: QueueItemWithProblem) => void;
  onSkip: (item: QueueItemWithProblem) => void;
}

// One topic section on the Today screen: a collapsible header (toggle + progress
// + "+ More") and the list of QueueItems.
export default function TopicGroup({
  group,
  collapsed,
  onToggle,
  addingMore,
  onAddMore,
  notice,
  refreshingId,
  onOpen,
  onReview,
  onRefresh,
  onSkip,
}: Props): React.ReactElement {
  const doneCount = group.items.filter((i) => i.status === 'completed').length;

  return (
    <div className="topic-group">
      <div className="topic-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button
          className="topic-toggle"
          onClick={onToggle}
          title={collapsed ? 'Expand topic' : 'Collapse topic'}
          aria-expanded={!collapsed}
        >
          <span className="topic-toggle-caret">{collapsed ? '▸' : '▾'}</span>
          <span>{group.topic}</span>
          <span className="topic-toggle-count">{doneCount}/{group.items.length}</span>
        </button>
        <button
          className="btn btn-sm"
          onClick={onAddMore}
          disabled={addingMore}
          style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 500 }}
        >
          {addingMore ? '…' : '+ More'}
        </button>
      </div>

      {!collapsed && (
        <>
          {notice && (
            <div style={{ fontSize: 11, color: 'var(--warning)', marginBottom: 6 }}>{notice}</div>
          )}
          {group.items.map((item) => (
            <QueueItem
              key={item.id}
              item={item}
              onOpen={() => onOpen(item)}
              onReview={() => onReview(item)}
              onRefresh={() => onRefresh(item)}
              onSkip={() => onSkip(item)}
              refreshing={refreshingId === item.id}
            />
          ))}
        </>
      )}
    </div>
  );
}
