-- Shiri Fit — initial schema. Single-user app; every user table is RLS-scoped to auth.uid().

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  weight_kg numeric(5,1),
  height_cm numeric(5,1),
  birth_year int,
  equipment text[] not null default '{}',
  days_per_week int not null default 3,
  goals text[] not null default '{}',
  vibes text[] not null default '{}',
  weekly_minutes_goal int not null default 150,
  weekly_kcal_goal int not null default 1000,
  reminder_minutes_before int not null default 60,
  calendar_sync boolean not null default true,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Google refresh tokens live in their own table with NO policies: only the service role can read them.
create table public.google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.google_tokens enable row level security;

-- ---------- exercises (shared cache of MuscleWiki / free-exercise-db) ----------
create table public.exercises (
  id serial primary key,
  source text not null default 'musclewiki',          -- musclewiki | free-exercise-db | custom
  source_id text,
  name text not null,
  name_he text,
  muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  category text,                                       -- equipment: barbell, dumbbell, bodyweight, ...
  difficulty text,
  force text,
  mechanic text,
  steps text[] not null default '{}',
  videos jsonb not null default '[]'::jsonb,
  images text[] not null default '{}',
  bodymap jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);
create index exercises_muscles_idx on public.exercises using gin (muscles);
create index exercises_name_idx on public.exercises (lower(name));
alter table public.exercises enable row level security;
create policy "read exercises" on public.exercises for select to authenticated using (true);
create policy "own custom exercises" on public.exercises for insert to authenticated with check (created_by = auth.uid());
-- Row access stays open; column grants in 20261023000004 limit writes to name_he.
create policy "update exercises" on public.exercises for update to authenticated using (true) with check (true);

-- ---------- templates ----------
create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  vibe text not null default 'strength',
  intensity text not null default 'moderate',          -- light | moderate | hard
  muscle_groups text[] not null default '{}',
  est_minutes int not null default 45,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.workout_templates enable row level security;
create policy "own templates" on public.workout_templates for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id int references public.exercises(id) on delete set null,
  custom_name text,
  position int not null default 0,
  sets int,
  reps int,
  duration_sec int,
  weight_kg numeric(5,1),
  notes text
);
alter table public.template_exercises enable row level security;
create policy "own template exercises" on public.template_exercises for all
  using (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_templates t where t.id = template_id and t.user_id = auth.uid()));

-- ---------- schedule ----------
create table public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  time time,
  template_id uuid references public.workout_templates(id) on delete set null,
  title text not null,
  vibe text not null default 'strength',
  intensity text not null default 'moderate',
  source text not null default 'app',                  -- app | external
  status text not null default 'planned',              -- planned | done | skipped
  duration_min int not null default 45,
  google_event_id text,
  series_id uuid,                                      -- groups weekly repeats
  reminded_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index scheduled_workouts_user_date_idx on public.scheduled_workouts (user_id, date);
alter table public.scheduled_workouts enable row level security;
create policy "own schedule" on public.scheduled_workouts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- logs ----------
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_id uuid references public.scheduled_workouts(id) on delete set null,
  template_id uuid references public.workout_templates(id) on delete set null,
  title text not null,
  performed_at timestamptz not null default now(),
  duration_min int not null,
  vibe text not null default 'strength',
  intensity text not null default 'moderate',
  calories int not null default 0,
  is_external boolean not null default false,
  exercises_done jsonb not null default '[]'::jsonb,
  notes text,
  google_event_id text,
  recovery_reminded_at timestamptz,
  created_at timestamptz not null default now()
);
create index workout_logs_user_time_idx on public.workout_logs (user_id, performed_at desc);
alter table public.workout_logs enable row level security;
create policy "own logs" on public.workout_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.recovery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_id uuid references public.workout_logs(id) on delete cascade,
  feeling text not null,                               -- great | good | hard | exhausted
  body_state text not null,                            -- fresh | tight | sore | pain
  notes text,
  created_at timestamptz not null default now()
);
alter table public.recovery_logs enable row level security;
create policy "own recovery" on public.recovery_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- push ----------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "own push" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
