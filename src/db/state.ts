import Database from 'better-sqlite3';
import { MonthForecast, OverdueProblem, Problem, ProblemState } from '../types';
import { addDaysIso } from '../dateUtils';

export function getProblemState(db: Database.Database, problemId: number): ProblemState | undefined {
  return db
    .prepare('SELECT * FROM problem_state WHERE problem_id = ?')
    .get(problemId) as ProblemState | undefined;
}

export function upsertProblemState(db: Database.Database, s: ProblemState): void {
  db.prepare(`
    INSERT INTO problem_state
      (problem_id, stability, difficulty, due, last_reviewed_at, scheduled_days, reps, lapses, state)
    VALUES
      (@problem_id, @stability, @difficulty, @due, @last_reviewed_at, @scheduled_days, @reps, @lapses, @state)
    ON CONFLICT (problem_id) DO UPDATE SET
      stability        = excluded.stability,
      difficulty       = excluded.difficulty,
      due              = excluded.due,
      last_reviewed_at = excluded.last_reviewed_at,
      scheduled_days   = excluded.scheduled_days,
      reps             = excluded.reps,
      lapses           = excluded.lapses,
      state            = excluded.state
  `).run(s);
}

// Problems that have reviews but no FSRS state row yet — used to backfill state
// for pre-FSRS / imported history by replaying each one's review sequence.
export function getProblemIdsNeedingState(db: Database.Database): number[] {
  const rows = db
    .prepare(`
      SELECT DISTINCT problem_id
      FROM reviews
      WHERE problem_id NOT IN (SELECT problem_id FROM problem_state)
    `)
    .all() as { problem_id: number }[];
  return rows.map((r) => r.problem_id);
}

// Problems due before today (most overdue first). Independent of topic/difficulty
// filters, so it surfaces overdue problems even in disabled topics.
export function getOverdueProblems(db: Database.Database, today: string): OverdueProblem[] {
  return db
    .prepare(`
      SELECT p.*, ps.due AS due
      FROM problem_state ps
      JOIN problems p ON p.id = ps.problem_id
      WHERE ps.due < ?
      ORDER BY ps.due ASC, p.topic, p.title
    `)
    .all(today) as OverdueProblem[];
}

// When the max-interval cap is lowered, pull every problem whose due is beyond
// (today + cap) back into the [today, today+cap] window — stalest (oldest last
// review) first, spread evenly (~count/cap per day) to avoid a single-day spike
// or an overdue flood. Tighten-only: never pushes a due date further out, and
// only touches `due` (stability is left intact, mirroring FSRS's own cap). A
// no-cap value is a no-op since nothing is scheduled ~100 years out.
export function reclampDueDates(db: Database.Database, today: string, maxIntervalDays: number): void {
  const capDate = addDaysIso(today, maxIntervalDays);
  const rows = db
    .prepare(`
      SELECT problem_id FROM problem_state
      WHERE due > ?
      ORDER BY last_reviewed_at ASC, problem_id ASC
    `)
    .all(capDate) as { problem_id: number }[];
  if (rows.length === 0) return;

  const perDay = Math.ceil(rows.length / maxIntervalDays);
  const update = db.prepare('UPDATE problem_state SET due = ? WHERE problem_id = ?');
  db.transaction(() => {
    rows.forEach((row, i) => {
      const offset = Math.min(maxIntervalDays, Math.floor(i / perDay));
      update.run(addDaysIso(today, offset), row.problem_id);
    });
  })();
}

function firstOfNextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}

// One month of forecast data in a single query pass: for each day in `month`
// ('YYYY-MM'), the problems DUE that day (today/future) and the problems
// REVIEWED that day (past), plus global overdue / never-reviewed counts.
// Due dates before `today` are overdue (surfaced in the count, not pinned to a
// past day), so the due list starts at max(monthStart, today).
export function getMonthForecast(
  db: Database.Database,
  month: string,
  today: string
): MonthForecast {
  const monthStart = `${month}-01`;
  const nextMonthStart = firstOfNextMonth(month);
  const dueFrom = today > monthStart ? today : monthStart;

  const dueRows = db
    .prepare(`
      SELECT p.*, ps.due AS _date
      FROM problem_state ps
      JOIN problems p ON p.id = ps.problem_id
      WHERE ps.due >= ? AND ps.due < ?
      ORDER BY p.topic, p.title
    `)
    .all(dueFrom, nextMonthStart) as (Problem & { _date: string })[];

  const reviewedRows = db
    .prepare(`
      SELECT p.*, r.rating AS _rating, r.reviewed_at AS _date
      FROM reviews r
      JOIN problems p ON p.id = r.problem_id
      WHERE r.reviewed_at >= ? AND r.reviewed_at < ?
      ORDER BY r.id DESC
    `)
    .all(monthStart, nextMonthStart) as (Problem & { _rating: number; _date: string })[];

  const days: MonthForecast['days'] = {};
  const dayOf = (d: string): MonthForecast['days'][string] =>
    (days[d] ??= { due: [], reviewed: [] });
  for (const { _date, ...p } of dueRows) dayOf(_date).due.push(p);
  for (const { _date, _rating, ...p } of reviewedRows) {
    dayOf(_date).reviewed.push({ ...p, rating: _rating });
  }

  const overdue = (
    db.prepare('SELECT COUNT(*) AS n FROM problem_state WHERE due < ?').get(today) as { n: number }
  ).n;
  const totalProblems = (
    db.prepare('SELECT COUNT(*) AS n FROM problems').get() as { n: number }
  ).n;
  const withState = (
    db.prepare('SELECT COUNT(*) AS n FROM problem_state').get() as { n: number }
  ).n;

  return { overdue, newCount: totalProblems - withState, days };
}
