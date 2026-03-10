import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."asociados_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."asociados" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dni" varchar NOT NULL,
  	"celular" varchar NOT NULL,
  	"codigo_cliente" numeric,
  	"nombre" varchar,
  	"razon_social" varchar,
  	"cuit" varchar,
  	"lis_pre" numeric,
  	"contacto" varchar,
  	"fecha_alta" timestamp(3) with time zone,
  	"cp_ent" varchar,
  	"localidad_ent" varchar,
  	"provincia_ent" numeric,
  	"provincia_ent_desc" varchar,
  	"cot_calle" varchar,
  	"cot_altura" varchar,
  	"cot_piso" varchar,
  	"cot_dpto" varchar,
  	"direccion" varchar,
  	"localidad" varchar,
  	"telefono" varchar,
  	"cod_pos" varchar,
  	"provincia" numeric,
  	"dir_ent" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."users" ALTER COLUMN "rol" SET DEFAULT 'Vendedor';
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "asociados_id" integer;
  ALTER TABLE "payload"."payload_preferences_rels" ADD COLUMN "asociados_id" integer;
  ALTER TABLE "payload"."asociados_sessions" ADD CONSTRAINT "asociados_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."asociados"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "asociados_sessions_order_idx" ON "payload"."asociados_sessions" USING btree ("_order");
  CREATE INDEX "asociados_sessions_parent_id_idx" ON "payload"."asociados_sessions" USING btree ("_parent_id");
  CREATE INDEX "asociados_updated_at_idx" ON "payload"."asociados" USING btree ("updated_at");
  CREATE INDEX "asociados_created_at_idx" ON "payload"."asociados" USING btree ("created_at");
  CREATE UNIQUE INDEX "asociados_email_idx" ON "payload"."asociados" USING btree ("email");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_asociados_fk" FOREIGN KEY ("asociados_id") REFERENCES "payload"."asociados"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_asociados_fk" FOREIGN KEY ("asociados_id") REFERENCES "payload"."asociados"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_asociados_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("asociados_id");
  CREATE INDEX "payload_preferences_rels_asociados_id_idx" ON "payload"."payload_preferences_rels" USING btree ("asociados_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."asociados_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."asociados" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."asociados_sessions" CASCADE;
  DROP TABLE "payload"."asociados" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_asociados_fk";
  
  ALTER TABLE "payload"."payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_asociados_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_asociados_id_idx";
  DROP INDEX "payload"."payload_preferences_rels_asociados_id_idx";
  ALTER TABLE "payload"."users" ALTER COLUMN "rol" SET DEFAULT 'vendedor';
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "asociados_id";
  ALTER TABLE "payload"."payload_preferences_rels" DROP COLUMN "asociados_id";`)
}
