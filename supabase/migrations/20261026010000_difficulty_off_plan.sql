-- "How hard was it?" on each log, and planned slots that were filled by an off-plan workout.

alter table public.workout_logs add column if not exists difficulty text;
alter table public.workout_logs drop constraint if exists workout_logs_difficulty_check;
alter table public.workout_logs add constraint workout_logs_difficulty_check
  check (difficulty is null or difficulty in ('easy', 'right', 'hard'));

alter table public.scheduled_workouts add column if not exists off_plan boolean not null default false;
