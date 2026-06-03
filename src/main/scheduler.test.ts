import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyRating, replayHistory, addDaysIso, RATING_TO_GRADE } from './scheduler';

const TODAY = '2026-06-02';

test('a new problem becomes due in the future after a passing rating', () => {
  const s = applyRating(null, 3, TODAY);
  assert.ok(s.due > TODAY, 'next due date is after today');
  assert.ok(s.stability > 0, 'stability is initialised');
  assert.equal(s.last_reviewed_at, TODAY);
});

test('higher ratings schedule further out (1 ≤ 3 ≤ 5)', () => {
  const again = applyRating(null, 1, TODAY);
  const good = applyRating(null, 3, TODAY);
  const easy = applyRating(null, 5, TODAY);
  assert.ok(again.due <= good.due, 'Again is not later than Good');
  assert.ok(good.due <= easy.due, 'Good is not later than Easy');
});

test('ratings 4 and 5 are equivalent (both map to Easy)', () => {
  assert.deepEqual(applyRating(null, 4, TODAY), applyRating(null, 5, TODAY));
});

test('stability grows across repeated successes', () => {
  let s = applyRating(null, 3, TODAY);
  const first = s.stability;
  // Review again on each due date with a passing grade.
  for (let i = 0; i < 3; i++) s = applyRating(s, 3, s.due);
  assert.ok(s.stability > first, 'repeated Good reviews increase stability');
});

test('a lapse (Again) shortens the next interval versus a pass', () => {
  const mature = applyRating(applyRating(null, 4, TODAY), 4, '2026-06-20');
  const afterPass = applyRating(mature, 3, mature.due);
  const afterLapse = applyRating(mature, 1, mature.due);
  assert.ok(afterLapse.due < afterPass.due, 'Again reschedules sooner than Good');
  assert.ok(afterLapse.lapses >= 1, 'a lapse is recorded');
});

test('replayHistory folds a sequence into the same state as stepwise calls', () => {
  const seq = [
    { rating: 3, reviewed_at: '2026-06-02' },
    { rating: 4, reviewed_at: '2026-06-06' },
    { rating: 2, reviewed_at: '2026-06-09' },
  ];
  let stepwise = applyRating(null, seq[0].rating, seq[0].reviewed_at);
  stepwise = applyRating(stepwise, seq[1].rating, seq[1].reviewed_at);
  stepwise = applyRating(stepwise, seq[2].rating, seq[2].reviewed_at);
  assert.deepEqual(replayHistory(seq), stepwise);
});

test('replayHistory returns null for an empty history', () => {
  assert.equal(replayHistory([]), null);
});

test('scheduling is deterministic (fuzz disabled)', () => {
  assert.deepEqual(applyRating(null, 3, TODAY), applyRating(null, 3, TODAY));
});

test('throws on a rating with no grade mapping', () => {
  assert.throws(() => applyRating(null, 9, TODAY), /No FSRS grade mapping/);
});

test('RATING_TO_GRADE covers all five ratings', () => {
  assert.deepEqual(Object.keys(RATING_TO_GRADE).sort(), ['1', '2', '3', '4', '5']);
});

test('addDaysIso does whole-day arithmetic across month boundaries', () => {
  assert.equal(addDaysIso('2026-06-02', 3), '2026-06-05');
  assert.equal(addDaysIso('2026-06-28', 7), '2026-07-05');
  assert.equal(addDaysIso('2026-12-29', 7), '2027-01-05');
});
