#!/bin/bash
set -e

# Crear base de datos payload_db si no existe
DB_EXISTS=$(psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='payload_db'")
if [ "$DB_EXISTS" != "1" ]; then
    psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE payload_db;"
    echo "Base de datos payload_db creada."
else
    echo "Base de datos payload_db ya existe."
fi

# Ajustar roles para usar la clave del entorno
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
echo "Roles ajustados exitosamente con la contraseña del entorno."
