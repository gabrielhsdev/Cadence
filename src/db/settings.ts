import Database from 'better-sqlite3';
import { DifficultySettings, RatingIntervals, TopicSetting } from '../types';

export function getTopicSettings(db: Database.Database): TopicSetting[] {
  return db
    .prepare('SELECT topic, enabled, problems_per_day FROM topic_settings ORDER BY topic')
    .all()
    .map((row: unknown) => {
      const r = row as { topic: string; enabled: number; problems_per_day: number };
      return {
        topic: r.topic,
        enabled: r.enabled === 1,
        problems_per_day: r.problems_per_day,
      };
    });
}

export function upsertTopicSetting(db: Database.Database, setting: TopicSetting): void {
  db.prepare(`
    INSERT INTO topic_settings (topic, enabled, problems_per_day)
    VALUES (?, ?, ?)
    ON CONFLICT (topic) DO UPDATE SET
      enabled = excluded.enabled,
      problems_per_day = excluded.problems_per_day
  `).run(setting.topic, setting.enabled ? 1 : 0, setting.problems_per_day);
}

export const DEFAULT_PROBLEMS_PER_DAY = 2;

export function ensureTopicSetting(
  db: Database.Database,
  topic: string,
  defaultPerDay: number
): void {
  db.prepare(`
    INSERT OR IGNORE INTO topic_settings (topic, enabled, problems_per_day)
    VALUES (?, 1, ?)
  `).run(topic, defaultPerDay);
}

// Guarantee every topic present in `problems` has a topic_settings row, so newly
// added problems / lists are auto-scheduled without hand-editing any defaults.
// INSERT OR IGNORE → never clobbers counts you've already customized.
export function ensureTopicSettingsForAllProblems(
  db: Database.Database,
  defaultPerDay: number = DEFAULT_PROBLEMS_PER_DAY
): void {
  db.prepare(`
    INSERT OR IGNORE INTO topic_settings (topic, enabled, problems_per_day)
    SELECT DISTINCT topic, 1, ? FROM problems
  `).run(defaultPerDay);
}

export function getDifficultySettings(db: Database.Database): DifficultySettings {
  const row = db
    .prepare('SELECT easy, medium, hard FROM difficulty_settings WHERE id = 1')
    .get() as { easy: number; medium: number; hard: number };
  return {
    easy: row.easy === 1,
    medium: row.medium === 1,
    hard: row.hard === 1,
  };
}

export function updateDifficultySettings(
  db: Database.Database,
  settings: DifficultySettings
): void {
  db.prepare(`
    UPDATE difficulty_settings SET easy = ?, medium = ?, hard = ? WHERE id = 1
  `).run(settings.easy ? 1 : 0, settings.medium ? 1 : 0, settings.hard ? 1 : 0);
}

export function getRatingIntervals(db: Database.Database): RatingIntervals {
  const rows = db
    .prepare('SELECT rating, days FROM rating_intervals ORDER BY rating')
    .all() as { rating: number; days: number }[];
  const intervals: RatingIntervals = {};
  for (const row of rows) intervals[row.rating] = row.days;
  return intervals;
}

export function setRatingIntervals(db: Database.Database, intervals: RatingIntervals): void {
  const stmt = db.prepare(`
    INSERT INTO rating_intervals (rating, days)
    VALUES (?, ?)
    ON CONFLICT (rating) DO UPDATE SET days = excluded.days
  `);
  db.transaction(() => {
    for (const [rating, days] of Object.entries(intervals)) {
      stmt.run(Number(rating), days);
    }
  })();
}

// Seed any missing rating rows from the provided defaults (DEFAULT_RATING_INTERVALS
// from the scheduler). INSERT OR IGNORE so user-customized values are never clobbered.
export function ensureRatingIntervals(db: Database.Database, defaults: RatingIntervals): void {
  const stmt = db.prepare('INSERT OR IGNORE INTO rating_intervals (rating, days) VALUES (?, ?)');
  db.transaction(() => {
    for (const [rating, days] of Object.entries(defaults)) {
      stmt.run(Number(rating), days);
    }
  })();
}
