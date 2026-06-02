import Database from 'better-sqlite3';
import { Difficulty, QueueGroupedByTopic, QueueItemWithProblem } from '../types';
import { getEligibleProblems } from '../db/problems';
import { getProblemsReviewedToday } from '../db/reviews';
import {
  getQueueForDate,
  createQueue,
  addQueueItem,
  getQueueItems,
  getQueueItemIds,
  removeQueueItem,
} from '../db/queues';
import { getDifficultySettings, getTopicSettings } from '../db/settings';

function getEnabledDifficulties(db: Database.Database): Difficulty[] {
  const diffSettings = getDifficultySettings(db);
  const enabled: Difficulty[] = [];
  if (diffSettings.easy) enabled.push('Easy');
  if (diffSettings.medium) enabled.push('Medium');
  if (diffSettings.hard) enabled.push('Hard');
  return enabled;
}

export function getOrGenerateQueue(db: Database.Database, today: string): QueueGroupedByTopic[] {
  const existing = getQueueForDate(db, today);
  if (existing) {
    return groupByTopic(getQueueItems(db, existing.id));
  }
  return generateQueue(db, today);
}

export function generateQueue(db: Database.Database, today: string): QueueGroupedByTopic[] {
  const topicSettings = getTopicSettings(db);
  const enabledDifficulties = getEnabledDifficulties(db);

  const reviewedToday = getProblemsReviewedToday(db, today);

  // Get or create today's queue record
  let queue = getQueueForDate(db, today);
  if (!queue) {
    queue = createQueue(db, today);
  }

  const alreadyInQueue = getQueueItemIds(db, queue.id);
  const excludeIds = [...new Set([...reviewedToday, ...alreadyInQueue])];

  const insertTransaction = db.transaction(() => {
    for (const setting of topicSettings) {
      if (!setting.enabled || setting.problems_per_day === 0) continue;

      const eligible = getEligibleProblems(
        db,
        setting.topic,
        today,
        enabledDifficulties,
        excludeIds
      );

      const count = Math.min(setting.problems_per_day, eligible.length);
      for (let i = 0; i < count; i++) {
        addQueueItem(db, queue!.id, eligible[i].id);
        excludeIds.push(eligible[i].id);
      }
    }
  });

  insertTransaction();
  return groupByTopic(getQueueItems(db, queue.id));
}

export function refreshQueueItem(
  db: Database.Database,
  itemId: number,
  topic: string,
  queueId: number,
  today: string
): QueueItemWithProblem | null {
  const enabledDifficulties = getEnabledDifficulties(db);

  const reviewedToday = getProblemsReviewedToday(db, today);
  const inQueue = getQueueItemIds(db, queueId);
  const excludeIds = [...new Set([...reviewedToday, ...inQueue])];

  const eligible = getEligibleProblems(db, topic, today, enabledDifficulties, excludeIds);
  if (eligible.length === 0) return null;

  const replacement = eligible[0];

  db.transaction(() => {
    removeQueueItem(db, itemId);
    addQueueItem(db, queueId, replacement.id);
  })();

  const items = getQueueItems(db, queueId);
  return items.find((i) => i.problem_id === replacement.id) ?? null;
}

// Add more problems for a single topic (respects difficulty filters, dedupes)
export function addMoreForTopic(
  db: Database.Database,
  topic: string,
  count: number,
  today: string
): { added: number; exhausted: boolean } {
  let queue = getQueueForDate(db, today);
  if (!queue) queue = createQueue(db, today);

  const enabledDifficulties = getEnabledDifficulties(db);
  const reviewedToday = getProblemsReviewedToday(db, today);
  const inQueue = getQueueItemIds(db, queue.id);
  const excludeIds = [...new Set([...reviewedToday, ...inQueue])];

  const eligible = getEligibleProblems(db, topic, today, enabledDifficulties, excludeIds);
  const toAdd = Math.min(count, eligible.length);

  db.transaction(() => {
    for (let i = 0; i < toAdd; i++) {
      addQueueItem(db, queue!.id, eligible[i].id);
    }
  })();

  return { added: toAdd, exhausted: eligible.length === 0 };
}

function groupByTopic(items: QueueItemWithProblem[]): QueueGroupedByTopic[] {
  const map = new Map<string, QueueItemWithProblem[]>();
  for (const item of items) {
    const topic = item.problem.topic;
    if (!map.has(topic)) map.set(topic, []);
    map.get(topic)!.push(item);
  }
  return Array.from(map.entries()).map(([topic, groupItems]) => ({ topic, items: groupItems }));
}
