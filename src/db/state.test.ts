import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { initSchema } from './schema';
import { addProblem } from './problems';
import { insertReview } from './reviews';
import { getProblemState, getForecast } from './state';
import { ensureProblemStates } from '../main/backfill';
import { applyRating } from '../main/scheduler';
import { NewProblem } from '../types';

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

function makeProblem(over: Partial<NewProblem> = {}): NewProblem {
  return {
    title: 'Two Sum',
    topic: 'Arrays',
    difficulty: 'Medium',
    leetcode_url: `https://leetcode.com/${Math.random()}`,
    list_name: 'Test',
    ...over,
  };
}

test('ensureProblemStates backfills FSRS state from review history', () => {
  const db = freshDb();
  const p = addProblem(db, makeProblem());
  insertReview(db, p.id, 3, '', '2026-06-02', '2026-06-05');
  insertReview(db, p.id, 4, '', '2026-06-05', '2026-06-12');

  assert.equal(getProblemState(db, p.id), undefined, 'no state before backfill');
  ensureProblemStates(db);

  const state = getProblemState(db, p.id);
  assert.ok(state, 'state created');
  // Matches a direct replay of the same two ratings/dates.
  const expected = applyRating(applyRating(null, 3, '2026-06-02'), 4, '2026-06-05');
  assert.equal(state!.due, expected.due);
  assert.equal(state!.stability, expected.stability);
});

test('ensureProblemStates is idempotent and skips already-stated problems', () => {
  const db = freshDb();
  const p = addProblem(db, makeProblem());
  insertReview(db, p.id, 3, '', '2026-06-02', '2026-06-05');
  ensureProblemStates(db);
  const first = getProblemState(db, p.id);
  ensureProblemStates(db); // second run must not change anything
  assert.deepEqual(getProblemState(db, p.id), first);
});

test('getForecast counts new, overdue, and upcoming due dates', () => {
  const db = freshDb();
  // never reviewed → counts as "new"
  addProblem(db, makeProblem({ title: 'New One' }));

  const overdue = addProblem(db, makeProblem({ title: 'Overdue' }));
  insertReview(db, overdue.id, 1, '', '2026-05-01', '2026-05-02');

  const upcoming = addProblem(db, makeProblem({ title: 'Upcoming' }));
  insertReview(db, upcoming.id, 5, '', '2026-06-01', '2026-06-20');

  ensureProblemStates(db);

  const today = '2026-06-02';
  const f = getForecast(db, today, '2026-09-01');
  assert.equal(f.newCount, 1, 'one never-reviewed problem');
  assert.equal(f.overdue, 1, 'one problem due before today');
  const totalUpcoming = f.upcoming.reduce((s, u) => s + u.count, 0);
  assert.equal(totalUpcoming, 1, 'one problem due within the window');
});
