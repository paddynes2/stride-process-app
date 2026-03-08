-- Add logo_url to tools for displaying vendor/tool logos
ALTER TABLE tools ADD COLUMN IF NOT EXISTS logo_url TEXT;
