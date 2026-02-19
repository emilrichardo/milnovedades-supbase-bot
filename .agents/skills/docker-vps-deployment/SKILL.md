---
name: docker-vps-deployment
description: Flujo de trabajo y mejores prácticas para preparar y desplegar proyectos complejos con Docker (incluyendo Supabase autohospedado, Payload CMS y frontend) en un VPS. SIEMPRE responder en español.
---

# Flujo de Trabajo para Despliegues en VPS con Docker

Esta skill define el estándar que DEBES seguir al preparar la infraestructura, los contenedores y la orquestación para desplegar el proyecto en un Servidor Privado Virtual (VPS).

## REGLA DE IDIOMA CRÍTICA Y OBLIGATORIA

**SIEMPRE DEBES RESPONDER Y COMUNICARTE CON EL USUARIO EN ESPAÑOL.** Sin excepciones.

## Protocolo de Dockerización y Orquestación

Cuando el usuario pida preparar el proyecto para subirlo a producción o a un VPS, sigue este procedimiento estricto:

### 1. Análisis de Servicios (El Ecosistema)

Identifica todos los servicios involucrados. En este proyecto típicamente encontrarás:

- **Supabase (Self-hosted):** Implica su propio ecosistema de contenedores (Studio, Postgres, GoTrue, PostgREST, Realtime, Storage, Edge Functions, etc.).
- **Payload CMS:** Backend/CMS en Node.js que requiere una base de datos (MongoDB o Postgres). Si usa Postgres, evalúa si compartirá instancia con Supabase o tendrá la suya.
- **Frontend / App:** Posiblemente Next.js, Vite o similar.
- **Reverse Proxy:** Generalmente Traefik, Nginx o Caddy para enrutamiento, SSL y gestión de dominios. Opcionalmente gestionado por pares como Coolify.

### 2. Multi-stage Builds (`Dockerfile`)

Para cualquier servicio Node.js/Frontend propio (como Payload CMS o el cliente web):

1. **SIEMPRE genera `Dockerfile` eficientes en múltiples etapas (Multi-stage builds)** para reducir drásticamente el peso de las imágenes en producción y evitar llevar archivos de compilación, secretos de build y dependencias de `devDependencies` al contenedor final.
2. Utiliza imágenes base de **Alpine** (`node:xx-alpine`) siempre que sea posible para minimizar vulnerabilidades.
3. Asegura permisos no-root: `USER node`.

### 3. Orquestación Segura (`docker-compose.yml`)

1. **Redes Aisladas:** Separa servicios por redes lógicas. Ejemplo: Una red `frontend-network` para el proxy/web y Payload, y una red `backend-network` confidencial donde solo Payload (y algunos servicios de Supabase) convergen con Postgres.
2. **Volúmenes Persistentes:** **NUNCA** guardes estado dentro de los contenedores. Asegura que bases de datos, almacenamientos y configuraciones persistentes mapeen a volúmenes nombrados locales o carpetas estáticas.
   ```yaml
   volumes:
     db-data:
     payload-media:
   ```
3. **Variables de Entorno (`.env`):** No _hardcodees_ contraseñas, URLs ni llaves JWT en los builds o YAMLs. Usa `${VARIABLE}` en el `docker-compose.yml` y documenta siempre la creación de un archivo `.env` o `.env.production`.
4. **Dependencias de Arranque:** Utiliza las directivas avanzadas de `depends_on` con comprobación de estado (`condition: service_healthy`) para asegurar que los servicios Node.js/CMS no arranquen hasta que la base de datos esté lista para aceptar conexiones.

### 4. Integración Específica Supabase + Payload

- Presta especial atención a la base de datos. Si Payload CMS se configurará con Postgres (`@payloadcms/db-postgres`), detalla si se debe utilizar una base de datos dedicada, y cómo gestionar la cadena de conexión en el VPS.
- Supabase requiere muchos puertos. Revisa que no exista colisión de puertos entre el ecosistema Supabase, Payload y Nginx.
- En tu respuesta, proporciona siempre la estructura de directorios recomendada para el VPS y el flujo de los comandos (`docker compose up -d`).

### 5. Advertencias para el Usuario

Al finalizar la configuración o guía, recuérdale al usuario:

1. Validar la configuración del Firewall en su VPS (ej: abrir puertos 80 y 443, restringir acceso directo a puertos de BD).
2. Configurar sus registros DNS.
3. Hacer backups periódicos de los volúmenes montados.
