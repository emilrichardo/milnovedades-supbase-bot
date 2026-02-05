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

-- Add indexes
create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists categories_slug_idx on public.categories (slug);
