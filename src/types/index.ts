export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ReviewStatus = 'pending' | 'completed' | 'skipped';

export interface Problem {
  id: number;
  title: string;
  topic: string;
  difficulty: Difficulty;
  leetcode_url: string;
  list_name: string;
}

export interface Review {
  id: number;
  problem_id: number;
  rating: number;
  notes: string;
  reviewed_at: string;
  next_review_at: string;
}

export interface DailyQueue {
  id: number;
  queue_date: string;
}

export interface DailyQueueItem {
  id: number;
  queue_id: number;
  problem_id: number;
  status: ReviewStatus;
}

export interface TopicSetting {
  topic: string;
  enabled: boolean;
  problems_per_day: number;
}

// Enriched types for UI
export interface QueueItemWithProblem extends DailyQueueItem {
  problem: Problem;
  last_review?: Review;
}

export interface QueueGroupedByTopic {
  topic: string;
  items: QueueItemWithProblem[];
}

// IPC channel types
export interface IpcChannels {
  // Queue
  'queue:get-today': () => QueueGroupedByTopic[];
  'queue:generate': () => QueueGroupedByTopic[];
  'queue:refresh-item': (itemId: number, topic: string) => QueueItemWithProblem | null;
  'queue:skip-item': (itemId: number) => void;

  // Reviews
  'review:submit': (payload: ReviewPayload) => void;

  // Problems
  'problems:get-all': () => Problem[];
  'problems:search': (query: string) => Problem[];
  'problems:add': (problem: NewProblem) => Problem;

  // Settings
  'settings:get-topics': () => TopicSetting[];
  'settings:update-topic': (setting: TopicSetting) => void;
  'settings:get-difficulties': () => DifficultySettings;
  'settings:update-difficulties': (settings: DifficultySettings) => void;

  // Shell
  'shell:open-url': (url: string) => void;
}

export interface ReviewPayload {
  queue_item_id: number;
  problem_id: number;
  rating: number;
  notes: string;
}

export interface NewProblem {
  title: string;
  topic: string;
  difficulty: Difficulty;
  leetcode_url: string;
  list_name: string;
}

export interface DifficultySettings {
  easy: boolean;
  medium: boolean;
  hard: boolean;
}

// History
export interface ReviewHistoryEntry {
  review_id: number;
  problem_id: number;
  title: string;
  topic: string;
  difficulty: Difficulty;
  leetcode_url: string;
  rating: number;
  notes: string;
  reviewed_at: string;
  next_review_at: string;
}
