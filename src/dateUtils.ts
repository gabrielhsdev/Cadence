// Shared, dependency-free date helpers used across main, renderer, and tests.
// The app models everything as date-only YYYY-MM-DD strings in the user's LOCAL
// calendar; these are the only place that formatting/arithmetic lives.

// A Date's LOCAL calendar date as YYYY-MM-DD. (Not toISOString(), which is UTC
// and would roll over at the wrong local hour for anyone not on UTC.)
export function toIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Today's LOCAL calendar date as YYYY-MM-DD.
export function todayIso(): string {
  return toIso(new Date());
}

// Add `days` to a YYYY-MM-DD string, returning YYYY-MM-DD. Whole-day arithmetic
// done in UTC on the date label, so it's timezone-agnostic for day offsets.
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
