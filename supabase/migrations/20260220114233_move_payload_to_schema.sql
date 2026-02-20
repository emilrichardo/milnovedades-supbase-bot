-- This migration creates the new schema and moves existing Payload tables if they were in public.

CREATE SCHEMA IF NOT EXISTS payload;

-- Move Payload tables from public to the new payload schema
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE public.users SET SCHEMA payload;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users_sessions') THEN
        ALTER TABLE public.users_sessions SET SCHEMA payload;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'media') THEN
        ALTER TABLE public.media SET SCHEMA payload;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payload_kv') THEN
        ALTER TABLE public.payload_kv SET SCHEMA payload;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payload_locked_documents') THEN
        ALTER TABLE public.payload_locked_documents SET SCHEMA payload;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payload_locked_documents_rels') THEN
        ALTER TABLE public.payload_locked_documents_rels SET SCHEMA payload;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payload_preferences') THEN
        ALTER TABLE public.payload_preferences SET SCHEMA payload;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payload_preferences_rels') THEN
        ALTER TABLE public.payload_preferences_rels SET SCHEMA payload;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payload_migrations') THEN
        ALTER TABLE public.payload_migrations SET SCHEMA payload;
    END IF;

    -- We can drop the sync_config from payload as we are removing it from payload CMS completely
    -- It may be in public or payload schema.
    DROP TABLE IF EXISTS public.sincronizacion_aleph CASCADE;
    DROP TABLE IF EXISTS payload.sincronizacion_aleph CASCADE;
END $$;
