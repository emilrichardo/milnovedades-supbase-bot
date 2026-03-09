-- =============================================================================
-- Initial Schema Setup
-- NOTE: The supabase/postgres image already creates standard roles (postgres,
-- anon, authenticated, service_role, authenticator, supabase_auth_admin,
-- supabase_storage_admin, supabase_replication_admin, supabase_admin) and
-- standard schemas (public, auth, storage, _realtime, realtime, extensions).
-- This script only adds what the image does NOT handle by default.
-- =============================================================================

-- Create additional schemas
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS payload;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Public schema permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Database-level privileges
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_storage_admin;

-- Payload schema permissions (supabase_admin is used by payload-cms)
GRANT ALL ON SCHEMA payload TO supabase_admin;
GRANT USAGE ON SCHEMA payload TO postgres, authenticated, service_role, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT ALL ON TABLES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT ALL ON SEQUENCES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT SELECT ON TABLES TO authenticated, anon;

-- PG Cron grants
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
