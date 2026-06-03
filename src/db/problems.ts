import Database from 'better-sqlite3';
import { Difficulty, NewProblem, Problem } from '../types';
import { ensureTopicSetting, DEFAULT_PROBLEMS_PER_DAY } from './settings';

export function getAllProblems(db: Database.Database): Problem[] {
  return db.prepare('SELECT * FROM problems ORDER BY topic, title').all() as Problem[];
}

export function searchProblems(db: Database.Database, query: string): Problem[] {
  const like = `%${query}%`;
  return db
    .prepare('SELECT * FROM problems WHERE title LIKE ? OR topic LIKE ? ORDER BY topic, title')
    .all(like, like) as Problem[];
}

export function getProblemListNames(db: Database.Database): { id: number; list_name: string }[] {
  return db.prepare('SELECT id, list_name FROM problems').all() as {
    id: number;
    list_name: string;
  }[];
}

export function getProblemById(db: Database.Database, id: number): Problem | undefined {
  return db.prepare('SELECT * FROM problems WHERE id = ?').get(id) as Problem | undefined;
}

export function getEligibleProblems(
  db: Database.Database,
  topic: string,
  today: string,
  enabledDifficulties: Difficulty[],
  excludeIds: number[],
  activeList = ''
): Problem[] {
  if (enabledDifficulties.length === 0) return [];

  const diffPlaceholders = enabledDifficulties.map(() => '?').join(', ');
  // Use -1 sentinel instead of NULL so NOT IN (...) never hits the SQL NULL trap
  // (x NOT IN (NULL) is UNKNOWN, not TRUE, and silently filters every row)
  const excludePlaceholders = excludeIds.length > 0 ? excludeIds.map(() => '?').join(', ') : '-1';

  // '' = All Problems → no list filter. Otherwise restrict to members of the active list.
  const listClause = activeList
    ? 'AND EXISTS (SELECT 1 FROM problem_lists pl WHERE pl.problem_id = p.id AND pl.list_name = ?)'
    : '';

  // "Due" is the single source of truth in problem_state.due. A problem with no
  // problem_state row has never been reviewed → always due.
  const sql = `
    SELECT p.*
    FROM problems p
    LEFT JOIN problem_state ps ON ps.problem_id = p.id
    WHERE p.topic = ?
      AND p.difficulty IN (${diffPlaceholders})
      AND (ps.due IS NULL OR ps.due <= ?)
      AND p.id NOT IN (${excludePlaceholders})
      ${listClause}
    ORDER BY RANDOM()
  `;

  const params: (string | number)[] = [topic, ...enabledDifficulties, today, ...excludeIds];
  if (activeList) params.push(activeList);
  return db.prepare(sql).all(...params) as Problem[];
}

// Distinct list names available to pick from (drives the Settings dropdown).
export function getAvailableLists(db: Database.Database): string[] {
  return (
    db.prepare('SELECT DISTINCT list_name FROM problem_lists ORDER BY list_name').all() as {
      list_name: string;
    }[]
  ).map((r) => r.list_name);
}

// Backfill membership rows from the legacy single list_name column. Idempotent.
export function backfillProblemLists(db: Database.Database): void {
  db.prepare(
    'INSERT OR IGNORE INTO problem_lists (problem_id, list_name) SELECT id, list_name FROM problems'
  ).run();
}

export function addProblem(db: Database.Database, problem: NewProblem): Problem {
  const stmt = db.prepare(`
    INSERT INTO problems (title, topic, difficulty, leetcode_url, list_name)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    problem.title,
    problem.topic,
    problem.difficulty,
    problem.leetcode_url,
    problem.list_name
  );
  // Auto-register the topic so a brand-new topic is schedulable right away.
  ensureTopicSetting(db, problem.topic, DEFAULT_PROBLEMS_PER_DAY);
  const id = result.lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO problem_lists (problem_id, list_name) VALUES (?, ?)').run(
    id,
    problem.list_name
  );
  return getProblemById(db, id) as Problem;
}

export function upsertProblem(db: Database.Database, problem: NewProblem): void {
  db.prepare(`
    INSERT INTO problems (title, topic, difficulty, leetcode_url, list_name)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (title, leetcode_url) DO NOTHING
  `).run(problem.title, problem.topic, problem.difficulty, problem.leetcode_url, problem.list_name);

  // Record list membership even if the problem already existed (so the same URL
  // appearing in multiple list arrays — e.g. 75 ⊂ 150 — accrues all memberships).
  const row = db
    .prepare('SELECT id FROM problems WHERE title = ? AND leetcode_url = ?')
    .get(problem.title, problem.leetcode_url) as { id: number } | undefined;
  if (row) {
    db.prepare('INSERT OR IGNORE INTO problem_lists (problem_id, list_name) VALUES (?, ?)').run(
      row.id,
      problem.list_name
    );
  }
}
