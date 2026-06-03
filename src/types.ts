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

// Configured days-until-next-review keyed by rating (1–5). The canonical
// default values and the date math live in src/main/scheduler.ts.
export type RatingIntervals = Record<number, number>;

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

// Upcoming-review forecast for the Forecast calendar.
export interface ReviewForecast {
  overdue: number; // scheduled before today and not yet reviewed
  newCount: number; // problems never reviewed (no state yet)
  upcoming: { date: string; count: number }[]; // due on each day from today forward
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
