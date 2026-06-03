/**
 * Seed script — safe to run multiple times (idempotent).
 * Usage: npm run seed
 */
import path from 'path';
import os from 'os';
import fs from 'fs';
import Database from 'better-sqlite3';
import { initSchema } from '../db/schema';
import { upsertProblem } from '../db/problems';
import { ensureTopicSetting, ensureTopicSettingsForAllProblems } from '../db/settings';
import { NEETCODE_150 } from './neetcode150';
import { BLIND_75 } from './blind75';
import { DESIGN_QUESTIONS } from './design';

const DEFAULT_TOPIC_SETTINGS: Record<string, number> = {
  Arrays: 2,
  'Two Pointers': 2,
  'Sliding Window': 2,
  Stack: 2,
  'Binary Search': 2,
  'Linked List': 2,
  Trees: 2,
  Tries: 1,
  Heap: 2,
  Backtracking: 2,
  Graphs: 3,
  'Dynamic Programming': 0,
  Greedy: 2,
  Intervals: 2,
  Math: 1,
  'Bit Manipulation': 1,
  Design: 2,
};

function main(): void {
  // Replicate userData path heuristic for CLI context (no Electron)
  const appName = 'Cadence';
  let userDataPath: string;
  if (process.platform === 'darwin') {
    userDataPath = path.join(os.homedir(), 'Library', 'Application Support', appName);
  } else if (process.platform === 'win32') {
    userDataPath = path.join(process.env.APPDATA ?? os.homedir(), appName);
  } else {
    userDataPath = path.join(os.homedir(), '.config', appName);
  }

  fs.mkdirSync(userDataPath, { recursive: true });

  const dbPath = path.join(userDataPath, 'interview-repetition.db');
  console.log(`Database: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);

  // NEETCODE_150 first so problems are created with that as their origin list_name;
  // BLIND_75 then adds the 'Blind 75' membership to the same (already-inserted) rows.
  const allProblems = [...NEETCODE_150, ...DESIGN_QUESTIONS, ...BLIND_75];

  const seedTx = db.transaction(() => {
    for (const problem of allProblems) {
      upsertProblem(db, problem);
    }

    // Curated per-day counts first (Graphs 3, Tries 1, DP 0, …)…
    for (const [topic, perDay] of Object.entries(DEFAULT_TOPIC_SETTINGS)) {
      ensureTopicSetting(db, topic, perDay);
    }
    // …then auto-register any remaining topics introduced by the problem lists.
    ensureTopicSettingsForAllProblems(db);
  });

  seedTx();

  const count = (db.prepare('SELECT COUNT(*) as n FROM problems').get() as { n: number }).n;
  const topicCount = (db.prepare('SELECT COUNT(*) as n FROM topic_settings').get() as { n: number }).n;
  console.log(`Seeded ${count} problems, ${topicCount} topic settings.`);
  db.close();
}

main();
