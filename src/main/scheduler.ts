/**
 * SINGLE SOURCE OF TRUTH for scheduling.
 *
 * Two things live here and NOWHERE else:
 *   1. DEFAULT_RATING_INTERVALS — the canonical default "rating → days" mapping.
 *      The rating_intervals DB table is seeded from this (see ensureRatingIntervals);
 *      the schema must never hardcode these numbers.
 *   2. getNextReviewDate() — the only place a next-review date is ever computed.
 *
 * The DB stores the *currently configured* intervals (data); this file owns the
 * defaults and the math (logic). To swap in FSRS or any other algorithm later,
 * replace this file — no scheduling logic exists outside it.
 */
import { RatingIntervals } from '../types';

export const DEFAULT_RATING_INTERVALS: RatingIntervals = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 7,
};

export function getNextReviewDate(
  rating: number,
  fromDate: string,
  intervals: RatingIntervals = DEFAULT_RATING_INTERVALS
): string {
  const days = intervals[rating];
  if (days === undefined) throw new Error(`No interval configured for rating: ${rating}`);
  const date = new Date(fromDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

// Today's calendar date in the user's LOCAL timezone as YYYY-MM-DD.
// (Not toISOString(), which is UTC and would roll "today" over at the wrong
// local hour for anyone not on UTC.) Date-only arithmetic in getNextReviewDate
// stays in UTC on the resulting string, which is correct for whole-day offsets.
export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
