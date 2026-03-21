-- SETUP_REMINDERS_CRON.sql
-- Run this in Supabase SQL Editor to schedule automatic weekly reminders.
-- Requires the pg_cron and pg_net extensions (usually pre-enabled in Supabase).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the reminder function to run every Monday at 10:00 AM UTC
-- Adjust the cron expression to your preferred schedule.
-- '0 10 * * 1' = Every Monday at 10:00 AM
-- '0 10 * * *' = Every day at 10:00 AM

SELECT cron.schedule(
  'weekly-whatsapp-reminders',
  '0 10 * * 1',
  $$
    SELECT net.http_post(
      url     := (SELECT 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/send-reminders'),
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- To verify cron jobs are registered:
-- SELECT * FROM cron.job;

-- To remove this job later:
-- SELECT cron.unschedule('weekly-whatsapp-reminders');

SELECT 'Cron job for weekly WhatsApp reminders registered.' AS status;
