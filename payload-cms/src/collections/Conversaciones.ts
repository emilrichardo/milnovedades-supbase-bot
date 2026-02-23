import type { CollectionConfig } from 'payload'

export const Conversaciones: CollectionConfig = {
  slug: 'conversaciones',
  admin: {
    useAsTitle: 'id_consulta',
  },
  fields: [
    {
      name: 'id_consulta',
      label: 'ID Consulta',
      type: 'text',
      required: true,
    },
    {
      name: 'id_cliente',
      label: 'ID Cliente',
      type: 'text',
      required: true,
    },
    {
      name: 'resumen',
      label: 'Resumen',
      type: 'textarea',
    },
    {
      name: 'documentos',
      label: 'Documentos',
      type: 'json',
    },
    {
      name: 'actividades',
      label: 'Actividades',
      type: 'json',
    },
    {
      name: 'notas',
      label: 'Notas',
      type: 'textarea',
    },
    {
      name: 'calendario',
      label: 'Calendario',
      type: 'date',
    },
    {
      name: 'tipo_consulta',
      label: 'Tipo de Consulta',
      type: 'text',
    },
    {
      name: 'estado_consulta',
      label: 'Estado Consulta',
      type: 'text',
    },
    {
      name: 'producto_consultado',
      label: 'Producto Consultado',
      type: 'text',
    },
    {
      name: 'producto_ofrecido',
      label: 'Producto Ofrecido',
      type: 'text',
    },
    {
      name: 'temperatura',
      label: 'Temperatura',
      type: 'text',
    },
    {
      name: 'estado_embudo',
      label: 'Estado Embudo',
      type: 'text',
    },
    {
      name: 'metodo_pago',
      label: 'Método de Pago',
      type: 'text',
    },
  ],
}
