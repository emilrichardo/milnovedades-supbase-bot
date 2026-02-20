#!/bin/bash
set -e

# Crear base de datos payload_db si no existe
DB_EXISTS=$(psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='payload_db'")
if [ "$DB_EXISTS" != "1" ]; then
    psql -U postgres -c "CREATE DATABASE payload_db;"
    echo "Base de datos payload_db creada."
else
    echo "Base de datos payload_db ya existe."
fi

# Ajustar rol supabase_auth_admin
psql -U postgres -c "
DO \$\$
BEGIN
   IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      ALTER ROLE supabase_auth_admin WITH SUPERUSER LOGIN PASSWORD 'f879e13b86027c9a6294d1f5e82b7c4193d56d782e1c94a5e0b2c3d4f5a6b7c8';
   ELSE
      CREATE ROLE supabase_auth_admin WITH SUPERUSER LOGIN PASSWORD 'f879e13b86027c9a6294d1f5e82b7c4193d56d782e1c94a5e0b2c3d4f5a6b7c8';
   END IF;
END \$\$;
"
echo "Rol supabase_auth_admin ajustado con exitosamente."
