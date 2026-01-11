-- Custom initialization for pg_cron in firecrawl database
-- This script runs AFTER Firecrawl's own init scripts (which use 000-, 001-, etc.)
-- The 999- prefix ensures it runs last, after the firecrawl database is created

\c firecrawl

-- Create pg_cron extension in firecrawl database
-- This must be created in the database specified in cron.database_name (set in Dockerfile)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Verify pg_cron is working by creating and removing a test job
DO $$
BEGIN
    -- Schedule a test job
    PERFORM cron.schedule('test-job', '0 0 * * *', 'SELECT 1');
    
    -- Immediately unschedule it
    PERFORM cron.unschedule('test-job');
    
    RAISE NOTICE 'pg_cron extension successfully initialized in firecrawl database';
END $$;
