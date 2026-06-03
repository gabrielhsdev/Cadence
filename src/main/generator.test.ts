import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { initSchema } from '../db/schema';
import { addProblem } from '../db/problems';
import { insertReview } from '../db/reviews';
import { upsertProblemState } from '../db/state';
import { upsertTopicSetting } from '../db/settings';
import { getQueueForDate, getQueueItems } from '../db/queues';
import { generateQueue, getOrGenerateQueue, addMoreForTopic, refreshQueueItem } from './generator';
import { NewProblem, ProblemState } from '../types';

const TODAY = '2026-06-02';

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

// Medium difficulty is enabled by default (difficulty_settings: medium on).
function addArrays(db: Database.Database, n: number): void {
  for (let i = 0; i < n; i++) {
    const p: NewProblem = {
      title: `Problem ${i}`,
      topic: 'Arrays',
      difficulty: 'Medium',
      leetcode_url: `https://leetcode.com/p/${i}`,
      list_name: 'Test',
    };
    addProblem(db, p); // also auto-creates topic_settings (enabled, 2/day)
  }
}

function setPerDay(db: Database.Database, topic: string, perDay: number, enabled = true): void {
  upsertTopicSetting(db, { topic, enabled, problems_per_day: perDay });
}

function setDue(db: Database.Database, problemId: number, due: string): void {
  const state: ProblemState = {
    problem_id: problemId,
    stability: 10,
    difficulty: 5,
    due,
    last_reviewed_at: TODAY,
    scheduled_days: 7,
    reps: 1,
    lapses: 0,
    state: 2,
  };
  upsertProblemState(db, state);
}

function countItems(db: Database.Database): number {
  const q = getQueueForDate(db, TODAY);
  return q ? getQueueItems(db, q.id).length : 0;
}

test('generateQueue takes up to problems_per_day per topic', () => {
  const db = freshDb();
  addArrays(db, 5);
  setPerDay(db, 'Arrays', 2);
  const groups = generateQueue(db, TODAY);
  const arrays = groups.find((g) => g.topic === 'Arrays');
  assert.ok(arrays);
  assert.equal(arrays!.items.length, 2);
});

test('problems_per_day is configurable', () => {
  const db = freshDb();
  addArrays(db, 5);
  setPerDay(db, 'Arrays', 3);
  assert.equal(generateQueue(db, TODAY)[0].items.length, 3);
});

test('getOrGenerateQueue is idempotent — second call returns the same queue', () => {
  const db = freshDb();
  addArrays(db, 5);
  setPerDay(db, 'Arrays', 2);
  const first = getOrGenerateQueue(db, TODAY);
  const second = getOrGenerateQueue(db, TODAY);
  assert.equal(first[0].items.length, 2);
  assert.equal(second[0].items.length, 2); // not 4 — it did not regenerate
  assert.equal(countItems(db), 2);
});

test('a disabled topic contributes nothing', () => {
  const db = freshDb();
  addArrays(db, 3);
  setPerDay(db, 'Arrays', 2, /* enabled */ false);
  assert.equal(generateQueue(db, TODAY).length, 0);
});

test('problems_per_day = 0 contributes nothing', () => {
  const db = freshDb();
  addArrays(db, 3);
  setPerDay(db, 'Arrays', 0);
  assert.equal(generateQueue(db, TODAY).length, 0);
});

test('excludes problems already reviewed today', () => {
  const db = freshDb();
  addArrays(db, 3);
  setPerDay(db, 'Arrays', 3);
  // Mark the first problem reviewed today → must not appear in today's queue.
  insertReview(db, 1, 3, '', TODAY, '2026-06-09');
  const items = generateQueue(db, TODAY)[0].items;
  assert.equal(items.length, 2);
  assert.ok(!items.some((i) => i.problem_id === 1));
});

test('excludes problems whose due date is in the future', () => {
  const db = freshDb();
  addArrays(db, 3);
  setPerDay(db, 'Arrays', 3);
  setDue(db, 1, '2026-07-01'); // not due yet on TODAY
  const items = generateQueue(db, TODAY)[0].items;
  assert.equal(items.length, 2);
  assert.ok(!items.some((i) => i.problem_id === 1));
});

test('addMoreForTopic appends more and reports exhaustion', () => {
  const db = freshDb();
  addArrays(db, 3);
  setPerDay(db, 'Arrays', 2);
  generateQueue(db, TODAY); // 2 of 3 queued
  const r1 = addMoreForTopic(db, 'Arrays', 5, TODAY);
  assert.equal(r1.added, 1, 'only one eligible problem remained');
  assert.equal(r1.exhausted, false);
  const r2 = addMoreForTopic(db, 'Arrays', 5, TODAY);
  assert.equal(r2.added, 0);
  assert.equal(r2.exhausted, true);
  assert.equal(countItems(db), 3);
});

test('refreshQueueItem swaps an item for a different eligible problem', () => {
  const db = freshDb();
  addArrays(db, 3);
  setPerDay(db, 'Arrays', 2);
  generateQueue(db, TODAY);
  const queue = getQueueForDate(db, TODAY)!;
  const before = getQueueItems(db, queue.id);
  const target = before[0];
  const otherIds = before.map((i) => i.problem_id);

  const replacement = refreshQueueItem(db, target.id, 'Arrays', queue.id, TODAY);
  assert.ok(replacement, 'a replacement was found (a 3rd problem existed)');
  assert.ok(!otherIds.includes(replacement!.problem_id), 'replacement is a new problem');

  const after = getQueueItems(db, queue.id);
  assert.equal(after.length, 2);
  assert.ok(!after.some((i) => i.id === target.id), 'the old item was removed');
});
