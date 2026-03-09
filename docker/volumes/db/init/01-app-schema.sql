-- =============================================================================
-- Application Schema - Public Tables
-- All business data tables in their final definitive state.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes (
    id bigserial NOT NULL,
    codigo_cliente bigint,
    nombre text,
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

-- ---------------------------------------------------------------------------
-- COMPROBANTES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comprobantes (
    id bigserial NOT NULL,
    cliente_id bigint,
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

-- ---------------------------------------------------------------------------
-- COMPROBANTES_ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comprobantes_items (
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

-- ---------------------------------------------------------------------------
-- PRODUCTS_DATA
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products_data (
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

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
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

-- ---------------------------------------------------------------------------
-- SYNC_CONFIG + CRON SCHEDULING
-- ---------------------------------------------------------------------------
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

    -- Remove existing job to avoid duplicates
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
        PERFORM cron.unschedule(job_name);
    END IF;

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

-- Default sync schedules (final values)
INSERT INTO public.sync_config (collection, cron_expression, is_active) VALUES
    ('clients',       '0 0 * * *',   true),   -- Daily at midnight
    ('products',      '0 */4 * * *', true),   -- Every 4 hours
    ('comprobantes',  '0 */2 * * *', true)    -- Every 2 hours
ON CONFLICT (collection) DO UPDATE
    SET cron_expression = EXCLUDED.cron_expression,
        updated_at = now();

-- Trigger cron scheduling for all rows
UPDATE public.sync_config SET updated_at = now();
