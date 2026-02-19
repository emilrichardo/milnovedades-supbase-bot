-- Migration: Create Clientes Table (Consolidated)
-- Description: Defines the schema for the 'clientes' collection.

-- Drop table if it exists to ensure clean state during refactoring/re-applying
DROP TABLE IF EXISTS public.clientes CASCADE;

CREATE TABLE public.clientes (
    id bigserial NOT NULL,
    codigo_cliente bigint, -- Aleph ID
    razon_social text,
    cuit text,
    lis_pre integer,
    email text,
    contacto text,
    descuento numeric,
    descuento_item numeric,
    fecha_cambio timestamp with time zone,
    fecha_alta timestamp with time zone,
    cp_ent text,
    localidad_ent text,
    provincia_ent integer,
    provincia_ent_desc text,
    cot_calle text,
    cot_altura text,
    cot_piso text,
    cot_dpto text,
    horario_entrega text,
    -- Additional fields added in later updates
    nombre text,
    direccion text,
    localidad text,
    telefono text,
    cod_pos text,
    provincia integer,
    expreso integer,
    dir_ent text,
    pcia_desc text,
    tip_ins integer,
    tip_ins_desc text,

    raw_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT clientes_pkey PRIMARY KEY (id),
    CONSTRAINT clientes_codigo_cliente_key UNIQUE (codigo_cliente)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS clientes_codigo_cliente_idx ON public.clientes USING btree (codigo_cliente) TABLESPACE pg_default;
