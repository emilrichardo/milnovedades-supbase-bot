CREATE TABLE IF NOT EXISTS "sincronizacion_aleph" (
	"id" serial PRIMARY KEY NOT NULL,
	"products_active" boolean DEFAULT true,
	"products_cron" varchar DEFAULT '0 2 * * *' NOT NULL,
	"clients_active" boolean DEFAULT true,
	"clients_cron" varchar DEFAULT '0 0 * * *' NOT NULL,
	"comprobantes_active" boolean DEFAULT true,
	"comprobantes_cron" varchar DEFAULT '0 3 * * *' NOT NULL,
	"updated_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone
);

-- Insertar una fila inicial para el Global de Payload
INSERT INTO "sincronizacion_aleph" ("id", "products_active", "products_cron", "clients_active", "clients_cron", "comprobantes_active", "comprobantes_cron", "updated_at", "created_at")
VALUES (1, true, '0 2 * * *', true, '0 0 * * *', true, '0 3 * * *', now(), now())
ON CONFLICT ("id") DO NOTHING;

-- Registro de migración para Payload
INSERT INTO "payload_migrations" (name, batch, updated_at, created_at)
VALUES ('20260219_224819_add_sync_global_table', 1, now(), now());
