-- Migration: Payload Schema Setup
-- Description: Creates the payload schema and grants permissions to supabase_admin.
-- NOTE: Payload CMS manages all table creation within this schema via its own
-- TypeScript migrations (push: true). This migration only sets up the schema
-- and permissions so Payload can operate.

CREATE SCHEMA IF NOT EXISTS payload;

-- Grant full access to supabase_admin (used by payload-cms DATABASE_URL)
GRANT ALL ON SCHEMA payload TO supabase_admin;
GRANT USAGE ON SCHEMA payload TO postgres, authenticated, service_role, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT ALL ON TABLES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT ALL ON SEQUENCES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT SELECT ON TABLES TO authenticated, anon;
