-- Agregar columna permiso a agentes_accesos_tablas
-- Esta columna define el nivel de acceso: lectura, escritura, lectura_escritura

-- 1. Crear el tipo enum si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_agentes_permiso') THEN
        CREATE TYPE "payload"."enum_agentes_permiso" AS ENUM('lectura', 'escritura', 'lectura_escritura');
    END IF;
END $$;

-- 2. Agregar la columna permiso
ALTER TABLE "payload"."agentes_accesos_tablas" 
ADD COLUMN IF NOT EXISTS "permiso" "payload"."enum_agentes_permiso" DEFAULT 'lectura';

-- 3. Actualizar registros existentes con valor por defecto lectura
UPDATE "payload"."agentes_accesos_tablas" 
SET permiso = 'lectura' 
WHERE permiso IS NULL;

-- 4. Agregar constraint de no nulo (después de actualizar los valores)
ALTER TABLE "payload"."agentes_accesos_tablas" 
ALTER COLUMN "permiso" SET DEFAULT 'lectura';

COMMENT ON COLUMN "payload"."agentes_accesos_tablas"."permiso" IS 'Nivel de permiso: lectura, escritura, lectura_escritura';