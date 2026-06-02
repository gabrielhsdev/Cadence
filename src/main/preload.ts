import { contextBridge, ipcRenderer } from 'electron';
import {
  QueueGroupedByTopic,
  QueueItemWithProblem,
  ReviewPayload,
  Problem,
  NewProblem,
  TopicSetting,
  DifficultySettings,
  RatingIntervals,
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
    getIntervals: (): Promise<RatingIntervals> =>
      ipcRenderer.invoke('settings:get-intervals'),
    updateIntervals: (intervals: RatingIntervals): Promise<void> =>
      ipcRenderer.invoke('settings:update-intervals', intervals),
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

export type Api = typeof api;
