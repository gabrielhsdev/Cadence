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

// The active problem list the daily queue draws from. '' = All Problems.
export function getActiveList(db: Database.Database): string {
  const row = db
    .prepare('SELECT active_list FROM list_settings WHERE id = 1')
    .get() as { active_list: string } | undefined;
  return row?.active_list ?? '';
}

export function setActiveList(db: Database.Database, list: string): void {
  db.prepare(`
    INSERT INTO list_settings (id, active_list)
    VALUES (1, ?)
    ON CONFLICT (id) DO UPDATE SET active_list = excluded.active_list
  `).run(list);
}
