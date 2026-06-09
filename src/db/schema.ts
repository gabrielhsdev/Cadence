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

    -- LEGACY (unused since the FSRS migration). Scheduling now lives in
    -- problem_state + src/main/scheduler.ts; this table is no longer read or
    -- written. Kept (not dropped) to avoid a destructive schema change on
    -- existing databases. Safe to remove in a future migration.
    CREATE TABLE IF NOT EXISTS rating_intervals (
      rating INTEGER PRIMARY KEY CHECK (rating BETWEEN 1 AND 5),
      days   INTEGER NOT NULL CHECK (days >= 1)
    );

    -- Many-to-many: a problem can belong to several lists (e.g. Blind 75 is a
    -- subset of NeetCode 150). One row per (problem, list) membership.
    CREATE TABLE IF NOT EXISTS problem_lists (
      problem_id INTEGER NOT NULL REFERENCES problems(id),
      list_name  TEXT    NOT NULL,
      PRIMARY KEY (problem_id, list_name)
    );

    -- The single active list the daily queue draws from. '' = All Problems (no filter).
    CREATE TABLE IF NOT EXISTS list_settings (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      active_list TEXT    NOT NULL DEFAULT ''
    );

    INSERT OR IGNORE INTO list_settings (id, active_list) VALUES (1, '');

    -- FSRS per-problem memory state (one row per problem, created on first
    -- review). Mirrors a ts-fsrs Card flattened to columns; the scheduler in
    -- src/main/scheduler.ts reads/writes it. A problem with NO row here has
    -- never been reviewed (a "new" card). Dates are YYYY-MM-DD.
    CREATE TABLE IF NOT EXISTS problem_state (
      problem_id       INTEGER PRIMARY KEY REFERENCES problems(id),
      stability        REAL    NOT NULL,
      difficulty       REAL    NOT NULL,
      due              TEXT    NOT NULL,
      last_reviewed_at TEXT    NOT NULL,
      scheduled_days   INTEGER NOT NULL DEFAULT 0,
      reps             INTEGER NOT NULL DEFAULT 0,
      lapses           INTEGER NOT NULL DEFAULT 0,
      state            INTEGER NOT NULL DEFAULT 0
    );

    -- Generic key/value store for scalar app preferences the main process reads
    -- (e.g. max_interval_days). Add new keys here instead of new tables.
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
