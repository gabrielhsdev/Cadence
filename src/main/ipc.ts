import { ipcMain, shell, dialog } from 'electron';
import fs from 'fs';
import { getDb } from '../db/connection';
import { getAllProblems, searchProblems, addProblem, getEligibleProblems } from '../db/problems';
import { insertReview, getReviewHistory, resetAllProgress, importReviews } from '../db/reviews';
import { rowsToCsv, csvToRows, CsvRow } from './csv';
import { getQueueItems, updateQueueItemStatus, getQueueItem, getQueueForDate, createQueue, addQueueItem, getQueueItemIds, deleteQueueForDate } from '../db/queues';
import { getProblemsReviewedToday } from '../db/reviews';
import { getTopicSettings, upsertTopicSetting, getDifficultySettings, updateDifficultySettings } from '../db/settings';
import { getOrGenerateQueue, generateQueue, refreshQueueItem } from '../queue/generator';
import { getNextReviewDate, todayIso } from '../scheduling/scheduler';
import { NewProblem, ReviewPayload, TopicSetting, DifficultySettings, QueueGroupedByTopic } from '../types';

export function registerIpcHandlers(): void {
  const db = getDb();

  // Queue
  ipcMain.handle('queue:get-today', async (): Promise<QueueGroupedByTopic[]> => {
    const today = todayIso();
    return getOrGenerateQueue(db, today);
  });

  ipcMain.handle('queue:generate', async (): Promise<QueueGroupedByTopic[]> => {
    const today = todayIso();
    return generateQueue(db, today);
  });

  ipcMain.handle('queue:reset-today', async (): Promise<QueueGroupedByTopic[]> => {
    const today = todayIso();
    deleteQueueForDate(db, today);
    return generateQueue(db, today);
  });

  ipcMain.handle(
    'queue:refresh-item',
    async (_event, itemId: number, topic: string) => {
      const today = todayIso();
      const item = getQueueItem(db, itemId);
      if (!item) return null;
      return refreshQueueItem(db, itemId, topic, item.queue_id, today);
    }
  );

  ipcMain.handle('queue:skip-item', async (_event, itemId: number) => {
    updateQueueItemStatus(db, itemId, 'skipped');
  });

  // Add more problems for a single topic (respects difficulty filters, dedupes)
  ipcMain.handle('queue:add-more-for-topic', async (_event, topic: string, count: number) => {
    const today = todayIso();
    let queue = getQueueForDate(db, today);
    if (!queue) queue = createQueue(db, today);

    const diffSettings = getDifficultySettings(db);
    const enabledDifficulties: ('Easy' | 'Medium' | 'Hard')[] = [];
    if (diffSettings.easy) enabledDifficulties.push('Easy');
    if (diffSettings.medium) enabledDifficulties.push('Medium');
    if (diffSettings.hard) enabledDifficulties.push('Hard');

    const reviewedToday = getProblemsReviewedToday(db, today);
    const inQueue = getQueueItemIds(db, queue.id);
    const excludeIds = [...new Set([...reviewedToday, ...inQueue])];

    const eligible = getEligibleProblems(db, topic, today, enabledDifficulties, excludeIds);
    const toAdd = Math.min(count, eligible.length);

    db.transaction(() => {
      for (let i = 0; i < toAdd; i++) {
        addQueueItem(db, queue!.id, eligible[i].id);
      }
    })();

    return { added: toAdd, exhausted: eligible.length === 0 };
  });

  // Manually add a specific problem to today's queue
  ipcMain.handle('queue:add-problem', async (_event, problemId: number) => {
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

  // Reviews
  ipcMain.handle('review:submit', async (_event, payload: ReviewPayload) => {
    const today = todayIso();
    const nextReview = getNextReviewDate(payload.rating, today);
    insertReview(db, payload.problem_id, payload.rating, payload.notes, today, nextReview);
    updateQueueItemStatus(db, payload.queue_item_id, 'completed');
  });

  // Problems
  ipcMain.handle('problems:get-all', async () => getAllProblems(db));

  ipcMain.handle('problems:search', async (_event, query: string) =>
    searchProblems(db, query)
  );

  ipcMain.handle('problems:add', async (_event, problem: NewProblem) =>
    addProblem(db, problem)
  );

  // Settings
  ipcMain.handle('settings:get-topics', async () => getTopicSettings(db));

  ipcMain.handle('settings:update-topic', async (_event, setting: TopicSetting) =>
    upsertTopicSetting(db, setting)
  );

  ipcMain.handle('settings:get-difficulties', async () => getDifficultySettings(db));

  ipcMain.handle('settings:update-difficulties', async (_event, settings: DifficultySettings) =>
    updateDifficultySettings(db, settings)
  );

  // History
  ipcMain.handle('history:get-all', async () => getReviewHistory(db));

  ipcMain.handle('history:reset', async () => resetAllProgress(db));

  // CSV export
  ipcMain.handle('history:export', async () => {
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
      (db.prepare('SELECT id, list_name FROM problems').all() as { id: number; list_name: string }[])
        .map((r) => [r.id, r.list_name])
    );
    entries.forEach((e, i) => {
      csvRows[i].list_name = listMap.get(e.problem_id) ?? '';
    });

    fs.writeFileSync(filePath, rowsToCsv(csvRows), 'utf-8');
    return { ok: true, path: filePath, count: entries.length };
  });

  // CSV import
  ipcMain.handle('history:import', async () => {
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
    return { ok: true, ...result };
  });

  // Shell
  ipcMain.handle('shell:open-url', async (_event, url: string) => {
    await shell.openExternal(url);
  });
}
