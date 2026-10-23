// Hand-written DB types matching supabase/migrations. Regenerate with `supabase gen types` if the schema drifts.

export type Vibe =
  | "strength" | "pilates" | "yoga" | "cardio" | "hiit" | "walk" | "run" | "swim" | "cycle" | "stretch" | "other";
export type Intensity = "light" | "moderate" | "hard";
export type Status = "planned" | "done" | "skipped";
export type Feeling = "great" | "good" | "hard" | "exhausted";
export type BodyState = "fresh" | "tight" | "sore" | "pain";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  gender: "female" | "male" | null;
  weight_kg: number | null;
  height_cm: number | null;
  birth_year: number | null;
  equipment: string[];
  days_per_week: number;
  goals: string[];
  vibes: string[];
  weekly_minutes_goal: number | null;
  weekly_kcal_goal: number;
  reminder_minutes_before: number;
  calendar_sync: boolean;
  onboarding_done: boolean;
  created_at: string;
};

export type Exercise = {
  id: number;
  source: string;
  source_id: string | null;
  name: string;
  name_he: string | null;
  muscles: string[];
  secondary_muscles: string[];
  category: string | null;
  difficulty: string | null;
  force: string | null;
  mechanic: string | null;
  steps: string[];
  videos: { url: string; angle?: string; gender?: string }[];
  images: string[];
  bodymap: unknown;
  created_by: string | null;
  created_at: string;
};

export type WorkoutTemplate = {
  id: string;
  user_id: string;
  name: string;
  vibe: Vibe;
  intensity: Intensity;
  muscle_groups: string[];
  est_minutes: number;
  notes: string | null;
  created_at: string;
};

export type TemplateExercise = {
  id: string;
  template_id: string;
  exercise_id: number | null;
  custom_name: string | null;
  position: number;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  weight_kg: number | null;
  notes: string | null;
};

export type ScheduledWorkout = {
  id: string;
  user_id: string;
  date: string;
  time: string | null;
  template_id: string | null;
  title: string;
  vibe: Vibe;
  intensity: Intensity;
  source: "app" | "external";
  status: Status;
  duration_min: number;
  google_event_id: string | null;
  series_id: string | null;
  reminded_at: string | null;
  notes: string | null;
  created_at: string;
};

export type ExerciseDone = {
  name: string;
  exercise_id?: number | null;
  sets?: { reps?: number; weight_kg?: number; done: boolean }[];
  duration_sec?: number;
};

export type WorkoutLog = {
  id: string;
  user_id: string;
  scheduled_id: string | null;
  template_id: string | null;
  title: string;
  performed_at: string;
  duration_min: number;
  vibe: Vibe;
  intensity: Intensity;
  calories: number;
  is_external: boolean;
  exercises_done: ExerciseDone[];
  notes: string | null;
  google_event_id: string | null;
  recovery_reminded_at: string | null;
  created_at: string;
};

export type RecoveryLog = {
  id: string;
  user_id: string;
  log_id: string | null;
  feeling: Feeling;
  body_state: BodyState;
  notes: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type GoogleToken = { user_id: string; refresh_token: string; updated_at: string };

// ---- supabase-js Database shape ----
type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id">;
      google_tokens: Table<GoogleToken, "user_id" | "refresh_token">;
      exercises: Table<Exercise, "name">;
      workout_templates: Table<WorkoutTemplate, "user_id" | "name">;
      template_exercises: Table<TemplateExercise, "template_id">;
      scheduled_workouts: Table<ScheduledWorkout, "user_id" | "date" | "title">;
      workout_logs: Table<WorkoutLog, "user_id" | "title" | "duration_min">;
      recovery_logs: Table<RecoveryLog, "user_id" | "feeling" | "body_state">;
      push_subscriptions: Table<PushSubscriptionRow, "user_id" | "endpoint" | "p256dh" | "auth">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
