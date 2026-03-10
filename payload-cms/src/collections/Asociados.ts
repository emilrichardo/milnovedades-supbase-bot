import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

export const Asociados: CollectionConfig = {
  slug: 'asociados',
  admin: {
    useAsTitle: 'dni',
  },
  auth: true,
  access: {
    create: () => true,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.collection === 'users') return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.collection === 'users') return true
      return { id: { equals: user.id } }
    },
    delete: ({ req: { user } }) => user?.collection === 'users',
  },
  endpoints: [
    {
      path: '/login-dni',
      method: 'post',
      handler: async (req) => {
        try {
          const body = await req.json?.() ?? {}
          const { dni, password } = body as { dni?: string; password?: string }

          if (!dni || !password) {
            return Response.json({ errors: [{ message: 'Se requiere dni y password' }] }, { status: 400 })
          }

          // Look up the auto-generated email for this DNI
          const result = await (req.payload as any).find({
            collection: 'asociados',
            where: { dni: { equals: dni } },
            limit: 1,
            overrideAccess: true,
          })

          if (result.docs.length === 0) {
            return Response.json({ errors: [{ message: 'DNI no encontrado' }] }, { status: 401 })
          }

          const asociado = result.docs[0] as any
          const email = asociado.email

          // Use Payload's built-in login
          const loginResult = await (req.payload as any).login({
            collection: 'asociados',
            data: { email, password },
            req,
          })

          return Response.json({
            message: 'Authentication Passed',
            token: loginResult.token,
            exp: loginResult.exp,
            user: loginResult.user,
          })
        } catch (err: any) {
          req.payload.logger.error({ err }, 'Error en login-dni')
          return Response.json({ errors: [{ message: 'Credenciales inválidas' }] }, { status: 401 })
        }
      },
    },
    {
      path: '/buscar-cliente',
      method: 'get',
      handler: async (req) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const dni = url.searchParams.get('dni')
        const telefono = url.searchParams.get('telefono')

        if (!dni && !telefono) {
          return Response.json({ found: false, error: 'Se requiere dni o telefono' }, { status: 400 })
        }

        try {
          const pool = (req.payload.db as any).pool
          const conditions: string[] = []
          const params: string[] = []
          let idx = 1

          if (dni) {
            conditions.push(`(cuit = $${idx} OR cuit LIKE '%' || $${idx} || '%')`)
            params.push(dni)
            idx++
          }
          if (telefono) {
            conditions.push(`telefono = $${idx}`)
            params.push(telefono)
            idx++
          }

          const query = `
            SELECT
              codigo_cliente, nombre, razon_social, cuit, lis_pre, contacto, fecha_alta,
              cp_ent, localidad_ent, provincia_ent, provincia_ent_desc,
              cot_calle, cot_altura, cot_piso, cot_dpto,
              direccion, localidad, telefono, cod_pos, provincia, dir_ent
            FROM public.clientes
            WHERE ${conditions.join(' OR ')}
            LIMIT 1
          `

          const result = await pool.query(query, params)

          if (result.rows.length === 0) {
            return Response.json({ found: false })
          }

          return Response.json({ found: true, cliente: result.rows[0] })
        } catch (err: any) {
          req.payload.logger.error({ err }, 'Error en buscar-cliente')
          return Response.json({ found: false, error: 'Error interno' }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (!data) return data
        if (operation !== 'create' && operation !== 'update') return data

        // Auto-generate email from DNI if not provided
        if (operation === 'create' && !(data as any).email && (data as any).dni) {
          ;(data as any).email = `${(data as any).dni}@asociados.internal`
        }

        // Reject duplicate DNI on create
        if (operation === 'create' && (data as any).dni) {
          const existing = await (req.payload as any).find({
            collection: 'asociados',
            where: { dni: { equals: (data as any).dni } },
            limit: 1,
            overrideAccess: true,
          })
          if (existing.totalDocs > 0) {
            throw new APIError('Ya existe una cuenta registrada con ese DNI.', 400, undefined, true)
          }
        }

        const { dni, celular } = data as any

        if (!dni && !celular) return data

        try {
          const pool = (req.payload.db as any).pool
          const conditions: string[] = []
          const params: string[] = []
          let idx = 1

          if (dni) {
            conditions.push(`(cuit = $${idx} OR cuit LIKE '%' || $${idx} || '%')`)
            params.push(dni)
            idx++
          }
          if (celular) {
            conditions.push(`telefono = $${idx}`)
            params.push(celular)
            idx++
          }

          const query = `
            SELECT
              codigo_cliente, nombre, razon_social, cuit, lis_pre, contacto, fecha_alta,
              cp_ent, localidad_ent, provincia_ent, provincia_ent_desc,
              cot_calle, cot_altura, cot_piso, cot_dpto,
              direccion, localidad, telefono, cod_pos, provincia, dir_ent
            FROM public.clientes
            WHERE ${conditions.join(' OR ')}
            LIMIT 1
          `

          const result = await pool.query(query, params)

          if (result.rows.length === 0) return data

          const cliente = result.rows[0]

          // Only fill empty fields — don't overwrite what the asociado already set
          const filled: Record<string, any> = { ...data }
          const textFields = [
            'nombre', 'razon_social', 'cuit', 'contacto',
            'cp_ent', 'localidad_ent', 'provincia_ent_desc',
            'cot_calle', 'cot_altura', 'cot_piso', 'cot_dpto',
            'direccion', 'localidad', 'telefono', 'cod_pos', 'dir_ent',
          ]
          const numericFields = ['codigo_cliente', 'lis_pre', 'provincia_ent', 'provincia']

          for (const field of textFields) {
            if (!filled[field] && cliente[field] != null) {
              filled[field] = cliente[field]
            }
          }
          for (const field of numericFields) {
            if (filled[field] == null && cliente[field] != null) {
              filled[field] = cliente[field]
            }
          }
          if (!filled['fecha_alta'] && cliente.fecha_alta != null) {
            filled['fecha_alta'] = cliente.fecha_alta
          }

          return filled
        } catch (err: any) {
          req.payload.logger.error({ err }, 'Error en beforeValidate de Asociados')
          return data
        }
      },
    ],
  },
  fields: [
    // Identificación (requeridos en registro)
    {
      name: 'dni',
      label: 'DNI',
      type: 'text',
      required: true,
    },
    {
      name: 'celular',
      label: 'Celular',
      type: 'text',
    },

    // Vinculación ERP
    {
      name: 'codigo_cliente',
      label: 'Código Cliente',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Código ERP Aleph (auto-completado)',
      },
    },

    // Datos del perfil
    {
      name: 'nombre',
      label: 'Nombre',
      type: 'text',
    },
    {
      name: 'razon_social',
      label: 'Razón Social',
      type: 'text',
    },
    {
      name: 'cuit',
      label: 'CUIT',
      type: 'text',
    },
    {
      name: 'lis_pre',
      label: 'Lista de Precios',
      type: 'number',
    },
    {
      name: 'contacto',
      label: 'Contacto',
      type: 'text',
    },
    {
      name: 'fecha_alta',
      label: 'Fecha de Alta',
      type: 'date',
    },

    // Dirección de entrega
    {
      type: 'row',
      fields: [
        { name: 'cp_ent', label: 'CP Entrega', type: 'text' },
        { name: 'localidad_ent', label: 'Localidad Entrega', type: 'text' },
        { name: 'provincia_ent', label: 'Provincia Entrega (cód)', type: 'number' },
        { name: 'provincia_ent_desc', label: 'Provincia Entrega', type: 'text' },
      ],
    },

    // Domicilio cotización
    {
      type: 'row',
      fields: [
        { name: 'cot_calle', label: 'Calle Cot.', type: 'text' },
        { name: 'cot_altura', label: 'Altura Cot.', type: 'text' },
        { name: 'cot_piso', label: 'Piso Cot.', type: 'text' },
        { name: 'cot_dpto', label: 'Dpto Cot.', type: 'text' },
      ],
    },

    // Contacto / domicilio principal
    {
      name: 'direccion',
      label: 'Dirección',
      type: 'text',
    },
    {
      name: 'localidad',
      label: 'Localidad',
      type: 'text',
    },
    {
      name: 'telefono',
      label: 'Teléfono',
      type: 'text',
    },
    {
      name: 'cod_pos',
      label: 'Código Postal',
      type: 'text',
    },
    {
      name: 'provincia',
      label: 'Provincia (cód)',
      type: 'number',
    },
    {
      name: 'dir_ent',
      label: 'Dirección Entrega',
      type: 'text',
    },
  ],
}
