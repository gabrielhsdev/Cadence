import Database from 'better-sqlite3';

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT    NOT NULL,
      topic        TEXT    NOT NULL,
      difficulty   TEXT    NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
      leetcode_url TEXT    NOT NULL,
      list_name    TEXT    NOT NULL,
      UNIQUE (title, leetcode_url)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id     INTEGER NOT NULL REFERENCES problems(id),
      rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      notes          TEXT    NOT NULL DEFAULT '',
      reviewed_at    TEXT    NOT NULL,
      next_review_at TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_queues (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_date TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS daily_queue_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_id   INTEGER NOT NULL REFERENCES daily_queues(id),
      problem_id INTEGER NOT NULL REFERENCES problems(id),
      status     TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'completed', 'skipped'))
    );

    CREATE TABLE IF NOT EXISTS topic_settings (
      topic            TEXT    PRIMARY KEY,
      enabled          INTEGER NOT NULL DEFAULT 1,
      problems_per_day INTEGER NOT NULL DEFAULT 2
    );

    CREATE TABLE IF NOT EXISTS difficulty_settings (
      id     INTEGER PRIMARY KEY CHECK (id = 1),
      easy   INTEGER NOT NULL DEFAULT 0,
      medium INTEGER NOT NULL DEFAULT 1,
      hard   INTEGER NOT NULL DEFAULT 1
    );

    INSERT OR IGNORE INTO difficulty_settings (id, easy, medium, hard)
    VALUES (1, 0, 1, 1);
  `);
}
