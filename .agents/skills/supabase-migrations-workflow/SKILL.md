---
name: supabase-migrations-workflow
description: Flujo de trabajo y mejores prácticas para gestionar migraciones estructuradas en Supabase y modificar esquemas de base de datos de forma ordenada. SIEMPRE responder en español.
---

# Flujo de Trabajo para Migraciones de Supabase

Esta skill define el estándar que DEBES seguir al manejar cualquier cambio en la base de datos de Supabase.

## REGLA DE IDIOMA CRÍTICA Y OBLIGATORIA

**SIEMPRE DEBES RESPONDER Y COMUNICARTE CON EL USUARIO EN ESPAÑOL.** Sin excepciones.

## Protocolo de Gestión de Migraciones

Al recibir una orden para modificar o crear tablas/políticas en la base de datos, sigue este procedimiento estricto:

### 1. Evaluar el Estado Actual

Antes de hacer cualquier modificación, revisa la carpeta `supabase/migrations/`. Entiende cómo están estructurados y nombrados los archivos actuales (usualmente llevan un prefijo de timestamp, ej. `20240220000003_sync_config.sql`).

### 2. Modificación vs. Creación

Debes decidir de forma inteligente cómo aplicar los cambios:

- **Actualización en Desarrollo (Modificación de SQL):** Si se te pide "actualizar", "corregir" o "modificar" un script de base de datos reciente o en el que el usuario ya está trabajando (por ejemplo, corregir un error en `20240220000003_sync_config.sql`), **edita directamente** ese archivo de migración SQL con los cambios requeridos de forma precisa. Asegúrate de arreglar el código SQL internamente para evitar conflictos.
- **Cambios Nuevos Secuenciales (Nuevos Archivos):** Si se añade una característica estructural _completamente nueva_, no debes alterar las migraciones del pasado. Crea un **nuevo** archivo utilizando la misma nomenclatura de timestamp (ej: `[AÑO][MES][DÍA][HORA][MIN][SEG]_descripcion.sql`) y colócalo en `supabase/migrations/`.

### 3. Código SQL y Mejores Prácticas

Mientras creas o actualizas los scripts de SQL:

1. Asegúrate de incluir y respetar las instrucciones correspondientes a los **Drop/Create** (si estás editando un script existente, usar `CREATE OR REPLACE` o `IF NOT EXISTS` si aplica).
2. Agrega las políticas de RLS, triggers y funciones necesarias siempre verificando que sigan un orden lógico.
3. Consulta implícitamente otras sugerencias de rendimiento (basándote en `supabase-postgres-best-practices`).

### 4. Instruir sobre los Próximos Pasos (siempre en español)

Cuando termines de hacer tu ajuste a los archivos, debes decirle al usuario exactamente qué acaba de pasar y qué debe hacer, por ejemplo:

- _"He actualizado el script XYZ"_ o _"He creado la nueva migración XYZ"_.
- _"Para aplicar estos cambios en tu entorno local de Supabase, puedes ejecutar: `supabase db reset` (si actualizamos un archivo existente) o `supabase migration up`."_

Si se están alterando esquemas que afecten la interfaz, no olvides advertir sobre la regestión de sus Types (si utilizaran Supabase para generar TypeScript), por ejemplo con `supabase gen types`.
