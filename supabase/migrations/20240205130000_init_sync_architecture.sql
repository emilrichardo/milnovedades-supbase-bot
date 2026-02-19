-- Enable extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Create table public.products_data
create table if not exists public.products_data (
  id bigserial not null,
  stock_json jsonb null,
  imagen text null,
  images jsonb default '[]'::jsonb,
  precio_minorista numeric null,
  precio_mayorista numeric null,
  precio_emprendedor numeric null,
  codigo_product text null,
  nombre text null,
  permalink text null,
  rubro text null,
  subrubro text null,
  sku text null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint products_data_pkey primary key (id),
  constraint products_data_codigo_product_key unique (codigo_product)
) TABLESPACE pg_default;

create index if not exists products_data_codigo_product_idx on public.products_data (codigo_product);

-- Create table public.categories
create table if not exists public.categories (
  id bigserial not null,
  nombre text not null,
  slug text not null,
  parent_id bigint null references public.categories(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint categories_pkey primary key (id),
  constraint categories_slug_key unique (slug)
) TABLESPACE pg_default;

create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists categories_slug_idx on public.categories (slug);

-- Cron Schedule (Example - User must replace URL and KEY)
-- Unscheduling if exists to avoid duplicates
-- select cron.unschedule('sync-aleph-hourly');

-- Cron Schedule
-- Dynamic URL based on environment (set via postgresql.conf or ALTER SYSTEM if needed)
-- Default to internal docker service name 'botmilu' for production speed

DO $$
DECLARE
  -- Check for a custom setting, or default to internal docker DNS
  service_url text := current_setting('app.service_url', true);
  auth_header jsonb;
BEGIN
  IF service_url IS NULL OR service_url = '' THEN
      -- Fallback/Default for Docker/Coolify internal network
      service_url := 'http://botmilu:8000';
  END IF;

  auth_header := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb;

  -- Cleanup old schedules
  -- Cleanup old schedules
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sync-aleph-hourly';

  PERFORM cron.schedule(
    'sync-aleph-4h',
    '0 */4 * * *', -- Every 4 hours
    format(
      'select net.http_post(
          url:=''%s'',
          headers:=''%s'',
          body:=''{}''::jsonb
      ) as request_id;',
      service_url,
      auth_header
    )
  );
END $$;
