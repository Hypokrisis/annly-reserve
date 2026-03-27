-- ADD_REMINDER_DAYS.sql
-- Adds a configurable "inactive days" threshold for WhatsApp reminders.
-- Run this in Supabase SQL Editor.

ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS reminder_inactive_days INT DEFAULT 14;

COMMENT ON COLUMN public.businesses.reminder_inactive_days IS
    'Number of days of inactivity before a WhatsApp reminder is sent to a client.';

SELECT 'reminder_inactive_days column added to businesses.' AS status;
