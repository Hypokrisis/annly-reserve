-- Add geolocation columns to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Update existing businesses with some mock coordinates (Puerto Rico area for example)
UPDATE public.businesses SET latitude = 18.4655, longitude = -66.1057 WHERE city ILIKE '%San Juan%';
UPDATE public.businesses SET latitude = 18.2201, longitude = -66.5901 WHERE city ILIKE '%Ponce%';
UPDATE public.businesses SET latitude = 18.4500, longitude = -66.0667 WHERE city ILIKE '%Carolina%';
