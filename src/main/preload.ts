import { contextBridge, ipcRenderer } from 'electron';
import {
  QueueGroupedByTopic,
  QueueItemWithProblem,
  ReviewPayload,
  Problem,
  NewProblem,
  TopicSetting,
  DifficultySettings,
  MonthForecast,
  OverdueProblem,
  ReviewHistoryEntry,
} from '../types';

const api = {
  queue: {
    getToday: (): Promise<QueueGroupedByTopic[]> =>
      ipcRenderer.invoke('queue:get-today'),
    generate: (): Promise<QueueGroupedByTopic[]> =>
      ipcRenderer.invoke('queue:generate'),
    refreshItem: (itemId: number, topic: string): Promise<QueueItemWithProblem | null> =>
      ipcRenderer.invoke('queue:refresh-item', itemId, topic),
    skipItem: (itemId: number): Promise<void> =>
      ipcRenderer.invoke('queue:skip-item', itemId),
    resetToday: (): Promise<QueueGroupedByTopic[]> =>
      ipcRenderer.invoke('queue:reset-today'),
    addProblem: (problemId: number): Promise<{ ok: boolean; item?: QueueItemWithProblem | null; reason?: string }> =>
      ipcRenderer.invoke('queue:add-problem', problemId),
    addMoreForTopic: (topic: string, count: number): Promise<{ added: number; exhausted: boolean }> =>
      ipcRenderer.invoke('queue:add-more-for-topic', topic, count),
  },
  review: {
    submit: (payload: ReviewPayload): Promise<void> =>
      ipcRenderer.invoke('review:submit', payload),
  },
  problems: {
    getAll: (): Promise<Problem[]> =>
      ipcRenderer.invoke('problems:get-all'),
    search: (query: string): Promise<Problem[]> =>
      ipcRenderer.invoke('problems:search', query),
    add: (problem: NewProblem): Promise<Problem> =>
      ipcRenderer.invoke('problems:add', problem),
  },
  settings: {
    getTopics: (): Promise<TopicSetting[]> =>
      ipcRenderer.invoke('settings:get-topics'),
    updateTopic: (setting: TopicSetting): Promise<void> =>
      ipcRenderer.invoke('settings:update-topic', setting),
    getDifficulties: (): Promise<DifficultySettings> =>
      ipcRenderer.invoke('settings:get-difficulties'),
    updateDifficulties: (settings: DifficultySettings): Promise<void> =>
      ipcRenderer.invoke('settings:update-difficulties', settings),
    getLists: (): Promise<string[]> =>
      ipcRenderer.invoke('settings:get-lists'),
    getActiveList: (): Promise<string> =>
      ipcRenderer.invoke('settings:get-active-list'),
    setActiveList: (list: string): Promise<void> =>
      ipcRenderer.invoke('settings:set-active-list', list),
    getMaxInterval: (): Promise<number> =>
      ipcRenderer.invoke('settings:get-max-interval'),
    setMaxInterval: (days: number): Promise<void> =>
      ipcRenderer.invoke('settings:set-max-interval', days),
  },
  forecast: {
    getMonth: (month: string): Promise<MonthForecast> =>
      ipcRenderer.invoke('forecast:get-month', month),
    getOverdue: (): Promise<OverdueProblem[]> =>
      ipcRenderer.invoke('forecast:get-overdue'),
  },
  history: {
    getAll: (): Promise<ReviewHistoryEntry[]> =>
      ipcRenderer.invoke('history:get-all'),
    reset: (): Promise<void> =>
      ipcRenderer.invoke('history:reset'),
    export: (): Promise<{ ok: boolean; path?: string; count?: number; reason?: string }> =>
      ipcRenderer.invoke('history:export'),
    import: (): Promise<{ ok: boolean; imported?: number; skipped?: number; reason?: string }> =>
      ipcRenderer.invoke('history:import'),
  },
  shell: {
    openUrl: (url: string): Promise<void> =>
      ipcRenderer.invoke('shell:open-url', url),
  },
};

contextBridge.exposeInMainWorld('api', api);

// `Api` is the renderer-facing source of truth for the IPC surface: src/renderer
// uses it (via src/renderer/api.ts) so every method and signature is type-checked
// end-to-end. CONTRACT: each method here calls ipcRenderer.invoke(channel) for a
// channel that must have a matching handle(channel) in src/main/ipc.ts, where the
// canonical `Channel` union lives. Add a channel? Update both files.
export type Api = typeof api;
