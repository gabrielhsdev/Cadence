// Single source of truth for how the 1–5 self-rating is PRESENTED across the UI
// (review modal, history, forecast). Previously each screen had its own divergent
// label set, so the same rating read differently in different places.
//
// Note: this is presentation only. How a rating maps to the FSRS algorithm lives
// separately in src/main/scheduler.ts (RATING_TO_GRADE).
export interface RatingMeta {
  value: number;
  label: string; // short, for pills/badges (history, forecast)
  description: string; // sentence, for the review modal
  color: string; // CSS var or hex, for colored pills
}

export const RATINGS: readonly RatingMeta[] = [
  { value: 1, label: "Couldn't solve", description: "Couldn't solve it", color: 'var(--hard)' },
  { value: 2, label: 'Barely', description: 'Barely recalled it', color: '#c07030' },
  { value: 3, label: 'With effort', description: 'Solved with effort', color: 'var(--medium)' },
  { value: 4, label: 'Comfortably', description: 'Solved comfortably', color: '#60a060' },
  { value: 5, label: 'Instantly', description: 'Solved instantly', color: 'var(--easy)' },
];

const byValue = new Map(RATINGS.map((r) => [r.value, r]));

export const ratingLabel = (n: number): string => byValue.get(n)?.label ?? '';
export const ratingColor = (n: number): string => byValue.get(n)?.color ?? 'var(--text)';
