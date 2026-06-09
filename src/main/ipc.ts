import { ipcMain, shell, dialog, IpcMainInvokeEvent } from 'electron';
import Database from 'better-sqlite3';
import fs from 'fs';
import { getDb } from '../db/connection';
import {
  getAllProblems,
  searchProblems,
  addProblem,
  getProblemListNames,
  getAvailableLists,
  backfillProblemLists,
} from '../db/problems';
import {
  insertReview,
  getReviewHistory,
  resetAllProgress,
  importReviews,
  getProblemsReviewedToday,
} from '../db/reviews';
import {
  getProblemState,
  upsertProblemState,
  getMonthForecast,
  getOverdueProblems,
  reclampDueDates,
} from '../db/state';
import { ensureProblemStates } from './backfill';
import { rowsToCsv, csvToRows, CsvRow } from './csv';
import {
  getQueueItems,
  updateQueueItemStatus,
  getQueueItem,
  getQueueForDate,
  createQueue,
  addQueueItem,
  getQueueItemIds,
  deleteQueueForDate,
} from '../db/queues';
import {
  getTopicSettings,
  upsertTopicSetting,
  getDifficultySettings,
  updateDifficultySettings,
  ensureTopicSettingsForAllProblems,
  getActiveList,
  setActiveList,
  getMaxIntervalDays,
  setMaxIntervalDays,
} from '../db/settings';
import { getOrGenerateQueue, generateQueue, refreshQueueItem, addMoreForTopic } from './generator';
import { applyRating } from './scheduler';
import { todayIso } from '../dateUtils';
import { NewProblem, ReviewPayload, TopicSetting, DifficultySettings, QueueGroupedByTopic } from '../types';

// ── IPC contract ─────────────────────────────────────────────────────────────
// Channel is the CANONICAL list of every IPC channel. It is enforced two ways:
//   • main side — handle() below only accepts a Channel, so a typo or a handler
//     for an unknown channel is a compile error.
//   • renderer side — src/main/preload.ts exposes exactly one api.* method per
//     channel; its inferred `Api` type is what the renderer sees.
// Invariant: every channel here has exactly one handle() in this file AND one
// api.* method in preload.ts. When adding a channel, update all three.
type Channel =
  | 'queue:get-today'
  | 'queue:generate'
  | 'queue:reset-today'
  | 'queue:refresh-item'
  | 'queue:skip-item'
  | 'queue:add-more-for-topic'
  | 'queue:add-problem'
  | 'review:submit'
  | 'problems:get-all'
  | 'problems:search'
  | 'problems:add'
  | 'settings:get-topics'
  | 'settings:update-topic'
  | 'settings:get-difficulties'
  | 'settings:update-difficulties'
  | 'settings:get-lists'
  | 'settings:get-active-list'
  | 'settings:set-active-list'
  | 'settings:get-max-interval'
  | 'settings:set-max-interval'
  | 'forecast:get-month'
  | 'forecast:get-overdue'
  | 'history:get-all'
  | 'history:reset'
  | 'history:export'
  | 'history:import'
  | 'shell:open-url';

// Thin wrapper around ipcMain.handle that (1) restricts the channel to the
// canonical Channel union and (2) logs any thrown error in the MAIN process
// (with the channel name) before it crosses IPC as a rejected promise. Without
// the logging, a DB/file error surfaces only as an unhandled rejection in the
// renderer with no main-side trace — making failures effectively invisible.
function handle<Args extends unknown[], Result>(
  channel: Channel,
  listener: (event: IpcMainInvokeEvent, ...args: Args) => Promise<Result> | Result
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await listener(event, ...(args as Args));
    } catch (err) {
      console.error(`[ipc] ${channel} failed:`, err);
      throw err;
    }
  });
}

function registerQueueHandlers(db: Database.Database): void {
  handle('queue:get-today', async (): Promise<QueueGroupedByTopic[]> => {
    const today = todayIso();
    return getOrGenerateQueue(db, today);
  });

  handle('queue:generate', async (): Promise<QueueGroupedByTopic[]> => {
    const today = todayIso();
    return generateQueue(db, today);
  });

  handle('queue:reset-today', async (): Promise<QueueGroupedByTopic[]> => {
    const today = todayIso();
    deleteQueueForDate(db, today);
    return generateQueue(db, today);
  });

  handle('queue:refresh-item', async (_event, itemId: number, topic: string) => {
    const today = todayIso();
    const item = getQueueItem(db, itemId);
    if (!item) return null;
    return refreshQueueItem(db, itemId, topic, item.queue_id, today);
  });

  handle('queue:skip-item', async (_event, itemId: number) => {
    updateQueueItemStatus(db, itemId, 'skipped');
  });

  handle('queue:add-more-for-topic', async (_event, topic: string, count: number) => {
    const today = todayIso();
    return addMoreForTopic(db, topic, count, today);
  });

  // Manually add a specific problem to today's queue
  handle('queue:add-problem', async (_event, problemId: number) => {
    const today = todayIso();
    let queue = getQueueForDate(db, today);
    if (!queue) queue = createQueue(db, today);

    // Refuse if already in today's queue or already reviewed today
    const inQueue = getQueueItemIds(db, queue.id);
    const reviewedToday = getProblemsReviewedToday(db, today);
    if (inQueue.includes(problemId) || reviewedToday.includes(problemId)) {
      return { ok: false, reason: 'already_in_queue' };
    }

    addQueueItem(db, queue.id, problemId);
    const items = getQueueItems(db, queue.id);
    const newItem = items.find((i) => i.problem_id === problemId && i.status === 'pending');
    return { ok: true, item: newItem ?? null };
  });
}

function registerReviewHandlers(db: Database.Database): void {
  handle('review:submit', async (_event, payload: ReviewPayload) => {
    const today = todayIso();
    // Advance the FSRS state from the problem's prior state (null = never
    // reviewed), then persist the review and the new state together.
    const prev = getProblemState(db, payload.problem_id) ?? null;
    const next = applyRating(prev, payload.rating, today, getMaxIntervalDays(db));
    db.transaction(() => {
      insertReview(db, payload.problem_id, payload.rating, payload.notes, today, next.due);
      upsertProblemState(db, { problem_id: payload.problem_id, ...next });
      updateQueueItemStatus(db, payload.queue_item_id, 'completed');
    })();
  });
}

function registerProblemsHandlers(db: Database.Database): void {
  handle('problems:get-all', async () => getAllProblems(db));

  handle('problems:search', async (_event, query: string) =>
    searchProblems(db, query)
  );

  handle('problems:add', async (_event, problem: NewProblem) =>
    addProblem(db, problem)
  );
}

function registerSettingsHandlers(db: Database.Database): void {
  handle('settings:get-topics', async () => getTopicSettings(db));

  handle('settings:update-topic', async (_event, setting: TopicSetting) =>
    upsertTopicSetting(db, setting)
  );

  handle('settings:get-difficulties', async () => getDifficultySettings(db));

  handle('settings:update-difficulties', async (_event, settings: DifficultySettings) =>
    updateDifficultySettings(db, settings)
  );

  handle('settings:get-lists', async () => getAvailableLists(db));

  handle('settings:get-active-list', async () => getActiveList(db));

  handle('settings:set-active-list', async (_event, list: string) =>
    setActiveList(db, list)
  );

  handle('settings:get-max-interval', async () => getMaxIntervalDays(db));

  // Persist the cap, then pull any now-too-far due dates back into the window.
  handle('settings:set-max-interval', async (_event, days: number) => {
    setMaxIntervalDays(db, days);
    reclampDueDates(db, todayIso(), days);
  });
}

function registerHistoryHandlers(db: Database.Database): void {
  handle('history:get-all', async () => getReviewHistory(db));

  handle('history:reset', async () => resetAllProgress(db));

  // CSV export
  handle('history:export', async () => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Review History',
      defaultPath: `interview-repetition-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (canceled || !filePath) return { ok: false, reason: 'canceled' };

    const entries = getReviewHistory(db);
    const csvRows: CsvRow[] = entries.map((e) => ({
      problem_title: e.title,
      topic: e.topic,
      difficulty: e.difficulty,
      leetcode_url: e.leetcode_url,
      list_name: '',  // not stored in ReviewHistoryEntry; will be filled from problems join below
      rating: String(e.rating),
      notes: e.notes,
      reviewed_at: e.reviewed_at,
      next_review_at: e.next_review_at,
    }));

    // Fetch list_name separately and merge
    const listMap = new Map<number, string>(
      getProblemListNames(db).map((r) => [r.id, r.list_name])
    );
    entries.forEach((e, i) => {
      csvRows[i].list_name = listMap.get(e.problem_id) ?? '';
    });

    fs.writeFileSync(filePath, rowsToCsv(csvRows), 'utf-8');
    return { ok: true, path: filePath, count: entries.length };
  });

  // CSV import
  handle('history:import', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Review History',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0) return { ok: false, reason: 'canceled' };

    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    let rows: CsvRow[];
    try {
      rows = csvToRows(raw);
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }

    const mapped = rows.map((r) => ({
      leetcode_url: r.leetcode_url,
      title: r.problem_title,
      topic: r.topic,
      difficulty: r.difficulty,
      list_name: r.list_name,
      rating: Number(r.rating),
      notes: r.notes,
      reviewed_at: r.reviewed_at,
      next_review_at: r.next_review_at,
    }));

    const result = importReviews(db, mapped);
    // Imported reviews need FSRS state rebuilt from their history.
    ensureProblemStates(db);
    return { ok: true, ...result };
  });
}

function registerForecastHandlers(db: Database.Database): void {
  // month is 'YYYY-MM'. Returns due-by-day (today/future) + reviewed-by-day
  // (past) for that month, in one call.
  handle('forecast:get-month', async (_event, month: string) =>
    getMonthForecast(db, month, todayIso())
  );

  handle('forecast:get-overdue', async () => getOverdueProblems(db, todayIso()));
}

export function registerIpcHandlers(): void {
  const db = getDb();

  // Make sure every topic that has problems is schedulable (auto-registers new topics).
  ensureTopicSettingsForAllProblems(db);
  // Backfill list membership from the legacy list_name column (idempotent).
  backfillProblemLists(db);
  // Backfill FSRS state for any pre-existing / imported review history.
  ensureProblemStates(db);

  registerQueueHandlers(db);
  registerReviewHandlers(db);
  registerProblemsHandlers(db);
  registerSettingsHandlers(db);
  registerHistoryHandlers(db);
  registerForecastHandlers(db);

  // Shell
  handle('shell:open-url', async (_event, url: string) => {
    await shell.openExternal(url);
  });
}
