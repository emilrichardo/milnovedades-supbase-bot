#!/bin/bash
source .env.local
curl -v -X POST "http://127.0.0.1:54321/functions/v1/sync-aleph?type=comprobantes" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json"
