-- AUDIT SCRIPT
-- 1. Get exact columns of appointments
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments';

-- 2. Check for existing triggers on appointments
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments';

-- 3. Check installed extensions (to see if we have pg_net or pg_cron)
SELECT name, default_version, installed_version 
FROM pg_available_extensions 
WHERE name IN ('pg_net', 'pg_cron', 'http') AND installed_version IS NOT NULL;
