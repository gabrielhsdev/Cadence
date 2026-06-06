import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { initSchema } from './schema';
import { addProblem } from './problems';
import { insertReview } from './reviews';
import { getProblemState, upsertProblemState, getMonthForecast, getOverdueProblems } from './state';
import { ensureProblemStates } from '../main/backfill';
import { applyRating } from '../main/scheduler';
import { NewProblem, ProblemState } from '../types';

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

function setDue(db: Database.Database, problemId: number, due: string): void {
  const s: ProblemState = {
    problem_id: problemId,
    stability: 10,
    difficulty: 5,
    due,
    last_reviewed_at: '2026-06-01',
    scheduled_days: 7,
    reps: 1,
    lapses: 0,
    state: 2,
  };
  upsertProblemState(db, s);
}

test('getMonthForecast groups due (future) and solved (past) by day', () => {
  const db = freshDb();
  addProblem(db, makeProblem({ title: 'New' })); // never reviewed → newCount

  const over = addProblem(db, makeProblem({ title: 'Over' }));
  setDue(db, over.id, '2026-06-01'); // before today → overdue, not on a day cell

  const fut = addProblem(db, makeProblem({ title: 'Fut' }));
  setDue(db, fut.id, '2026-06-20'); // future, in month → due list

  const past = addProblem(db, makeProblem({ title: 'Past' }));
  setDue(db, past.id, '2026-07-05'); // its next due is next month
  insertReview(db, past.id, 4, '', '2026-06-10', '2026-07-05'); // solved on 06-10

  const f = getMonthForecast(db, '2026-06', '2026-06-15');
  assert.equal(f.overdue, 1, 'one problem overdue');
  assert.equal(f.newCount, 1, 'one never-reviewed problem');
  assert.equal(f.days['2026-06-20'].due.length, 1, 'future due pinned to its day');
  assert.equal(f.days['2026-06-20'].due[0].title, 'Fut');
  assert.equal(f.days['2026-06-10'].reviewed.length, 1, 'past review pinned to its day');
  assert.equal(f.days['2026-06-10'].reviewed[0].rating, 4);
  assert.equal(f.days['2026-06-01'], undefined, 'overdue not shown as a past due cell');
});

test('getOverdueProblems lists due-before-today, most overdue first', () => {
  const db = freshDb();
  const a = addProblem(db, makeProblem({ title: 'A' }));
  const b = addProblem(db, makeProblem({ title: 'B' }));
  const future = addProblem(db, makeProblem({ title: 'Future' }));
  setDue(db, a.id, '2026-06-01');
  setDue(db, b.id, '2026-05-20');
  setDue(db, future.id, '2026-06-20');

  const list = getOverdueProblems(db, '2026-06-15');
  assert.equal(list.length, 2, 'future-due problem excluded');
  assert.equal(list[0].title, 'B', 'oldest due first');
  assert.equal(list[0].due, '2026-05-20');
  assert.equal(list[1].title, 'A');
});
