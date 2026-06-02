import Database from 'better-sqlite3';
import { DifficultySettings, TopicSetting } from '../types';

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
