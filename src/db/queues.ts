import Database from 'better-sqlite3';
import { DailyQueue, DailyQueueItem, QueueItemWithProblem } from '../types';

export function getQueueForDate(db: Database.Database, date: string): DailyQueue | undefined {
  return db
    .prepare('SELECT * FROM daily_queues WHERE queue_date = ?')
    .get(date) as DailyQueue | undefined;
}

export function createQueue(db: Database.Database, date: string): DailyQueue {
  const result = db
    .prepare('INSERT INTO daily_queues (queue_date) VALUES (?)')
    .run(date);
  return db
    .prepare('SELECT * FROM daily_queues WHERE id = ?')
    .get(result.lastInsertRowid) as DailyQueue;
}

export function addQueueItem(
  db: Database.Database,
  queueId: number,
  problemId: number
): DailyQueueItem {
  const result = db
    .prepare('INSERT INTO daily_queue_items (queue_id, problem_id) VALUES (?, ?)')
    .run(queueId, problemId);
  return db
    .prepare('SELECT * FROM daily_queue_items WHERE id = ?')
    .get(result.lastInsertRowid) as DailyQueueItem;
}

export function getQueueItems(db: Database.Database, queueId: number): QueueItemWithProblem[] {
  return db
    .prepare(`
      SELECT
        dqi.id, dqi.queue_id, dqi.problem_id, dqi.status,
        p.title, p.topic, p.difficulty, p.leetcode_url, p.list_name,
        r.id as review_id, r.rating, r.notes, r.reviewed_at, r.next_review_at
      FROM daily_queue_items dqi
      JOIN problems p ON p.id = dqi.problem_id
      LEFT JOIN reviews r ON r.id = (
        SELECT id FROM reviews WHERE problem_id = dqi.problem_id ORDER BY reviewed_at DESC LIMIT 1
      )
      WHERE dqi.queue_id = ?
      ORDER BY p.topic, p.title
    `)
    .all(queueId)
    .map((row) => mapRow(row as Record<string, unknown>)) as QueueItemWithProblem[];
}

export function getQueueItemIds(db: Database.Database, queueId: number): number[] {
  const rows = db
    .prepare('SELECT problem_id FROM daily_queue_items WHERE queue_id = ?')
    .all(queueId) as { problem_id: number }[];
  return rows.map((r) => r.problem_id);
}

export function updateQueueItemStatus(
  db: Database.Database,
  itemId: number,
  status: 'pending' | 'completed' | 'skipped'
): void {
  db.prepare('UPDATE daily_queue_items SET status = ? WHERE id = ?').run(status, itemId);
}

export function removeQueueItem(db: Database.Database, itemId: number): void {
  db.prepare('DELETE FROM daily_queue_items WHERE id = ?').run(itemId);
}

export function deleteQueueForDate(db: Database.Database, date: string): void {
  db.transaction(() => {
    const queue = db
      .prepare('SELECT id FROM daily_queues WHERE queue_date = ?')
      .get(date) as { id: number } | undefined;
    if (!queue) return;
    db.prepare('DELETE FROM daily_queue_items WHERE queue_id = ?').run(queue.id);
    db.prepare('DELETE FROM daily_queues WHERE id = ?').run(queue.id);
  })();
}

export function getQueueItem(
  db: Database.Database,
  itemId: number
): QueueItemWithProblem | undefined {
  const row = db
    .prepare(`
      SELECT
        dqi.id, dqi.queue_id, dqi.problem_id, dqi.status,
        p.title, p.topic, p.difficulty, p.leetcode_url, p.list_name,
        r.id as review_id, r.rating, r.notes, r.reviewed_at, r.next_review_at
      FROM daily_queue_items dqi
      JOIN problems p ON p.id = dqi.problem_id
      LEFT JOIN reviews r ON r.id = (
        SELECT id FROM reviews WHERE problem_id = dqi.problem_id ORDER BY reviewed_at DESC LIMIT 1
      )
      WHERE dqi.id = ?
    `)
    .get(itemId);
  return row ? mapRow(row as Record<string, unknown>) : undefined;
}

function mapRow(row: Record<string, unknown>): QueueItemWithProblem {
  return {
    id: row.id as number,
    queue_id: row.queue_id as number,
    problem_id: row.problem_id as number,
    status: row.status as 'pending' | 'completed' | 'skipped',
    problem: {
      id: row.problem_id as number,
      title: row.title as string,
      topic: row.topic as string,
      difficulty: row.difficulty as 'Easy' | 'Medium' | 'Hard',
      leetcode_url: row.leetcode_url as string,
      list_name: row.list_name as string,
    },
    last_review: row.review_id
      ? {
          id: row.review_id as number,
          problem_id: row.problem_id as number,
          rating: row.rating as number,
          notes: row.notes as string,
          reviewed_at: row.reviewed_at as string,
          next_review_at: row.next_review_at as string,
        }
      : undefined,
  };
}
