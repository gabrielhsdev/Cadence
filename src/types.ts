export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ReviewStatus = 'pending' | 'completed' | 'skipped';

// Sentinel "no cap" value for the max review interval (~100 years). Shared by the
// scheduler (default), the settings store, and the Settings dropdown.
export const MAX_INTERVAL_NO_CAP = 36500;

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
}

export interface QueueGroupedByTopic {
  topic: string;
  items: QueueItemWithProblem[];
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

// FSRS per-problem memory state. `SchedulerState` is the algorithm's view
// (no DB key); `ProblemState` is the persisted row in the problem_state table.
// Mirrors a ts-fsrs Card, flattened to plain columns. Dates are YYYY-MM-DD.
export interface SchedulerState {
  stability: number;
  difficulty: number;
  due: string;
  last_reviewed_at: string;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // ts-fsrs State: 0 New, 1 Learning, 2 Review, 3 Relearning
}

export interface ProblemState extends SchedulerState {
  problem_id: number;
}

// An overdue problem (due before today) plus its due date, for the Overdue list.
export interface OverdueProblem extends Problem {
  due: string;
}

// One day in the Forecast calendar: problems due that day (today/future) and
// problems solved that day (past). A given day usually has one or the other.
export interface ForecastDay {
  due: Problem[];
  reviewed: (Problem & { rating: number })[];
}

// A month's worth of forecast data, fetched in one call. `days` is keyed by
// YYYY-MM-DD and only contains non-empty days. `overdue`/`newCount` are global.
export interface MonthForecast {
  overdue: number; // due before today and not yet reviewed
  newCount: number; // problems never reviewed (no state yet)
  days: Record<string, ForecastDay>;
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
