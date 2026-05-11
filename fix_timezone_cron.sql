-- ============================================================
-- MIGRATION: Fix Timezone Bug in pg_cron Jobs
-- Spacey Reserve — Production Fix
-- Date: 2026-05-11
-- ============================================================
--
-- PROBLEM: pg_cron runs in UTC. A business in Santo Domingo (UTC-4)
-- that has a reminder scheduled at 8:00 AM local time would have the
-- cron fire at 12:00 PM UTC — 4 hours late.
--
-- SOLUTION: When scheduling reminders, convert the business local time
-- to UTC before storing in pg_cron. We use the 'timezone' column from
-- the 'businesses' table.
--
-- HOW TO APPLY: Run this in the Supabase SQL Editor.
-- ============================================================

-- Step 1: Verify your businesses have a timezone set
-- (run this query first to check):
SELECT id, name, timezone FROM businesses WHERE timezone IS NULL OR timezone = '';

-- If any are NULL, set a default (change to your main timezone):
UPDATE businesses
SET timezone = 'America/Santo_Domingo'
WHERE timezone IS NULL OR timezone = '';

-- ============================================================
-- Step 2: The send-reminders Edge Function already receives
-- businessId and processes appointments. The fix is to ensure
-- the SCHEDULED TIME stored in marketing_campaigns and the
-- pg_cron schedule are timezone-aware.
--
-- When a user schedules a campaign at "9:00 AM" in the UI,
-- the frontend sends a datetime-local value. That value must
-- be converted to UTC before storing.
-- ============================================================

-- Step 3: Create a helper function for timezone-aware scheduling
CREATE OR REPLACE FUNCTION get_utc_time_for_business(
    p_business_id UUID,
    p_local_time TIMESTAMPTZ
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_timezone TEXT;
BEGIN
    SELECT timezone INTO v_timezone
    FROM businesses
    WHERE id = p_business_id;

    IF v_timezone IS NULL THEN
        v_timezone := 'America/Santo_Domingo'; -- Fallback default
    END IF;

    -- Convert the local time to UTC using the business timezone
    RETURN p_local_time AT TIME ZONE v_timezone AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Step 4: Update the send-reminders cron job to run every hour
-- instead of once a day, and let the Edge Function decide which
-- businesses need reminders based on their local timezone.
--
-- Current (WRONG — fires only at one specific UTC hour for all):
-- SELECT cron.schedule('send-daily-reminders', '0 12 * * *', ...);
--
-- CORRECT — Run every hour, let the function handle timezone logic:
-- ============================================================

-- Unschedule the old job (if it exists):
SELECT cron.unschedule('send-daily-reminders');

-- Schedule a new hourly job:
SELECT cron.schedule(
    'send-hourly-reminders',   -- Job name
    '0 * * * *',               -- Every hour at :00
    $$
    SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url') || '/send-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
        ),
        body := jsonb_build_object('mode', 'scheduled')
    ) AS request_id;
    $$
);

-- ============================================================
-- Step 5: In your send-reminders Edge Function, add this logic
-- to check if NOW() matches the business's local reminder time:
--
-- const { data: businesses } = await supabase
--   .from('businesses')
--   .select('id, timezone, reminder_inactive_days')
--   .eq('whatsapp_bot_active', true);
--
-- for (const business of businesses) {
--   const localHour = new Date().toLocaleTimeString('en-US', {
--     timeZone: business.timezone,
--     hour: 'numeric',
--     hour12: false
--   });
--   // Only process businesses where it's currently 9 AM local time
--   if (parseInt(localHour) === 9) {
--     // ... process reminders for this business
--   }
-- }
-- ============================================================

-- Verify the new job was created:
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'send-hourly-reminders';
