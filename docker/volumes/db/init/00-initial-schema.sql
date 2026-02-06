-- Create roles
create role anon noinherit;
create role service_role noinherit;
create role authenticated noinherit;
create role authenticator noinherit login password 'postgres';
create role supabase_admin noinherit login password 'postgres';
create role supabase_auth_admin noinherit login password 'postgres';
create role supabase_storage_admin noinherit login password 'postgres';
create role supabase_replication_admin noinherit login password 'postgres';

-- Grant privileges
grant anon to authenticator;
grant authenticated to authenticator;
grant service_role to authenticator;
grant supabase_admin to authenticator;

-- Create Schema
create schema if not exists public;

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pgjwt";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";

-- Grant usage
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- Setup basic auth schema (GoTrue expects this or will create it if role has permission)
-- We leave it to GoTrue to initialize if configured correctly, but granting generic access helps.
grant all privileges on database postgres to supabase_admin;
grant all privileges on database postgres to supabase_auth_admin;
grant all privileges on database postgres to supabase_storage_admin;

-- PG Cron grants
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
