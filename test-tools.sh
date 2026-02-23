#!/bin/bash

# Test de las funciones de tools directamente
echo "=== Test de Tools del Chat-Agente ==="

# Test 1: Verificar que la tabla tiene la columna permiso
echo "1. Verificando estructura de la tabla agentes_accesos_tablas:"
docker compose exec db psql -U postgres -d postgres -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'payload' AND table_name = 'agentes_accesos_tablas';"

echo ""
echo "2. Verificando permisos del agente principal:"
docker compose exec db psql -U postgres -d postgres -c "SELECT parent_id, value, permiso FROM payload.agentes_accesos_tablas WHERE parent_id = 1;"

echo ""
echo "3. Probando búsqueda de productos (simulando tool buscar_productos):"
docker compose exec db psql -U postgres -d postgres -c "SELECT codigo_product, nombre, precio_minorista FROM public.products_data WHERE nombre ILIKE '%muñeco%' LIMIT 5;"

echo ""
echo "4. Probando obtener producto específico (simulando tool obtener_producto):"
docker compose exec db psql -U postgres -d postgres -c "SELECT * FROM public.products_data WHERE codigo_product = '4894457012756';"

echo ""
echo "5. Probando listar categorías (simulando tool listar_categorias):"
docker compose exec db psql -U postgres -d postgres -c "SELECT nombre, slug FROM public.categories ORDER BY nombre LIMIT 5;"

echo ""
echo "=== Test completado ==="