import type { CollectionConfig } from 'payload'

export const Agentes: CollectionConfig = {
  slug: 'agentes',
  admin: {
    useAsTitle: 'nombre',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'nombre',
      label: 'Nombre del Agente',
      type: 'text',
      required: true,
    },
    {
      name: 'is_main',
      label: 'Es Agente Principal (Orquestador)',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'rol',
      type: 'text',
      required: true,
      label: 'Rol',
    },
    {
      name: 'es_subagente',
      type: 'checkbox',
      label: '¿Es sub-agente?',
      defaultValue: false,
    },
    {
      name: 'agente_padre',
      type: 'relationship',
      relationTo: 'agentes',
      label: 'Agente Padre (seleccionar si es sub-agente)',
      admin: {
        condition: (data?: Partial<Record<string, unknown>>) => Boolean(data?.es_subagente),
      },
    },
    {
      name: 'prompt_sistema',
      type: 'textarea',
      label: 'Prompt / Instrucciones',
      required: true,
    },
    {
      name: 'temperatura',
      type: 'number',
      label: 'Temperatura (Creatividad 0 - 2)',
      defaultValue: 0.7,
      min: 0,
      max: 2,
    },
    {
      name: 'personalidad',
      type: 'textarea',
      label: 'Personalidad',
    },
    {
      name: 'accesos_tablas',
      type: 'array',
      label: 'Acceso a Tablas/Datos',
      fields: [
        {
          name: 'tabla',
          type: 'select',
          label: 'Tabla',
          required: true,
          options: [
            { label: 'Productos', value: 'productos' },
            { label: 'Clientes', value: 'clientes' },
            { label: 'Ventas', value: 'ventas' },
            { label: 'Inventario', value: 'inventario' },
            { label: 'Información General', value: 'informacion_general' },
          ],
        },
        {
          name: 'permiso',
          type: 'select',
          label: 'Nivel de Permiso',
          required: true,
          defaultValue: 'lectura',
          options: [
            { label: 'Solo Lectura', value: 'lectura' },
            { label: 'Solo Escritura', value: 'escritura' },
            { label: 'Lectura y Escritura', value: 'lectura_escritura' },
          ],
        },
      ],
    },
    {
      name: 'modelo',
      type: 'select',
      label: 'Modelo de IA',
      required: true,
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        { label: 'Claude 3 Opus', value: 'claude-3-opus' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
        { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
      ],
    },
    {
      name: 'api_key',
      type: 'text',
      label: 'API Key (Opcional)',
      admin: {
        description:
          'Dejar en blanco para usar la API Key por defecto definida en variables de entorno.',
      },
    },
  ],
}
