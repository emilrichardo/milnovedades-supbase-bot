#!/bin/bash
set -e

# Set passwords for all Supabase service roles using POSTGRES_PASSWORD from env
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d postgres <<-EOSQL
    ALTER ROLE postgres WITH LOGIN PASSWORD '$POSTGRES_PASSWORD';
    ALTER ROLE authenticator WITH LOGIN PASSWORD '$POSTGRES_PASSWORD';
    ALTER ROLE supabase_admin WITH SUPERUSER LOGIN PASSWORD '$POSTGRES_PASSWORD';
    ALTER ROLE supabase_auth_admin WITH SUPERUSER LOGIN PASSWORD '$POSTGRES_PASSWORD';
    ALTER ROLE supabase_auth_admin SET search_path = "auth", "public";
    ALTER ROLE supabase_storage_admin WITH SUPERUSER LOGIN PASSWORD '$POSTGRES_PASSWORD';
    ALTER ROLE supabase_storage_admin SET search_path = "storage", "public";
    ALTER ROLE supabase_replication_admin WITH SUPERUSER LOGIN PASSWORD '$POSTGRES_PASSWORD';
EOSQL
echo "Roles updated successfully with environment password."
