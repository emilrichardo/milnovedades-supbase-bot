import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default
    {
      name: 'rol',
      label: 'Rol del Usuario',
      type: 'select',
      required: true,
      defaultValue: 'vendedor',
      options: [
        { label: 'Admin', value: 'Admin' },
        { label: 'Encargado', value: 'Encargado' },
        { label: 'Vendedor', value: 'Vendedor' },
      ],
    },
  ],
}
