import Database from 'better-sqlite3';
import { getProblemIdsNeedingState, upsertProblemState } from '../db/state';
import { getReviewsForProblem } from '../db/reviews';
import { getMaxIntervalDays } from '../db/settings';
import { replayHistory } from './scheduler';

/**
 * Backfill FSRS state for any problem that has reviews but no problem_state row
 * (pre-FSRS data or CSV-imported history), by replaying its review sequence.
 * Idempotent: only touches problems missing a state row. No Electron deps, so
 * it's exercised directly by the SQLite test suite.
 */
export function ensureProblemStates(db: Database.Database): void {
  const ids = getProblemIdsNeedingState(db);
  if (ids.length === 0) return;
  const maxInterval = getMaxIntervalDays(db);
  const tx = db.transaction(() => {
    for (const problemId of ids) {
      const reviews = getReviewsForProblem(db, problemId);
      const state = replayHistory(reviews, maxInterval);
      if (state) upsertProblemState(db, { problem_id: problemId, ...state });
    }
  });
  tx();
}
