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

-- Add index for faster lookups
create index if not exists products_data_codigo_product_idx on public.products_data (codigo_product);
