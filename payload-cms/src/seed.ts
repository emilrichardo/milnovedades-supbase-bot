import { getPayload } from 'payload'
import config from './payload.config'

async function seed() {
  try {
    const payload = await getPayload({ config })

    console.log('--- Seed Starting ---')

    // 1. Informacion General Global
    await payload.updateGlobal({
      slug: 'informacion_general',
      data: {
        nombre_empresa: 'Las Mil Novedades',
        datos_contacto: {
          email: 'contacto@lasmilnovedades.com',
          telefono: '',
        },
        sucursales: [
          {
            nombre: 'Sucursal Siglo 19',
            direccion: 'Mza 30 lote 29, Santiago del Estero.',
            horarios_atencion: 'Lunes a Sábado de 9:00 a 13:00 y de 17:30 a 21:30 hs.',
          },
          {
            nombre: 'Sucursal La Banda',
            direccion: 'Calle Besares N° 743.',
            horarios_atencion: 'Lunes a Sábado horario comercial.',
          },
          {
            nombre: 'Mayorista Zanjón',
            direccion: 'Camino del medio, Zona UNSE.',
            horarios_atencion: 'Consultar horarios en WhatsApp.',
          }
        ]
      } as any,
    })
    console.log('✅ Información General global actualizada.')

    // 2. Agentes
    const agentes = [
      {
        nombre: 'Atención al Cliente',
        rol: 'Soporte y Ventas',
        is_main: true,
        es_subagente: false,
        prompt_sistema: 'Eres el asistente virtual de Las Mil Novedades. Tu objetivo es ayudar a los clientes con sus compras, informarles sobre compras mayoristas (mínimo $80.000 para envíos web, compras presenciales sin mínimo a precio mayorista en sucursales) y brindar soporte general de productos y sucursales.',
        temperatura: 0.7,
        personalidad: 'Amable, servicial, conciso.',
        accesos_tablas: ['productos', 'clientes', 'informacion_general'],
        modelo: 'gpt-4o-mini',
      },
      {
        nombre: 'Asesor de Mayoreo',
        rol: 'Ejecutivo B2B',
        es_subagente: false,
        prompt_sistema: 'Eres el asesor de ventas mayoristas de Las Mil Novedades. Ayudas a los clientes y empresas a realizar grandes pedidos de bazar, juguetería, papelería, cotillón, etc. Explicas los beneficios y condiciones de comprar más de $80.000 en la web y los métodos de envío nacional.',
        temperatura: 0.5,
        personalidad: 'Profesional, persuasivo y claro.',
        accesos_tablas: ['productos', 'clientes', 'ventas'],
        modelo: 'gpt-4o',
      },
      {
        nombre: 'Personal Shopper - Ofertas',
        rol: 'Recomendador de Productos',
        es_subagente: false,
        prompt_sistema: 'Eres un recomendador de productos de Las Mil Novedades. Sugieres artículos en tendencia o estacionales (Vuelta al cole, verano, fiestas). Transmites creatividad y entusiasmo.',
        temperatura: 0.8,
        personalidad: 'Entusiasta, alegre y creativo.',
        accesos_tablas: ['productos', 'inventario'],
        modelo: 'gpt-4o-mini',
      }
    ]

    for (const agente of agentes) {
      const existing = await payload.find({
        collection: 'agentes',
        where: {
          nombre: {
            equals: agente.nombre,
          }
        }
      })
      if (existing.totalDocs === 0) {
        await payload.create({
          collection: 'agentes',
          data: agente as any,
        })
        console.log(`✅ Agente creado: ${agente.nombre}`)
      } else {
        console.log(`ℹ️ Agente ya existe: ${agente.nombre}`)
      }
    }

    console.log('--- Seed Finished ---')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during seed:', error)
    process.exit(1)
  }
}

seed()
