import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextReviewDate, DEFAULT_RATING_INTERVALS } from './scheduler';

const DEFAULTS = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7 };

test('adds the configured number of days for each rating', () => {
  assert.equal(getNextReviewDate(1, '2026-06-02', DEFAULTS), '2026-06-03');
  assert.equal(getNextReviewDate(3, '2026-06-02', DEFAULTS), '2026-06-05');
  assert.equal(getNextReviewDate(5, '2026-06-02', DEFAULTS), '2026-06-09');
});

test('crosses month and year boundaries correctly', () => {
  assert.equal(getNextReviewDate(5, '2026-06-28', DEFAULTS), '2026-07-05');
  assert.equal(getNextReviewDate(5, '2026-12-29', DEFAULTS), '2027-01-05');
});

test('respects custom (user-configured) intervals', () => {
  assert.equal(getNextReviewDate(3, '2026-06-02', { 3: 10 }), '2026-06-12');
});

test('throws when no interval is configured for the rating', () => {
  assert.throws(() => getNextReviewDate(9, '2026-06-02', DEFAULTS), /No interval configured/);
});

test('DEFAULT_RATING_INTERVALS is the single documented default mapping', () => {
  assert.deepEqual(DEFAULT_RATING_INTERVALS, DEFAULTS);
});

test('defaults to DEFAULT_RATING_INTERVALS when none are passed', () => {
  assert.equal(getNextReviewDate(5, '2026-06-02'), '2026-06-09');
});
