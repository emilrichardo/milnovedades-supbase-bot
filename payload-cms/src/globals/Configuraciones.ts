import type { GlobalConfig } from 'payload'

export const Configuraciones: GlobalConfig = {
  slug: 'configuraciones',
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
      label: 'Datos de Contacto',
      fields: [
        {
          name: 'email',
          type: 'email',
          label: 'Correo Electrónico',
        },
        {
          name: 'telefono',
          type: 'text',
          label: 'Número de Teléfono',
        },
        {
          name: 'direccion',
          type: 'textarea',
          label: 'Dirección Física',
        },
      ],
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
