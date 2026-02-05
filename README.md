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

### 4. Test the Edge Function Locally

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

## Configuration & Notes

### Cron Job Setup

The cron job is defined in `supabase/migrations/20240205130000_init_sync_architecture.sql`.
**Important**: Before deploying to production, edit this file to ensure the `url` and `Authorization` header point to your **Production Project URL** and **Service Role Key**.

### Manual Trigger

You can manually trigger the sync at any time via the Supabase Dashboard > Edge Functions, or via CURL:

```bash
curl -L -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-aleph' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>'
```

### Troubleshooting

- **Logs**: View function logs in the Supabase Dashboard > Edge Functions > sync-aleph > Logs.
- **Timeouts**: The function is designed with concurrency. If it times out (Supabase limit is 400s max usually), consider reducing batch size or upgrading the compute instance via Supabase support/settings.
