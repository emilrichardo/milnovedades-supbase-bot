-- Enable extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Create table public.products_data
create table if not exists public.products_data (
  id bigserial not null,
  stock_json jsonb null,
  imagen text null,
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

select cron.schedule(
    'sync-aleph-hourly',
    '0 * * * *', -- Every hour
    $$
    select
      net.http_post(
          url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-aleph',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);
