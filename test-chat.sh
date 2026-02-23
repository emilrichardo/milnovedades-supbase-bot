#!/bin/bash
# Test local
echo "Testing chat-agente locally..."
curl -i --location 'http://127.0.0.1:54321/functions/v1/chat-agente' \
--header 'Content-Type: application/json' \
--header "Authorization: Bearer \$SUPABASE_ANON_KEY" \
--data '{
    "text": "Hola, ¿cómo estás y de qué se trata tu tienda?",
    "conversation_id": "test-1234"
}'

echo -e "\n\nTesting chat-agente local done."
