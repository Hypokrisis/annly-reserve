-- Adds the WhatsApp bot config columns the dashboard UI already writes.
-- Before this, BusinessSettingsPage / AIAssistantPage UPDATEs failed because
-- these columns did not exist (Postgres rejects the whole UPDATE).
-- NOTE: whatsapp_device_connected was intentionally NOT added — it belonged to
-- the removed fake-QR flow; it was dropped from the UI payload instead.

ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS whatsapp_bot_personality   text    DEFAULT 'quick',
    ADD COLUMN IF NOT EXISTS whatsapp_bot_prompt         text    DEFAULT '',
    ADD COLUMN IF NOT EXISTS whatsapp_bot_auto_schedule  boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS whatsapp_bot_start_hour      text    DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS whatsapp_bot_end_hour        text    DEFAULT '18:00',
    ADD COLUMN IF NOT EXISTS whatsapp_bot_anti_collision  boolean DEFAULT true;
