-- =============================================================================
-- Initial Schema Setup
-- NOTE: supabase/postgres:15.6.1.132 does NOT pre-create Supabase service roles.
-- This script creates all required roles, schemas, and grants from scratch.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Supabase service roles (image only creates supabase_admin)
-- -----------------------------------------------------------------------------
CREATE ROLE postgres SUPERUSER CREATEDB CREATEROLE LOGIN;
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_auth_admin NOINHERIT LOGIN;
CREATE ROLE supabase_storage_admin NOINHERIT LOGIN;
CREATE ROLE supabase_functions_admin NOLOGIN NOINHERIT;
CREATE ROLE supabase_replication_admin LOGIN REPLICATION;
CREATE ROLE dashboard_user NOSUPERUSER CREATEDB CREATEROLE NOINHERIT;
CREATE ROLE pgbouncer NOLOGIN;
CREATE ROLE authenticator NOINHERIT LOGIN;

-- Role memberships
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_auth_admin TO supabase_admin;
GRANT supabase_storage_admin TO supabase_admin;
GRANT supabase_functions_admin TO supabase_admin;
GRANT dashboard_user TO supabase_admin;
GRANT postgres TO supabase_admin WITH ADMIN OPTION;

-- Search paths
ALTER ROLE supabase_auth_admin SET search_path TO auth, public;
ALTER ROLE supabase_storage_admin SET search_path TO storage, public;

-- Database-level privileges
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_storage_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_functions_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO dashboard_user;

-- -----------------------------------------------------------------------------
-- 2. Schemas
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS payload;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _realtime;

-- -----------------------------------------------------------------------------
-- 3. Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- -----------------------------------------------------------------------------
-- 4. Schema permissions
-- -----------------------------------------------------------------------------

-- Public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Auth
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_auth_admin;

-- Storage
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT USAGE ON SCHEMA storage TO authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON SEQUENCES TO supabase_storage_admin;

-- Realtime
GRANT ALL ON SCHEMA realtime TO supabase_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- Payload (managed by payload-cms via supabase_admin)
GRANT ALL ON SCHEMA payload TO supabase_admin;
GRANT USAGE ON SCHEMA payload TO postgres, authenticated, service_role, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT ALL ON TABLES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT ALL ON SEQUENCES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA payload GRANT SELECT ON TABLES TO authenticated, anon;

-- PG Cron
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
