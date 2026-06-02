import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { initSchema } from './schema';
import { addProblem, getEligibleProblems } from './problems';
import { insertReview } from './reviews';
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

test('a problem is not eligible until its next_review_at date arrives', () => {
  const db = freshDb();
  const p = addProblem(db, makeProblem());
  insertReview(db, p.id, 5, '', '2026-06-02', '2026-06-09');
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-05', ['Medium'], []).length, 0, 'before due');
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-09', ['Medium'], []).length, 1, 'on due date');
  assert.equal(getEligibleProblems(db, 'Arrays', '2026-06-10', ['Medium'], []).length, 1, 'overdue');
});

// Guards fix #1: "latest review" must be decided by id, not by the date-only
// reviewed_at, so two reviews on the same day resolve deterministically.
test('eligibility uses the latest review by id, not by reviewed_at', () => {
  const db = freshDb();
  const p = addProblem(db, makeProblem());
  // Same day, two reviews. The LATER one (higher id) pushes the due date far out.
  insertReview(db, p.id, 1, 'first', '2026-06-02', '2026-06-03');
  insertReview(db, p.id, 5, 'second', '2026-06-02', '2026-06-20');
  // On 06-05 the latest review (id-wise) says due 06-20 → not eligible.
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
