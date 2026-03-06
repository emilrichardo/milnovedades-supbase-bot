import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_users_rol" AS ENUM('Admin', 'Encargado', 'Vendedor');
  CREATE TYPE "payload"."enum_agentes_accesos_tablas_tabla" AS ENUM('productos', 'clientes', 'ventas', 'inventario', 'informacion_general');
  CREATE TYPE "payload"."enum_agentes_accesos_tablas_permiso" AS ENUM('lectura', 'escritura', 'lectura_escritura');
  CREATE TYPE "payload"."enum_eventos_tipo_evento" AS ENUM('sorteo', 'puntos');
  CREATE TABLE "payload"."eventos_reglas_puntuacion_categorias_aplicables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"categoria" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."eventos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"descripcion" varchar,
  	"banner_id" integer,
  	"fecha_inicio" timestamp(3) with time zone NOT NULL,
  	"fecha_fin" timestamp(3) with time zone,
  	"activo" boolean DEFAULT true,
  	"tipo_evento" "payload"."enum_eventos_tipo_evento" NOT NULL,
  	"reglas_puntuacion_multiplicador_monto_base" numeric NOT NULL,
  	"reglas_puntuacion_multiplicador_puntos_generados" numeric NOT NULL,
  	"reglas_puntuacion_monto_minimo" numeric,
  	"reglas_puntuacion_tope_por_compra" numeric,
  	"terminos_condiciones" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."agentes_accesos_tablas" DROP CONSTRAINT "agentes_accesos_tablas_parent_fk";
  
  DROP INDEX "payload"."agentes_accesos_tablas_parent_idx";
  DROP INDEX "payload"."agentes_accesos_tablas_order_idx";
  ALTER TABLE "payload"."agentes_accesos_tablas" ALTER COLUMN "id" SET DATA TYPE varchar;
  ALTER TABLE "payload"."users" ADD COLUMN "rol" "payload"."enum_users_rol" DEFAULT 'vendedor' NOT NULL;
  ALTER TABLE "payload"."agentes_accesos_tablas" ADD COLUMN "_order" integer NOT NULL;
  ALTER TABLE "payload"."agentes_accesos_tablas" ADD COLUMN "_parent_id" integer NOT NULL;
  ALTER TABLE "payload"."agentes_accesos_tablas" ADD COLUMN "tabla" "payload"."enum_agentes_accesos_tablas_tabla" NOT NULL;
  ALTER TABLE "payload"."agentes_accesos_tablas" ADD COLUMN "permiso" "payload"."enum_agentes_accesos_tablas_permiso" DEFAULT 'lectura' NOT NULL;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "eventos_id" integer;
  ALTER TABLE "payload"."eventos_reglas_puntuacion_categorias_aplicables" ADD CONSTRAINT "eventos_reglas_puntuacion_categorias_aplicables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."eventos" ADD CONSTRAINT "eventos_banner_id_media_id_fk" FOREIGN KEY ("banner_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "eventos_reglas_puntuacion_categorias_aplicables_order_idx" ON "payload"."eventos_reglas_puntuacion_categorias_aplicables" USING btree ("_order");
  CREATE INDEX "eventos_reglas_puntuacion_categorias_aplicables_parent_id_idx" ON "payload"."eventos_reglas_puntuacion_categorias_aplicables" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "eventos_slug_idx" ON "payload"."eventos" USING btree ("slug");
  CREATE INDEX "eventos_banner_idx" ON "payload"."eventos" USING btree ("banner_id");
  CREATE INDEX "eventos_updated_at_idx" ON "payload"."eventos" USING btree ("updated_at");
  CREATE INDEX "eventos_created_at_idx" ON "payload"."eventos" USING btree ("created_at");
  ALTER TABLE "payload"."agentes_accesos_tablas" ADD CONSTRAINT "agentes_accesos_tablas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."agentes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "payload"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "agentes_accesos_tablas_parent_id_idx" ON "payload"."agentes_accesos_tablas" USING btree ("_parent_id");
  CREATE INDEX "payload_locked_documents_rels_eventos_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("eventos_id");
  CREATE INDEX "agentes_accesos_tablas_order_idx" ON "payload"."agentes_accesos_tablas" USING btree ("_order");
  ALTER TABLE "payload"."agentes_accesos_tablas" DROP COLUMN "order";
  ALTER TABLE "payload"."agentes_accesos_tablas" DROP COLUMN "parent_id";
  ALTER TABLE "payload"."agentes_accesos_tablas" DROP COLUMN "value";
  DROP TYPE "payload"."enum_agentes_accesos_tablas";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_agentes_accesos_tablas" AS ENUM('productos', 'clientes', 'ventas', 'inventario', 'informacion_general');
  ALTER TABLE "payload"."eventos_reglas_puntuacion_categorias_aplicables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."eventos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."eventos_reglas_puntuacion_categorias_aplicables" CASCADE;
  DROP TABLE "payload"."eventos" CASCADE;
  ALTER TABLE "payload"."agentes_accesos_tablas" DROP CONSTRAINT "agentes_accesos_tablas_parent_id_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_eventos_fk";
  
  DROP INDEX "payload"."agentes_accesos_tablas_parent_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_eventos_id_idx";
  DROP INDEX "payload"."agentes_accesos_tablas_order_idx";
  ALTER TABLE "payload"."agentes_accesos_tablas" ALTER COLUMN "id" SET DATA TYPE serial;
  ALTER TABLE "payload"."agentes_accesos_tablas" ADD COLUMN "order" integer NOT NULL;
  ALTER TABLE "payload"."agentes_accesos_tablas" ADD COLUMN "parent_id" integer NOT NULL;
  ALTER TABLE "payload"."agentes_accesos_tablas" ADD COLUMN "value" "payload"."enum_agentes_accesos_tablas";
  ALTER TABLE "payload"."agentes_accesos_tablas" ADD CONSTRAINT "agentes_accesos_tablas_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."agentes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "agentes_accesos_tablas_parent_idx" ON "payload"."agentes_accesos_tablas" USING btree ("parent_id");
  CREATE INDEX "agentes_accesos_tablas_order_idx" ON "payload"."agentes_accesos_tablas" USING btree ("order");
  ALTER TABLE "payload"."users" DROP COLUMN "rol";
  ALTER TABLE "payload"."agentes_accesos_tablas" DROP COLUMN "_order";
  ALTER TABLE "payload"."agentes_accesos_tablas" DROP COLUMN "_parent_id";
  ALTER TABLE "payload"."agentes_accesos_tablas" DROP COLUMN "tabla";
  ALTER TABLE "payload"."agentes_accesos_tablas" DROP COLUMN "permiso";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "eventos_id";
  DROP TYPE "payload"."enum_users_rol";
  DROP TYPE "payload"."enum_agentes_accesos_tablas_tabla";
  DROP TYPE "payload"."enum_agentes_accesos_tablas_permiso";
  DROP TYPE "payload"."enum_eventos_tipo_evento";`)
}
