// Database types for Supabase tables
// These map to the schema we'll create in Supabase

export interface DbChild {
  id: string;
  user_id: string;
  name: string;
  birthdate: string | null;
  is_napping_age: boolean;
  color: string;
  care_status: string;
  bedtime: string | null;
  wake_time: string | null;
  created_at: string;
}

export interface DbTask {
  id: string;
  user_id: string;
  type: string;
  title: string;
  tier: string;
  scheduled_time: string | null;
  duration: number | null;
  recurrence: string;
  days_of_week: number[] | null;
  nap_context: string | null;
  care_context: string | null;
  best_when: string[] | null;
  is_active: boolean;
  category: string | null;
  child_id: string | null;
  child_task_type: string | null;
  is_informational: boolean;
  created_at: string;
}

export interface DbTaskInstance {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

export interface DbNapSchedule {
  id: string;
  user_id: string;
  child_id: string;
  nap_number: number;
  typical_start: string | null;
  typical_end: string | null;
  created_at: string;
}

export interface DbNapLog {
  id: string;
  user_id: string;
  child_id: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  sleep_type: string;
  created_at: string;
}

export interface DbAwayLog {
  id: string;
  user_id: string;
  child_id: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  schedule_name: string | null;
  created_at: string;
}

export interface DbCareBlock {
  id: string;
  user_id: string;
  child_ids: string[];
  name: string;
  block_type: string;
  recurrence: string | null;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  travel_time_before: number | null;
  travel_time_after: number | null;
  is_active: boolean;
  created_at: string;
}

export interface DbFlower {
  id: string;
  user_id: string;
  type: string;
  earned_date: string;
  challenge_id: string | null;
  created_at: string;
}

export interface DbPlacedFlower {
  id: string;
  user_id: string;
  flower_id: string;
  col: number;
  row: number;
  placed_at: string;
}
