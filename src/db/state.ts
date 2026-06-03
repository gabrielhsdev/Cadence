import Database from 'better-sqlite3';
import { ProblemState, ReviewForecast } from '../types';

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

// Count of problems due on each day from `today` through `endIso` (inclusive),
// plus overdue and never-reviewed ("new") totals. Drives the Forecast calendar.
export function getForecast(
  db: Database.Database,
  today: string,
  endIso: string
): ReviewForecast {
  const upcoming = db
    .prepare(`
      SELECT due AS date, COUNT(*) AS count
      FROM problem_state
      WHERE due >= ? AND due <= ?
      GROUP BY due
      ORDER BY due
    `)
    .all(today, endIso) as { date: string; count: number }[];

  const overdue = (
    db.prepare('SELECT COUNT(*) AS n FROM problem_state WHERE due < ?').get(today) as { n: number }
  ).n;

  const totalProblems = (
    db.prepare('SELECT COUNT(*) AS n FROM problems').get() as { n: number }
  ).n;
  const withState = (
    db.prepare('SELECT COUNT(*) AS n FROM problem_state').get() as { n: number }
  ).n;

  return { overdue, newCount: totalProblems - withState, upcoming };
}
