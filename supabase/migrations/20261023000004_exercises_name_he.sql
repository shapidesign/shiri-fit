-- Shared cache: a logged-in user may edit the Hebrew name only, not videos, steps, or muscles.
revoke update on table public.exercises from anon, authenticated;
grant update (name_he) on table public.exercises to authenticated;
