/**
 * Isolated scheduling module — swap this out to implement FSRS or any other algorithm.
 * All scheduling decisions are made here and nowhere else.
 */

const RATING_TO_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 7,
};

export function getNextReviewDate(rating: number, fromDate: string): string {
  const days = RATING_TO_DAYS[rating];
  if (days === undefined) throw new Error(`Invalid rating: ${rating}`);
  const date = new Date(fromDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}
