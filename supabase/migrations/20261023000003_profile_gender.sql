-- null = not answered; the app treats it as female.
alter table public.profiles add column gender text check (gender in ('female', 'male'));
