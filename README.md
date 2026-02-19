# BotMilu - Sync Architecture

This project implements a product synchronization system using **Supabase Native** technologies. It syncs products from the Aleph API and WooCommerce to a Supabase database.

## Architecture

1.  **Database**: PostgreSQL hosted on Supabase.
    - `products_data`: Stores merged product info (Price, Stock, Images).
    - `categories`: Stores hierarchical category structure (Rubro/Subrubro).
2.  **Edge Function** (`sync-aleph`): A Deno/TypeScript function that performs the heavy lifting:
    - Fetches all products from Aleph.
    - Fetches real-time stock and WooCommerce images (concurrently).
    - Upserts data to the database.
    - Cleans up stale records (products no longer in the feed).
3.  **Scheduler**: `pg_cron` extension in the database triggers the Edge Function every hour via HTTP POST.

---

## Local Development

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed.
- Docker (required for Supabase local dev).
- Git.

### 1. Setup Environment

Copy the example environment file and fill in your keys:

```bash
cp .env.example .env.local
```

_Note: `.env.local` is used for **local function testing**._

### 2. Start Local Supabase

This starts a complete Supabase stack locally (DB, Auth, Edge Runtime).

```bash
npx supabase start
```

### 3. Deploy Local Migrations

Create the tables and extensions in your local DB:

```bash
npx supabase migration up
```

### 4. Configure Self-Hosted Environment

For self-hosted instances (Docker/Coolify), you must set the `app.api_url` variable to your project's function URL. The default is `http://127.0.0.1:54321/functions/v1/sync-aleph`.

To change it:

```sql
ALTER DATABASE postgres SET app.api_url = 'http://your-production-url/functions/v1/sync-aleph';
```

### 5. Test the Edge Function Locally

You can invoke the function directly on your machine.

```bash
npx supabase functions serve --no-verify-jwt --env-file .env.local
```

In another terminal, trigger it:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sync-aleph' \
  --header 'Content-Type: application/json'
```

---

## Deployment (Test & Production)

To deploy to a live Supabase project (Staging or Production), follow these steps:

### 1. Link Project

Link your local repo to the remote Supabase project:

```bash
npx supabase link --project-ref your-project-id
```

### 2. Set Production Secrets

The Edge Function uses Supabase Secrets (not .env files) in production.

```bash
npx supabase secrets set ALEPH_API_URL=http://aleph.dyndns.info/integracion/api
npx supabase secrets set ALEPH_API_KEY=...
npx supabase secrets set ALEPH_CLIENT_ID=...
npx supabase secrets set WC_API_URL=...
npx supabase secrets set WC_CONSUMER_KEY=...
npx supabase secrets set WC_CONSUMER_SECRET=...
```

### 3. Deploy Database Changes

Apply the table definitions and cron setup:

```bash
npx supabase migration up
```

### 4. Deploy Edge Function

Upload the `sync-aleph` function code:

```bash
npx supabase functions deploy sync-aleph
```

---

## API Reference

The `sync-aleph` Edge Function supports multiple sync modes via the `type` query parameter.

### 1. Sync Products (Default)

Fetches all products, updates stock and prices, and syncs categories.

```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-aleph?type=products' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json'
```

### 2. Sync Clients

Fetches client updates from Aleph.

```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-aleph?type=clients' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json'
```

### 3. Sync Vouchers

Fetches vouchers (invoices, orders) from Aleph.

**Standard Sync (Last 30 days or auto-detected):**

```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-aleph?type=vouchers' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json'
```

**Custom Date Range (dd-mm-yyyy):**

```bash
curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-aleph?type=vouchers&fromDate=01-01-2025&toDate=10-01-2025' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json'
```

---

## Configuration

### Sync Schedule

The sync schedule is managed dynamically via the `public.sync_config` table in the database. You do not need to edit migration files to change the schedule.

**To view current schedules:**

```sql
SELECT * FROM public.sync_config;
```

**To update a schedule (e.g., run clients sync every 6 hours):**

```sql
UPDATE public.sync_config
SET cron_expression = '0 */6 * * *'
WHERE collection = 'clients';
```

**To disable a sync:**

```sql
UPDATE public.sync_config
SET is_active = false
WHERE collection = 'products';
```

### Troubleshooting

- **Logs**: View function logs in the Supabase Dashboard > Edge Functions > sync-aleph > Logs.
- **Timeouts**: The function is designed with concurrency. If it times out, consider reducing batch size in the code.
