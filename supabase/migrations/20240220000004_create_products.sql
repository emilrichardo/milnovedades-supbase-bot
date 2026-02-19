-- Migration: Create Products & Categories Tables (Restored)
-- Description: Defines the schema for 'products_data' and 'categories' collections.

-- Drop tables if exist
DROP TABLE IF EXISTS public.products_data CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- Create table: products_data
CREATE TABLE public.products_data (
  id bigserial NOT NULL,
  stock_json jsonb,
  imagen text,
  images jsonb DEFAULT '[]'::jsonb,
  precio_minorista numeric,
  precio_mayorista numeric,
  precio_emprendedor numeric,
  codigo_product text,
  nombre text,
  permalink text,
  rubro text,
  subrubro text,
  sku text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_data_pkey PRIMARY KEY (id),
  CONSTRAINT products_data_codigo_product_key UNIQUE (codigo_product)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS products_data_codigo_product_idx ON public.products_data USING btree (codigo_product);


-- Create table: categories
CREATE TABLE public.categories (
  id bigserial NOT NULL,
  nombre text NOT NULL,
  slug text NOT NULL,
  parent_id bigint REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_slug_key UNIQUE (slug)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories USING btree (parent_id);
CREATE INDEX IF NOT EXISTS categories_slug_idx ON public.categories USING btree (slug);
