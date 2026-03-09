#!/bin/bash
# Set passwords for all Supabase service roles.
# Does NOT use set -e or ON_ERROR_STOP — missing roles are skipped gracefully.

echo "Setting role passwords..."

psql --username "${POSTGRES_USER:-postgres}" -d postgres <<EOSQL
DO \$\$
DECLARE
  r TEXT;
  roles TEXT[] := ARRAY[
    'postgres',
    'authenticator',
    'supabase_admin',
    'supabase_auth_admin',
    'supabase_storage_admin',
    'supabase_replication_admin'
  ];
BEGIN
  FOREACH r IN ARRAY roles LOOP
    BEGIN
      EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', r, '$POSTGRES_PASSWORD');
    EXCEPTION WHEN undefined_object THEN
      RAISE NOTICE 'Role % does not exist, skipping.', r;
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not alter role %: %', r, SQLERRM;
    END;
  END LOOP;

  BEGIN
    ALTER ROLE supabase_auth_admin SET search_path = "auth", "public";
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER ROLE supabase_storage_admin SET search_path = "storage", "public";
  EXCEPTION WHEN OTHERS THEN NULL; END;
END
\$\$;
EOSQL

echo "Role setup complete."
