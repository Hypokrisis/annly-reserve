-- UPDATE_BUSINESS_SCHEMA.sql
-- Run this in Supabase SQL Editor to add new fields to the businesses table

DO $$ 
BEGIN 
    -- 1. Add banner_url if not exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'banner_url') THEN
        ALTER TABLE businesses ADD COLUMN banner_url TEXT;
    END IF;

    -- 2. Add city if not exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'city') THEN
        ALTER TABLE businesses ADD COLUMN city VARCHAR(255);
    END IF;

    -- 3. Add latitude if not exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'latitude') THEN
        ALTER TABLE businesses ADD COLUMN latitude DECIMAL(12, 9);
    END IF;

    -- 4. Add longitude if not exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'longitude') THEN
        ALTER TABLE businesses ADD COLUMN longitude DECIMAL(12, 9);
    END IF;

    -- 5. Add instagram_url
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'instagram_url') THEN
        ALTER TABLE businesses ADD COLUMN instagram_url TEXT;
    END IF;

    -- 6. Add website_url
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'website_url') THEN
        ALTER TABLE businesses ADD COLUMN website_url TEXT;
    END IF;

    -- 7. Add gallery (JSONB)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'businesses' AND COLUMN_NAME = 'gallery') THEN
        ALTER TABLE businesses ADD COLUMN gallery JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
