-- Monthly workout plans + "one dumbbell or a pair of each weight?".

-- null = not asked, true = a pair of each weight, false = a single dumbbell of each weight.
alter table public.profiles add column if not exists dumbbell_pairs boolean;

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  target_workouts int not null,
  target_note text,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now()
);
create index if not exists workout_plans_user_idx on public.workout_plans (user_id, starts_on desc);
alter table public.workout_plans enable row level security;
drop policy if exists "own plans" on public.workout_plans;
create policy "own plans" on public.workout_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.scheduled_workouts add column if not exists plan_id uuid references public.workout_plans(id) on delete cascade;
create index if not exists scheduled_workouts_plan_idx on public.scheduled_workouts (plan_id);
