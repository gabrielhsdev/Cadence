import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toIso, todayIso, addDaysIso, parseIsoLocal } from './dateUtils';

test('toIso formats a Date as local YYYY-MM-DD', () => {
  // Construct with local components so the assertion is timezone-independent.
  assert.equal(toIso(new Date(2026, 5, 2)), '2026-06-02');
  assert.equal(toIso(new Date(2026, 11, 9)), '2026-12-09');
});

test('todayIso matches toIso(new Date())', () => {
  assert.equal(todayIso(), toIso(new Date()));
});

test('parseIsoLocal yields the same calendar day in any timezone (no UTC shift)', () => {
  const d = parseIsoLocal('2026-06-04');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 5); // June (0-based)
  assert.equal(d.getDate(), 4); // must stay the 4th, not roll back to the 3rd
  // Round-trips with toIso regardless of the host timezone.
  assert.equal(toIso(parseIsoLocal('2026-12-31')), '2026-12-31');
});

test('addDaysIso does whole-day arithmetic across month and year boundaries', () => {
  assert.equal(addDaysIso('2026-06-02', 3), '2026-06-05');
  assert.equal(addDaysIso('2026-06-28', 7), '2026-07-05');
  assert.equal(addDaysIso('2026-12-29', 7), '2027-01-05');
  assert.equal(addDaysIso('2026-06-02', 0), '2026-06-02');
});
