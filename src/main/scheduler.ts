/**
 * SINGLE SOURCE OF TRUTH for scheduling — now backed by FSRS.
 *
 * All review-timing logic lives here and nowhere else. The algorithm is FSRS
 * (via the `ts-fsrs` library); per-problem memory state (stability/difficulty/…)
 * is persisted in the problem_state table and passed in/out as SchedulerState.
 *
 * To swap algorithms again, replace this file: `applyRating` is the only place a
 * next-review date and memory state are ever computed.
 */
import { fsrs, createEmptyCard, Rating, State, type Card, type Grade } from 'ts-fsrs';
import { SchedulerState } from '../types';

// Desired probability of recall at review time. Lower = fewer, later reviews;
// higher = more, earlier reviews. FSRS's standard default is 0.9.
export const REQUEST_RETENTION = 0.9;

// Maps the app's 1–5 rating to FSRS's 4-grade scale. This is the ONE place the
// mapping lives — change it here to change how ratings feel.
//   1 Could not solve     → Again
//   2 Barely recalled     → Hard
//   3 Solved with difficulty → Good
//   4 Solved comfortably  → Easy
//   5 Solved immediately  → Easy
export const RATING_TO_GRADE: Record<number, Grade> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
  5: Rating.Easy,
};

const engine = fsrs({
  request_retention: REQUEST_RETENTION,
  enable_fuzz: false, // deterministic intervals (reproducible + testable)
  enable_short_term: false, // schedule in whole days; skip sub-day learning steps
});

// ── SchedulerState ⇄ ts-fsrs Card ────────────────────────────────────────────

function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toCard(s: SchedulerState): Card {
  return {
    due: parseDay(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: 0, // recomputed by the engine from last_review
    scheduled_days: s.scheduled_days,
    learning_steps: 0,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state as State,
    last_review: parseDay(s.last_reviewed_at),
  };
}

function fromCard(c: Card): SchedulerState {
  return {
    stability: c.stability,
    difficulty: c.difficulty,
    due: formatDay(c.due),
    last_reviewed_at: formatDay(c.last_review ?? c.due),
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Apply a rating on `todayIso` to a problem's prior state (or null for a
 * never-reviewed problem) and return its new FSRS state. The next due date is
 * `result.due` (YYYY-MM-DD).
 */
export function applyRating(
  prev: SchedulerState | null,
  rating: number,
  todayIso: string
): SchedulerState {
  const grade = RATING_TO_GRADE[rating];
  if (grade === undefined) throw new Error(`No FSRS grade mapping for rating: ${rating}`);
  const now = parseDay(todayIso);
  const card: Card = prev ? toCard(prev) : createEmptyCard(now);
  const { card: next } = engine.next(card, now, grade);
  return fromCard(next);
}

/**
 * Rebuild a problem's current FSRS state by replaying its review history in
 * order. Returns null for an empty history. Used to backfill problem_state for
 * pre-FSRS or imported reviews.
 */
export function replayHistory(
  reviews: { rating: number; reviewed_at: string }[]
): SchedulerState | null {
  let state: SchedulerState | null = null;
  for (const r of reviews) state = applyRating(state, r.rating, r.reviewed_at);
  return state;
}
