-- Migration: Update comprobantes sync to every 2 hours
-- The cron job fetches from the last loaded date (capped at 30-day windows per call)
-- so it incrementally catches up without timing out.

UPDATE public.sync_config
SET
    cron_expression = '0 */2 * * *',
    updated_at = now()
WHERE collection = 'comprobantes';
