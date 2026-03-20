-- SELLABLE_FEATURES_V1.sql
-- Goal: Add Analytics and WhatsApp customization features to make the product sellable.

DO $$ 
BEGIN 
    -- 1. Add WhatsApp Bot Active Toggle
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'whatsapp_bot_active') THEN
        ALTER TABLE businesses ADD COLUMN whatsapp_bot_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- 2. Add WhatsApp Reminder Template
    -- This is the message used to "remind" clients that it is time for a new haircut.
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'whatsapp_reminder_template') THEN
        ALTER TABLE businesses ADD COLUMN whatsapp_reminder_template TEXT DEFAULT '¡Hola! Hace tiempo que no nos visitas en {{business_name}}. ¿Te gustaría agendar tu próximo recorte? Puedes hacerlo aquí: {{booking_link}}';
    END IF;

    -- 3. Add Custom Booking Link for WhatsApp
    -- If they want to send a shorter or specific link.
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'whatsapp_booking_link') THEN
        ALTER TABLE businesses ADD COLUMN whatsapp_booking_link TEXT;
    END IF;

END $$;

SELECT 'SELLABLE FEATURES SCHEMA UPDATED' as status;
