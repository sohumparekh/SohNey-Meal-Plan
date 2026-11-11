-- Run once in the Supabase SQL editor after the app is deployed.
-- Replace the two placeholders. Calls the app every 15 minutes; the app decides which
-- reminders are due (India time) and also keeps the free project from pausing.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('ghar-ka-menu-tick') where exists (select 1 from cron.job where jobname = 'ghar-ka-menu-tick');

select cron.schedule(
  'ghar-ka-menu-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/cron/tick',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- Check it is running (after 15 minutes):
-- select * from cron.job_run_details order by start_time desc limit 5;
-- select * from net._http_response order by created desc limit 5;
