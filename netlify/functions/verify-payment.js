const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente de Supabase con Service Role (bypassea directivas RLS para poder firmar URLs)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
    // Solo permitir peticiones GET
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const sessionId = event.queryStringParameters.session_id;

        if (!sessionId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Falta el parámetro session_id' })
            };
        }

        // 1. Verificar la sesión de pago con Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Validar que el pago haya sido validado y cobrado
        if (session.payment_status !== 'paid') {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'El pago no ha sido completado.' })
            };
        }

        /* Opcional: Podrías validar también que el producto comprado sea el Manual Clínico
           verificando session.line_items o metadatos, pero por simplicidad de este MVP,
           asumimos que tener un session_id pagado válido es suficiente prueba. */

        // 2. Generar el enlace firmado (Signed URL) temporal desde Supabase (Dura 60 segundos)
        // Sustituye 'manual-clinico.pdf' por el nombre exacto de tu archivo si varía.
        const { data, error } = await supabase
            .storage
            .from('premium-assets')
            .createSignedUrl('manual-clinico.pdf', 60);

        if (error) {
            console.error('Error de Supabase:', error);
            throw new Error('No se pudo descargar el archivo desde la bóveda segura.');
        }

        // 3. Responder al frontend con el link mágico que expirará en un minuto
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ downloadUrl: data.signedUrl })
        };

    } catch (error) {
        console.error('Error en verify-payment:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocurrió un error crítico procesando la descarga segura.' })
        };
    }
};
