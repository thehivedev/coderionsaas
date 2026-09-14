import type { ActionFunctionArgs } from '@remix-run/node';
import { stripe, TOKEN_PACKAGES, type TokenPackageKey } from '~/lib/stripe.server';
import { createSupabaseServerClient } from '~/lib/supabaseServer';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return Response.json(
      { error: 'No autenticado' },
      { status: 401, headers }
    );
  }

  let body: { package?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Cuerpo de la petición inválido' },
      { status: 400, headers }
    );
  }

  const packageKey = body.package as TokenPackageKey | undefined;

  if (!packageKey || !(packageKey in TOKEN_PACKAGES)) {
    return Response.json(
      { error: 'Paquete inválido' },
      { status: 400, headers }
    );
  }

  const pkg = TOKEN_PACKAGES[packageKey];

  if (!pkg.priceId) {
    return Response.json(
      { error: 'Este paquete no está configurado todavía.' },
      { status: 503, headers }
    );
  }

  const origin = request.headers.get('Origin') || 'http://localhost:3000';

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: pkg.priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
  } catch (err) {
    console.error('Stripe checkout session creation failed:', err);
    return Response.json(
      { error: 'No se pudo crear la sesión de pago.' },
      { status: 502, headers }
    );
  }

  return Response.json({ url: session.url }, { headers });
}
