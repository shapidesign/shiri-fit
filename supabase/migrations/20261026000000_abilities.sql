-- One vs two kettlebells, and the answers that size a program: experience, conditioning, owned weights.

alter table public.profiles
  add column if not exists kettlebell_pairs boolean,
  add column if not exists training_experience text,
  add column if not exists conditioning text,
  add column if not exists owned_weights numeric[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_experience_check;
alter table public.profiles add constraint profiles_experience_check
  check (training_experience is null or training_experience in ('new', 'some', 'years'));

alter table public.profiles drop constraint if exists profiles_conditioning_check;
alter table public.profiles add constraint profiles_conditioning_check
  check (conditioning is null or conditioning in ('low', 'moderate', 'high'));
