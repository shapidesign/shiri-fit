-- Reminder ticker: pg_cron + pg_net call POST https://<app>/api/reminders/tick every 5 minutes.
-- Vercel Hobby cron only runs daily, so the DB drives the schedule instead.
--
-- After deploying, set the two secrets once (Supabase SQL editor):
--   select vault.create_secret('https://shiri-fit.vercel.app', 'app_url');
--   select vault.create_secret('<CRON_SECRET from .env>', 'cron_secret');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.reminders_tick() returns void
language plpgsql security definer set search_path = public, extensions, vault as $$
declare
  app_url text;
  secret text;
begin
  select decrypted_secret into app_url from vault.decrypted_secrets where name = 'app_url' limit 1;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret' limit 1;
  if app_url is null or secret is null then
    raise notice 'reminders_tick: app_url / cron_secret not set in vault';
    return;
  end if;
  perform net.http_post(
    url := app_url || '/api/reminders/tick',
    headers := jsonb_build_object('authorization', 'Bearer ' || secret, 'content-type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
end $$;
revoke execute on function public.reminders_tick() from public, anon, authenticated;

select cron.schedule('shiri-fit-reminders', '*/5 * * * *', $$select public.reminders_tick()$$);
