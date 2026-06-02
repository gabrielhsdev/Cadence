import Database from 'better-sqlite3';
import { Difficulty, NewProblem, Problem } from '../types';

export function getAllProblems(db: Database.Database): Problem[] {
  return db.prepare('SELECT * FROM problems ORDER BY topic, title').all() as Problem[];
}

export function searchProblems(db: Database.Database, query: string): Problem[] {
  const like = `%${query}%`;
  return db
    .prepare('SELECT * FROM problems WHERE title LIKE ? OR topic LIKE ? ORDER BY topic, title')
    .all(like, like) as Problem[];
}

export function getProblemById(db: Database.Database, id: number): Problem | undefined {
  return db.prepare('SELECT * FROM problems WHERE id = ?').get(id) as Problem | undefined;
}

export function getEligibleProblems(
  db: Database.Database,
  topic: string,
  today: string,
  enabledDifficulties: Difficulty[],
  excludeIds: number[]
): Problem[] {
  if (enabledDifficulties.length === 0) return [];

  const diffPlaceholders = enabledDifficulties.map(() => '?').join(', ');
  // Use -1 sentinel instead of NULL so NOT IN (...) never hits the SQL NULL trap
  // (x NOT IN (NULL) is UNKNOWN, not TRUE, and silently filters every row)
  const excludePlaceholders = excludeIds.length > 0 ? excludeIds.map(() => '?').join(', ') : '-1';

  const sql = `
    SELECT p.*
    FROM problems p
    LEFT JOIN (
      SELECT r.problem_id, r.next_review_at
      FROM reviews r
      WHERE r.id IN (SELECT MAX(id) FROM reviews GROUP BY problem_id)
    ) latest ON p.id = latest.problem_id
    WHERE p.topic = ?
      AND p.difficulty IN (${diffPlaceholders})
      AND (latest.next_review_at IS NULL OR latest.next_review_at <= ?)
      AND p.id NOT IN (${excludePlaceholders})
    ORDER BY RANDOM()
  `;

  const params: (string | number)[] = [topic, ...enabledDifficulties, today, ...excludeIds];
  return db.prepare(sql).all(...params) as Problem[];
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
  return getProblemById(db, result.lastInsertRowid as number) as Problem;
}

export function upsertProblem(db: Database.Database, problem: NewProblem): void {
  db.prepare(`
    INSERT INTO problems (title, topic, difficulty, leetcode_url, list_name)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (title, leetcode_url) DO NOTHING
  `).run(problem.title, problem.topic, problem.difficulty, problem.leetcode_url, problem.list_name);
}
