import Database from 'better-sqlite3';
import { Review, ReviewHistoryEntry } from '../types';

export function insertReview(
  db: Database.Database,
  problemId: number,
  rating: number,
  notes: string,
  reviewedAt: string,
  nextReviewAt: string
): Review {
  const result = db
    .prepare(`
      INSERT INTO reviews (problem_id, rating, notes, reviewed_at, next_review_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(problemId, rating, notes, reviewedAt, nextReviewAt);

  return db
    .prepare('SELECT * FROM reviews WHERE id = ?')
    .get(result.lastInsertRowid) as Review;
}

export function getLatestReviewForProblem(
  db: Database.Database,
  problemId: number
): Review | undefined {
  return db
    .prepare('SELECT * FROM reviews WHERE problem_id = ? ORDER BY id DESC LIMIT 1')
    .get(problemId) as Review | undefined;
}

// All reviews for one problem in chronological (id) order — used to replay an
// FSRS state when backfilling problem_state for pre-existing history.
export function getReviewsForProblem(db: Database.Database, problemId: number): Review[] {
  return db
    .prepare('SELECT * FROM reviews WHERE problem_id = ? ORDER BY id')
    .all(problemId) as Review[];
}

export function getProblemsReviewedToday(db: Database.Database, today: string): number[] {
  const rows = db
    .prepare('SELECT DISTINCT problem_id FROM reviews WHERE reviewed_at = ?')
    .all(today) as { problem_id: number }[];
  return rows.map((r) => r.problem_id);
}

export function getReviewHistory(db: Database.Database): ReviewHistoryEntry[] {
  return db
    .prepare(`
      SELECT
        r.id        AS review_id,
        r.problem_id,
        p.title,
        p.topic,
        p.difficulty,
        p.leetcode_url,
        r.rating,
        r.notes,
        r.reviewed_at,
        r.next_review_at
      FROM reviews r
      JOIN problems p ON p.id = r.problem_id
      ORDER BY r.reviewed_at DESC, r.id DESC
    `)
    .all() as ReviewHistoryEntry[];
}

export function resetAllProgress(db: Database.Database): void {
  db.transaction(() => {
    db.prepare('DELETE FROM daily_queue_items').run();
    db.prepare('DELETE FROM daily_queues').run();
    db.prepare('DELETE FROM reviews').run();
  })();
}

export function importReviews(
  db: Database.Database,
  rows: Array<{
    leetcode_url: string;
    title: string;
    topic: string;
    difficulty: string;
    list_name: string;
    rating: number;
    notes: string;
    reviewed_at: string;
    next_review_at: string;
  }>
): { imported: number; skipped: number } {
  let imported = 0;
  let skipped = 0;

  const findProblem = db.prepare('SELECT id FROM problems WHERE leetcode_url = ? LIMIT 1');
  const insertProblem = db.prepare(`
    INSERT INTO problems (title, topic, difficulty, leetcode_url, list_name)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertRev = db.prepare(`
    INSERT INTO reviews (problem_id, rating, notes, reviewed_at, next_review_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const checkDuplicate = db.prepare(`
    SELECT id FROM reviews
    WHERE problem_id = ? AND reviewed_at = ? AND rating = ?
    LIMIT 1
  `);

  const tx = db.transaction(() => {
    for (const row of rows) {
      // Basic validation
      const rating = Number(row.rating);
      if (!row.reviewed_at || !row.next_review_at || isNaN(rating) || rating < 1 || rating > 5) {
        skipped++;
        continue;
      }

      // Resolve or create the problem
      let problemId: number;
      const existing = findProblem.get(row.leetcode_url) as { id: number } | undefined;
      if (existing) {
        problemId = existing.id;
      } else {
        const res = insertProblem.run(
          row.title || 'Unknown',
          row.topic || 'Unknown',
          ['Easy', 'Medium', 'Hard'].includes(row.difficulty) ? row.difficulty : 'Medium',
          row.leetcode_url,
          row.list_name || 'Imported'
        );
        problemId = res.lastInsertRowid as number;
      }

      // Skip exact duplicates (same problem + same date + same rating)
      const dup = checkDuplicate.get(problemId, row.reviewed_at, rating);
      if (dup) {
        skipped++;
        continue;
      }

      insertRev.run(problemId, rating, row.notes ?? '', row.reviewed_at, row.next_review_at);
      imported++;
    }
  });

  tx();
  return { imported, skipped };
}
