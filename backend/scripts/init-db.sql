-- CulturaFlow Database Initialization Script
-- This script runs when PostgreSQL container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create indexes for better performance (will be created by Prisma migrations)
-- But we can prepare the database with some optimizations

-- Set timezone
SET timezone = 'UTC';

-- Configure some PostgreSQL settings for better performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = all;
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Create a function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'CulturaFlow database initialization completed successfully';
END $$;