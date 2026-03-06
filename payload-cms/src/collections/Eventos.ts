import type { CollectionConfig } from 'payload'

export const Eventos: CollectionConfig = {
    slug: 'eventos',
    admin: {
        useAsTitle: 'nombre',
        defaultColumns: ['nombre', 'tipo_evento', 'fecha_inicio', 'activo'],
        description: 'Gestión de eventos de tipo sorteo o puntos / chances.',
    },
    access: {
        read: () => true,
    },
    fields: [
        // ── Información básica ──────────────────────────────────────────────
        {
            name: 'nombre',
            label: 'Nombre del Evento',
            type: 'text',
            required: true,
        },
        {
            name: 'slug',
            label: 'Slug',
            type: 'text',
            required: true,
            unique: true,
            admin: {
                description: 'Identificador URL-friendly. Ej: "sorteo-dia-de-la-madre-2026"',
            },
        },
        {
            name: 'descripcion',
            label: 'Descripción',
            type: 'textarea',
        },
        {
            name: 'banner',
            label: 'Banner',
            type: 'upload',
            relationTo: 'media',
        },

        // ── Fechas ──────────────────────────────────────────────────────────
        {
            type: 'row',
            fields: [
                {
                    name: 'fecha_inicio',
                    label: 'Fecha de Inicio',
                    type: 'date',
                    required: true,
                    admin: {
                        date: {
                            pickerAppearance: 'dayAndTime',
                        },
                        width: '50%',
                    },
                },
                {
                    name: 'fecha_fin',
                    label: 'Fecha de Fin',
                    type: 'date',
                    admin: {
                        description: 'Dejar vacío si el evento no tiene fecha de fin definida.',
                        date: {
                            pickerAppearance: 'dayAndTime',
                        },
                        width: '50%',
                    },
                },
            ],
        },

        // ── Estado y tipo ───────────────────────────────────────────────────
        {
            name: 'activo',
            label: 'Activo',
            type: 'checkbox',
            defaultValue: true,
            admin: {
                description: 'Marca si el evento está activo o inactivo.',
            },
        },
        {
            name: 'tipo_evento',
            label: 'Tipo de Evento',
            type: 'select',
            required: true,
            options: [
                { label: 'Sorteo', value: 'sorteo' },
                { label: 'Puntos', value: 'puntos' },
            ],
        },

        // ── Reglas de puntuación ────────────────────────────────────────────
        {
            name: 'reglas_puntuacion',
            label: 'Reglas de Puntuación (Puntos / Chances)',
            type: 'group',
            admin: {
                description:
                    'Configura cómo se otorgan puntos o chances por cada compra.',
            },
            fields: [
                // Multiplicador
                {
                    name: 'multiplicador',
                    label: 'Multiplicador',
                    type: 'group',
                    admin: {
                        description:
                            'Define el monto base y la cantidad de puntos o chances que genera.',
                    },
                    fields: [
                        {
                            name: 'monto_base',
                            label: 'Monto Base (RD$)',
                            type: 'number',
                            required: true,
                            min: 0,
                            admin: {
                                description:
                                    'Monto en RD$ que se necesita para generar los puntos/chances indicados. Ej: cada RD$500 genera X puntos.',
                            },
                        },
                        {
                            name: 'puntos_generados',
                            label: 'Puntos / Chances Generados',
                            type: 'number',
                            required: true,
                            min: 0,
                            admin: {
                                description:
                                    'Cantidad de puntos o chances que se otorgan por cada "monto base" alcanzado.',
                            },
                        },
                    ],
                },

                // Categorías aplicables
                {
                    name: 'categorias_aplicables',
                    label: 'Categorías Aplicables',
                    type: 'array',
                    admin: {
                        description:
                            'Categorías de productos que aplican para esta regla. Dejar vacío si aplica a todas.',
                    },
                    fields: [
                        {
                            name: 'categoria',
                            label: 'Categoría',
                            type: 'text',
                            required: true,
                        },
                    ],
                },

                // Monto mínimo
                {
                    name: 'monto_minimo',
                    label: 'Monto Mínimo de Compra (RD$)',
                    type: 'number',
                    min: 0,
                    admin: {
                        description:
                            'Monto mínimo que debe tener una compra para participar en el evento.',
                    },
                },

                // Tope
                {
                    name: 'tope_por_compra',
                    label: 'Tope de Puntos / Chances por Compra',
                    type: 'number',
                    min: 0,
                    admin: {
                        description:
                            'Máximo de puntos o chances que puede obtener un cliente por una sola compra. Dejar vacío para sin límite.',
                    },
                },
            ],
        },

        // ── Términos y condiciones ──────────────────────────────────────────
        {
            name: 'terminos_condiciones',
            label: 'Términos y Condiciones',
            type: 'richText',
            admin: {
                description: 'Términos y condiciones legales del evento.',
            },
        },
    ],
}
