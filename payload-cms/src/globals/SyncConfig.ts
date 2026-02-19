import type { GlobalConfig } from 'payload'
import { sql } from '@payloadcms/db-postgres'

export const SyncConfig: GlobalConfig = {
  slug: 'sincronizacion-aleph',
  label: 'Configuración de Sincronización',
  access: {
    // Si queremos restringirlo solo a administradores en el futuro:
    // read: ({ req: { user } }) => Boolean(user?.collection === 'users'),
    // update: ({ req: { user } }) => Boolean(user?.collection === 'users'),
    read: () => true,
    update: () => true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Productos',
          fields: [
            {
              name: 'products_active',
              type: 'checkbox',
              label: 'Activar Sincronización Automática',
              defaultValue: true,
            },
            {
              name: 'products_cron',
              type: 'text',
              label: 'Expresión CRON (por defecto: 0 2 * * *)',
              required: true,
              defaultValue: '0 2 * * *',
            },
          ],
        },
        {
          label: 'Clientes',
          fields: [
            {
              name: 'clients_active',
              type: 'checkbox',
              label: 'Activar Sincronización Automática',
              defaultValue: true,
            },
            {
              name: 'clients_cron',
              type: 'text',
              label: 'Expresión CRON (por defecto: 0 0 * * *)',
              required: true,
              defaultValue: '0 0 * * *',
            },
          ],
        },
        {
          label: 'Comprobantes',
          fields: [
            {
              name: 'comprobantes_active',
              type: 'checkbox',
              label: 'Activar Sincronización Automática',
              defaultValue: true,
            },
            {
              name: 'comprobantes_cron',
              type: 'text',
              label: 'Expresión CRON (por defecto: 0 3 * * *)',
              required: true,
              defaultValue: '0 3 * * *',
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        const { db, logger } = req.payload;

        // Sincronizar el Global de Payload hacia la tabla de negocio public.sync_config de Supabase
        try {
          if ((db as any).drizzle) {
            const drizzle = (db as any).drizzle;

            // Usando Drizzle execute con interpolación raw string para evitar inyecciones si fuese necesario.
            // O usando comandos SQL nativamente.

            await drizzle.execute(sql`
              UPDATE public.sync_config
              SET is_active = ${doc.products_active}, cron_expression = ${doc.products_cron}
              WHERE collection = 'products';
            `);

            await drizzle.execute(sql`
              UPDATE public.sync_config
              SET is_active = ${doc.clients_active}, cron_expression = ${doc.clients_cron}
              WHERE collection = 'clients';
            `);

            await drizzle.execute(sql`
              UPDATE public.sync_config
              SET is_active = ${doc.comprobantes_active}, cron_expression = ${doc.comprobantes_cron}
              WHERE collection = 'comprobantes';
            `);

            logger.info('Sincronizados los CRONs hacia public.sync_config exitosamente.');
          }
        } catch (error) {
          logger.error({ err: error }, 'Error al intentar sincronizar los crons en public.sync_config desde Payload');
        }

        return doc;
      },
    ],
  },
}
