-- Migration: Sync Configuration & Cron Scheduling
-- Description: Creates sync_config table and pg_cron jobs for Aleph ERP synchronization.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.sync_config (
    collection text PRIMARY KEY,
    cron_expression text NOT NULL,
    is_active boolean DEFAULT true,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Function to update pg_cron jobs when config changes
CREATE OR REPLACE FUNCTION public.update_cron_schedule()
RETURNS TRIGGER AS $function$
DECLARE
    job_name text := 'sync-' || NEW.collection;
    base_url text := current_setting('app.api_url', true);
    default_url text := 'http://edge-runtime:9000/sync-aleph';
    api_url_base text;
    full_url text;
BEGIN
    IF base_url IS NULL OR base_url = '' THEN
        api_url_base := default_url || '?type=';
    ELSE
        api_url_base := base_url || '?type=';
    END IF;

    PERFORM cron.unschedule(job_name);

    IF NEW.is_active THEN
        full_url := api_url_base || NEW.collection;
        PERFORM cron.schedule(
            job_name,
            NEW.cron_expression,
            format($sql$
                SELECT net.http_post(
                    url := %L,
                    headers := '{"Content-Type": "application/json"}'::jsonb
                );
            $sql$, full_url)
        );
    END IF;

    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cron_schedule ON public.sync_config;
CREATE TRIGGER trigger_update_cron_schedule
AFTER INSERT OR UPDATE OF cron_expression, is_active ON public.sync_config
FOR EACH ROW EXECUTE FUNCTION public.update_cron_schedule();

-- Final schedule values: clients daily, products every 4h, comprobantes every 2h
INSERT INTO public.sync_config (collection, cron_expression, is_active) VALUES
    ('clients',       '0 0 * * *',   true),
    ('products',      '0 */4 * * *', true),
    ('comprobantes',  '0 */2 * * *', true)
ON CONFLICT (collection) DO UPDATE
    SET cron_expression = EXCLUDED.cron_expression,
        updated_at = now();

UPDATE public.sync_config SET updated_at = now();
