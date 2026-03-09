-- Fix for missing tables in payload schema

CREATE TYPE "payload"."enum_agentes_accesos_tablas" AS ENUM('productos', 'clientes', 'ventas', 'inventario', 'informacion_general');
CREATE TYPE "payload"."enum_agentes_modelo" AS ENUM('gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-5-sonnet', 'gemini-1.5-pro', 'gemini-1.5-flash');

CREATE TABLE IF NOT EXISTS "payload"."agentes" (
    "id" serial PRIMARY KEY NOT NULL,
    "nombre" varchar NOT NULL,
    "is_main" boolean DEFAULT false,
    "rol" varchar NOT NULL,
    "es_subagente" boolean DEFAULT false,
    "agente_padre_id" integer,
    "prompt_sistema" varchar NOT NULL,
    "temperatura" numeric DEFAULT 0.7,
    "personalidad" varchar,
    "modelo" "payload"."enum_agentes_modelo" DEFAULT 'gpt-4o' NOT NULL,
    "api_key" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payload"."agentes_accesos_tablas" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "payload"."enum_agentes_accesos_tablas",
    "id" serial PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS "payload"."conversaciones" (
    "id" serial PRIMARY KEY NOT NULL,
    "id_consulta" varchar NOT NULL,
    "id_cliente" varchar NOT NULL,
    "resumen" varchar,
    "documentos" jsonb,
    "actividades" jsonb,
    "notas" varchar,
    "calendario" timestamp(3) with time zone,
    "tipo_consulta" varchar,
    "estado_consulta" varchar,
    "producto_consultado" varchar,
    "producto_ofrecido" varchar,
    "temperatura" varchar,
    "estado_embudo" varchar,
    "metodo_pago" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payload"."informacion_general" (
    "id" serial PRIMARY KEY NOT NULL,
    "nombre_empresa" varchar NOT NULL,
    "datos_contacto_email" varchar,
    "datos_contacto_telefono" varchar,
    "informacion_marca" jsonb,
    "logo_id" integer,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
);

CREATE TABLE IF NOT EXISTS "payload"."informacion_general_sucursales" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "nombre" varchar NOT NULL,
    "direccion" varchar NOT NULL,
    "horarios_atencion" varchar,
    "telefono_sucursal" varchar
);

-- Eventos (mentioned in config but maybe missing from initial ts)
CREATE TABLE IF NOT EXISTS "payload"."eventos" (
    "id" serial PRIMARY KEY NOT NULL,
    "nombre" varchar NOT NULL,
    "descripcion" varchar,
    "fecha" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

-- Constraints
ALTER TABLE "payload"."agentes_accesos_tablas" ADD CONSTRAINT "agentes_accesos_tablas_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."agentes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload"."agentes" ADD CONSTRAINT "agentes_agente_padre_id_agentes_id_fk" FOREIGN KEY ("agente_padre_id") REFERENCES "payload"."agentes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payload"."informacion_general_sucursales" ADD CONSTRAINT "informacion_general_sucursales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."informacion_general"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload"."informacion_general" ADD CONSTRAINT "informacion_general_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;

-- Indexes
CREATE INDEX IF NOT EXISTS "agentes_accesos_tablas_order_idx" ON "payload"."agentes_accesos_tablas" USING btree ("order");
CREATE INDEX IF NOT EXISTS "agentes_accesos_tablas_parent_idx" ON "payload"."agentes_accesos_tablas" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "agentes_agente_padre_idx" ON "payload"."agentes" USING btree ("agente_padre_id");
CREATE INDEX IF NOT EXISTS "agentes_updated_at_idx" ON "payload"."agentes" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "agentes_created_at_idx" ON "payload"."agentes" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "conversaciones_updated_at_idx" ON "payload"."conversaciones" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "conversaciones_created_at_idx" ON "payload"."conversaciones" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "informacion_general_sucursales_order_idx" ON "payload"."informacion_general_sucursales" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "informacion_general_sucursales_parent_id_idx" ON "payload"."informacion_general_sucursales" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "informacion_general_logo_idx" ON "payload"."informacion_general" USING btree ("logo_id");
