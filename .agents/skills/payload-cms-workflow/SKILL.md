---
name: payload-cms-workflow
description: Flujo de trabajo y mejores prácticas para el desarrollo e integración de Payload CMS (v3) usando Next.js y bases de datos Postgres. SIEMPRE responder en español.
---

# Flujo de Trabajo para Desarrollo con Payload CMS

Esta skill define el estándar que DEBES seguir al construir o ampliar la arquitectura backend utilizando **Payload CMS**.

## REGLA DE IDIOMA CRÍTICA Y OBLIGATORIA

**SIEMPRE DEBES RESPONDER Y COMUNICARTE CON EL USUARIO EN ESPAÑOL.** Sin excepciones.

## Protocolo de Configuración y Desarrollo

Cuando el usuario pida configurar, conectar o modelar datos con Payload CMS, sigue este protocolo estricto:

### 1. Enfoque: Payload CMS v3 + Next.js + Postgres

1. **App Router de Next.js:** Asume que la integración de Payload CMS se realizará nativamente bajo el App Router de Next.js (`@payloadcms/next`) a menos que el usuario especifique lo contrario.
2. **Base de Datos Postgres:** Payload puede usar MongoDB o Postgres. Como el usuario cuenta ya con Supabase, **prioriza siempre** y asume el uso del adaptador de Postgres (`@payloadcms/db-postgres`) para mantener coherencia en el ecosistema o incluso compartir la instancia de base de datos a futuro si el usuario lo desea.

### 2. Modelado de Datos (Collections & Globals)

1. **Archivos Individuales:** Define CADA Colección (`Collection`) y Global (`Global`) en su propio archivo dentro del directorio `src/collections` o `src/globals`. NUNCA agrupes colecciones diferentes en el mismo archivo.
2. **Manejo de Accesos (Access Control):** Nunca dejes colecciones completamente abiertas sin pensar. Por defecto, siempre define funciones simples de control de acceso basándose en el usuario autenticado.
   ```typescript
   export const isAdmin: Access = ({ req: { user } }) => {
     return Boolean(user?.collection === "users");
   };
   ```
3. **TypeScript Stong Typing:** Informa siempre sobre cómo generar y mantener actualizados los tipos de TypeScript mediante `payload generate:types`. Siempre usa las interfaces o tipos generados en el frontend u otras partes del código.

### 3. Autenticación y Usuarios

- Identifica claramente cómo se manejará la autenticación. Payload tiene su propia auth, separada de Supabase Auth.
- Si el usuario requiere sincronizar, recuérdale las estrategias comunes: o bien se delega la sesión de admin al usuario de Payload, y el panel público a Supabase, o se implementan hooks (e.g. `afterChange` en Supabase o en Payload) para crear usuarios cruzados. Por defecto, administra la sesión del CMS dentro de Payload.

### 4. Funciones e Integración Avanzada (Hooks, Endpoints, Endpoints Locales)

1. **Hooks:** Usa Hooks (`beforeChange`, `afterRead`, etc.) para lógica de negocio en lugar de tratar de interceptar en el cliente.
2. **Endpoints Customizados:** Cuando necesites endpoints lógicas complejas no cubiertas por el CRUD o REST REST/GraphQL de Payload, guíalo a crear custom endpoints en la configuración específica de la colección o globales.

### 5. Media y Almacenamiento (Supabase Storage / S3)

- Cuando el usuario configure almacenamiento de medios (imágenes/archivos) en Payload, sugiere de inmediato el plugin de almacenamiento S3 (`@payloadcms/storage-s3`) y guíalo en cómo mapearlo al endpoint S3 que ofrece Supabase Storage para unificar los activos estáticos.

### 6. Migraciones

- Recuerda que al usar el adaptador de Postgres, Payload usa DB migrations basadas en `drizzle-orm`. Si se solicitan cambios de esquema disruptivos, instruye al usuario a ejecutar `payload generate:migration` y luego aplicarlo.
