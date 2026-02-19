-- Migration: Create Comprobantes & Items Tables (Consolidated)
-- Description: Defines the schema for 'comprobantes' and 'comprobantes_items' collections.

-- Drop tables if exist (items first due to FK constraint)
DROP TABLE IF EXISTS public.comprobantes_items CASCADE;
DROP TABLE IF EXISTS public.comprobantes CASCADE;

-- Create table: comprobantes
CREATE TABLE public.comprobantes (
    id bigserial NOT NULL,
    cliente_id bigint REFERENCES public.clientes(codigo_cliente), -- Links to Clientes
    comprobante_tipo_id int,
    numero text,
    fecha date,
    hora time without time zone,
    estado text,
    deposito text,
    expreso text,
    expreso_cuit text,
    vendedor_id int,
    tipo int,
    descuento numeric,
    porc_descuento numeric,
    iva1 numeric,
    iva2 numeric,
    porc_iva1 numeric,
    porc_iva2 numeric,
    total numeric,
    lis_pre int,
    cotizacion numeric,
    observaciones text,
    fecha_pedido timestamp with time zone,
    cotizacion_uss numeric,
    responsable text,
    estado_comprobante text,
    raw_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT comprobantes_pkey PRIMARY KEY (id),
    CONSTRAINT comprobantes_numero_unique UNIQUE (numero)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS comprobantes_cliente_id_idx ON public.comprobantes USING btree (cliente_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS comprobantes_fecha_idx ON public.comprobantes USING btree (fecha) TABLESPACE pg_default;


-- Create table: comprobantes_items
CREATE TABLE public.comprobantes_items (
    id bigserial NOT NULL,
    comprobante_id bigint REFERENCES public.comprobantes(id) ON DELETE CASCADE,
    producto_codigo text,
    cantidad numeric,
    precio_unitario numeric,
    porc_desc numeric,
    total_linea numeric,
    cantidad2 numeric,
    id_lectura int,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT comprobantes_items_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS comprobantes_items_comprobante_id_idx ON public.comprobantes_items USING btree (comprobante_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS comprobantes_items_producto_codigo_idx ON public.comprobantes_items USING btree (producto_codigo) TABLESPACE pg_default;
