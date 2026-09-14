import type { ActionFunctionArgs } from '@remix-run/node';
import Stripe from 'stripe';
import { createSupabaseServerClient } from '~/lib/supabaseServer';
import { getSetting } from '~/lib/settings.server';

const TOKEN_PACKAGES = {
  basic: { name: 'Basic', tokens: 500_000, price: 10, settingKey: 'stripe_price_basic' },
  pro: { name: 'Pro', tokens: 2_000_000, price: 25, settingKey: 'stripe_price_pro' },
  enterprise: { name: 'Enterprise', tokens: 10_000_000, price: 99, settingKey: 'stripe_price_enterprise' },
} as const;

type TokenPackageKey = keyof typeof TOKEN_PACKAGES;

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return Response.json({ error: 'Not authenticated' }, { status: 401, headers });
  }

  let body: { package?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers });
  }

  const packageKey = body.package as TokenPackageKey | undefined;

  if (!packageKey || !(packageKey in TOKEN_PACKAGES)) {
    return Response.json({ error: 'Invalid package' }, { status: 400, headers });
  }

  const pkg = TOKEN_PACKAGES[packageKey];
  const priceId = await getSetting(pkg.settingKey);

  if (!priceId) {
    return Response.json(
      { error: 'This package is not configured. Configure it in the admin panel.' },
      { status: 503, headers }
    );
  }

  const stripeSecretKey = await getSetting('stripe_secret_key');
  if (!stripeSecretKey) {
    return Response.json(
      { error: 'Stripe is not configured. Configure it in the admin panel.' },
      { status: 503, headers }
    );
  }

  const stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });

  const origin = request.headers.get('Origin') || 'http://localhost:3000';

  let session: Stripe.Checkout.Session;
  try {
    session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
  } catch (err) {
    console.error('Stripe checkout session creation failed:', err);
    return Response.json({ error: 'Could not create payment session.' }, { status: 502, headers });
  }

  return Response.json({ url: session.url }, { headers });
}
