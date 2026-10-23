-- Exercise blocks (warm-up / main / cool-down), multiple plan goals, and a plan difficulty level.

alter table public.template_exercises add column if not exists phase text not null default 'main';
alter table public.template_exercises drop constraint if exists template_exercises_phase_check;
alter table public.template_exercises add constraint template_exercises_phase_check check (phase in ('warmup', 'main', 'cooldown'));

alter table public.workout_plans add column if not exists goals text[] not null default '{}';
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'workout_plans' and column_name = 'goal') then
    update public.workout_plans set goals = array[goal] where goals = '{}';
    alter table public.workout_plans drop column goal;
  end if;
end $$;

-- 0 = novice exercises only, 1 = up to intermediate, 2 = everything.
alter table public.workout_plans add column if not exists level int not null default 0;
