-- Enable pg_cron extension
-- This script runs BEFORE 001-nuq.sql to ensure cron schema exists

-- Create the pg_cron extension in the current database
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to the database user
GRANT USAGE ON SCHEMA cron TO PUBLIC;
