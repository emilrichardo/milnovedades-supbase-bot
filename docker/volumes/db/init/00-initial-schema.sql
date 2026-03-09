-- Create roles
create role postgres superuser login password 'postgres';
create role anon noinherit;
create role service_role noinherit;
create role authenticated noinherit;
create role authenticator noinherit login password 'postgres';
create role supabase_auth_admin noinherit login password 'postgres';
create role supabase_storage_admin noinherit login password 'postgres';
create role supabase_replication_admin noinherit login password 'postgres';

-- Grant privileges
grant anon to authenticator;
grant authenticated to authenticator;
grant service_role to authenticator;
grant supabase_admin to authenticator;

-- Create Schemas
create schema if not exists public;
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists _realtime;
create schema if not exists realtime;
create schema if not exists extensions;

-- Extensions
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pgjwt" with schema extensions;
create extension if not exists "pg_cron";
create extension if not exists "pg_net";

-- Grant usage on schemas
grant usage on schema public to postgres, anon, authenticated, service_role;
grant usage on schema extensions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- Grant database-level privileges
grant all privileges on database postgres to supabase_admin;
grant all privileges on database postgres to supabase_auth_admin;
grant all privileges on database postgres to supabase_storage_admin;

-- Grant schema ownership
alter schema auth owner to supabase_auth_admin;
alter schema storage owner to supabase_storage_admin;
alter schema _realtime owner to supabase_admin;
alter schema realtime owner to supabase_admin;

-- PG Cron grants
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
