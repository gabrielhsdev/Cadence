import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toIso, todayIso, addDaysIso } from './dateUtils';

test('toIso formats a Date as local YYYY-MM-DD', () => {
  // Construct with local components so the assertion is timezone-independent.
  assert.equal(toIso(new Date(2026, 5, 2)), '2026-06-02');
  assert.equal(toIso(new Date(2026, 11, 9)), '2026-12-09');
});

test('todayIso matches toIso(new Date())', () => {
  assert.equal(todayIso(), toIso(new Date()));
});

test('addDaysIso does whole-day arithmetic across month and year boundaries', () => {
  assert.equal(addDaysIso('2026-06-02', 3), '2026-06-05');
  assert.equal(addDaysIso('2026-06-28', 7), '2026-07-05');
  assert.equal(addDaysIso('2026-12-29', 7), '2027-01-05');
  assert.equal(addDaysIso('2026-06-02', 0), '2026-06-02');
});
