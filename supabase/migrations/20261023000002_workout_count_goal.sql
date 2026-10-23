-- Weekly goal is now a workout count (days_per_week); a minutes goal is optional.
alter table public.profiles
  alter column weekly_minutes_goal drop not null,
  alter column weekly_minutes_goal set default null;

-- A workout is ~1 hour by default.
alter table public.workout_templates alter column est_minutes set default 60;
alter table public.scheduled_workouts alter column duration_min set default 60;
