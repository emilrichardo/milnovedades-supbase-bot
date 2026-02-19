-- Migration: Sync Configuration & Cron Scheduling
-- Description: Creates a table to manage sync schedules and auto-updates pg_cron jobs.

-- Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create Sync Config Table
CREATE TABLE IF NOT EXISTS public.sync_config (
    collection text PRIMARY KEY, -- 'clients', 'vouchers', 'products'
    cron_expression text NOT NULL, -- e.g., '0 0 * * *' (daily at midnight)
    is_active boolean DEFAULT true,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert default configurations
INSERT INTO public.sync_config (collection, cron_expression, is_active) VALUES
    ('clients', '0 0 * * *', true),   -- Daily at midnight
    ('products', '0 */2 * * *', true), -- Every 2 hours
    ('vouchers', '*/30 * * * *', true) -- Every 30 minutes
ON CONFLICT (collection) DO NOTHING;


-- Function to update cron jobs when config changes
CREATE OR REPLACE FUNCTION public.update_cron_schedule()
RETURNS TRIGGER AS $function$
DECLARE
    job_name text := 'sync-' || NEW.collection;
    -- Use 'app.api_url' session variable for flexibility, or fallback to default local URL
    -- To set in production: ALTER DATABASE postgres SET app.api_url = 'http://your-production-url/functions/v1/sync-aleph';
    base_url text := current_setting('app.api_url', true);
    default_url text := 'http://127.0.0.1:54321/functions/v1/sync-aleph'; -- Local Self-Hosted / Dev Default
    api_url_base text;
    full_url text;
BEGIN
    -- Determine API URL
    IF base_url IS NULL OR base_url = '' THEN
        api_url_base := default_url || '?type=';
    ELSE
        api_url_base := base_url || '?type=';
    END IF;

    -- Unschedule existing job to avoid duplicates or stale schedules
    PERFORM cron.unschedule(job_name);

    -- If active, schedule new job
    IF NEW.is_active THEN
        full_url := api_url_base || NEW.collection;

        -- Schedule the job using pg_net to call the Edge Function
        -- We use format() to safely construct the SQL string with the URL
        PERFORM cron.schedule(
            job_name,
            NEW.cron_expression,
            format($sql$
                SELECT net.http_post(
                    url := %L,
                    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
                );
            $sql$, full_url)
        );
    END IF;

    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Trigger to call the function on update/insert
DROP TRIGGER IF EXISTS trigger_update_cron_schedule ON public.sync_config;
CREATE TRIGGER trigger_update_cron_schedule
AFTER INSERT OR UPDATE OF cron_expression, is_active ON public.sync_config
FOR EACH ROW EXECUTE FUNCTION public.update_cron_schedule();

-- Initial run to schedule standard jobs based on inserted defaults
-- This update will trigger the function for all rows
UPDATE public.sync_config SET updated_at = now();
