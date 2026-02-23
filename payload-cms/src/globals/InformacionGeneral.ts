import type { GlobalConfig } from 'payload'

export const InformacionGeneral: GlobalConfig = {
  slug: 'informacion_general',
  label: 'Información General',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'nombre_empresa',
      type: 'text',
      required: true,
      label: 'Nombre de la Empresa Comercial',
    },
    {
      name: 'datos_contacto',
      type: 'group',
      label: 'Datos de Contacto Principales',
      fields: [
        {
          name: 'email',
          type: 'email',
          label: 'Correo Electrónico',
        },
        {
          name: 'telefono',
          type: 'text',
          label: 'Número de Teléfono Principal',
        },
      ],
    },
    {
      name: 'sucursales',
      type: 'array',
      label: 'Sucursales',
      labels: {
        singular: 'Sucursal',
        plural: 'Sucursales',
      },
      fields: [
        {
          name: 'nombre',
          type: 'text',
          required: true,
          label: 'Nombre de la Sucursal',
        },
        {
          name: 'direccion',
          type: 'textarea',
          required: true,
          label: 'Dirección Física',
        },
        {
          name: 'horarios_atencion',
          type: 'textarea',
          label: 'Horarios de Atención',
        },
        {
          name: 'telefono_sucursal',
          type: 'text',
          label: 'Teléfono de la Sucursal (Opcional)',
        }
      ]
    },
    {
      name: 'informacion_marca',
      type: 'richText',
      label: 'Información de la Marca (Misión, Visión, Valores, etc.)',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo de la Marca',
    },
  ],
}
