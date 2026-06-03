import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { initSchema } from './schema';
import { addProblem, getEligibleProblems } from './problems';
import { insertReview } from './reviews';
import { upsertProblemState } from './state';
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

// Set a problem's FSRS state directly so eligibility tests can pin a due date.
function setDue(db: Database.Database, problemId: number, due: string): void {
  const state: ProblemState = {
    problem_id: problemId,
    stability: 10,
    difficulty: 5,
    due,
    last_reviewed_at: '2026-06-02',
    scheduled_days: 7,
    reps: 1,
    lapses: 0,
    state: 2,
  };
  upsertProblemState(db, state);
}

test('a never-reviewed problem is eligible', () => {
  const db = freshDb();
  const p = addProblem(db, makeProblem());
  const eligible = getEligibleProblems(db, 'Arrays', '2026-06-02', ['Medium'], []);
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].id, p.id);
});

test('difficulty filter excludes disabled difficulties', () => {
  const db = freshDb();
  addProblem(db, makeProblem({ difficulty: 'Easy' }));
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-02', ['Medium', 'Hard'], []).length, 0);
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-02', ['Easy'], []).length, 1);
});

test('an empty enabled-difficulty list yields nothing', () => {
  const db = freshDb();
  addProblem(db, makeProblem());
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-02', [], []).length, 0);
});

test('excludeIds removes a problem from the pool', () => {
  const db = freshDb();
  const p = addProblem(db, makeProblem());
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-02', ['Medium'], [p.id]).length, 0);
});

test('a problem is not eligible until its due date arrives', () => {
  const db = freshDb();
  const p = addProblem(db, makeProblem());
  setDue(db, p.id, '2026-06-09');
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-05', ['Medium'], []).length, 0, 'before due');
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-09', ['Medium'], []).length, 1, 'on due date');
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-10', ['Medium'], []).length, 1, 'overdue');
});

// Due-ness comes from problem_state.due, not from the reviews log. A stale
// reviews row must not make a problem eligible if its FSRS state says otherwise.
test('eligibility reads problem_state.due, not reviews.next_review_at', () => {
  const db = freshDb();
  const p = addProblem(db, makeProblem());
  // An old review row that (under the legacy scheduler) would say due 06-03…
  insertReview(db, p.id, 1, '', '2026-06-02', '2026-06-03');
  // …but the FSRS state says it's parked until 06-20.
  setDue(db, p.id, '2026-06-20');
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-05', ['Medium'], []).length, 0);
});

test('active-list filter restricts the pool to members of that list', () => {
  const db = freshDb();
  addProblem(db, makeProblem({ list_name: 'Blind 75' }));
  // Member of its list → included.
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-02', ['Medium'], [], 'Blind 75').length, 1);
  // Not a member of a different list → excluded.
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-02', ['Medium'], [], 'NeetCode 150').length, 0);
  // '' = All Problems → no list filter.
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-02', ['Medium'], [], '').length, 1);
});
