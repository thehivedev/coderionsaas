import type { ActionFunctionArgs } from '@remix-run/node';
import Stripe from 'stripe';
import { createSupabaseServiceClient } from '~/lib/supabaseServer';
import { getSetting } from '~/lib/settings.server';

const TOKEN_PACKAGES = {
  basic: { tokens: 500_000, settingKey: 'stripe_price_basic' },
  pro: { tokens: 2_000_000, settingKey: 'stripe_price_pro' },
  enterprise: { tokens: 10_000_000, settingKey: 'stripe_price_enterprise' },
} as const;

type TokenPackageKey = keyof typeof TOKEN_PACKAGES;

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const stripeSecretKey = await getSetting('stripe_secret_key');
  const webhookSecret = await getSetting('stripe_webhook_secret');

  if (!stripeSecretKey || !webhookSecret) {
    return new Response('Stripe not configured', { status: 503 });
  }

  const stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_email || session.customer_details?.email;

    if (!customerEmail) {
      console.error('No customer email found in session:', session.id);
      return new Response('No email found', { status: 400 });
    }

    const expandedSession = await stripeClient.checkout.sessions.retrieve(
      session.id,
      { expand: ['line_items'] }
    );

    const lineItems = expandedSession.line_items?.data || [];
    let tokensToAdd = 0;

    for (const item of lineItems) {
      const priceId = item.price?.id || '';
      for (const key of Object.keys(TOKEN_PACKAGES) as TokenPackageKey[]) {
        const pkgPriceId = await getSetting(TOKEN_PACKAGES[key].settingKey);
        if (pkgPriceId && pkgPriceId === priceId) {
          tokensToAdd += TOKEN_PACKAGES[key].tokens * (item.quantity || 1);
          break;
        }
      }
    }

    if (tokensToAdd === 0) {
      console.error('Unknown price ID in line items for session:', session.id);
      return new Response('Unknown price', { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle();

    if (userError || !userData) {
      console.error('User not found for email:', customerEmail);
      return new Response('User not found', { status: 404 });
    }

    const { data: newBalance, error: addError } = await supabase.rpc('add_tokens', {
      p_user_id: userData.id,
      p_amount: tokensToAdd,
    });

    if (addError || newBalance === null) {
      console.error('Failed to add tokens for user:', userData.id, addError);
      return new Response('Failed to add tokens', { status: 500 });
    }

    console.log(`Added ${tokensToAdd} tokens to user ${userData.id}. New balance: ${newBalance}`);
    return Response.json({ received: true, newBalance });
  }

  return Response.json({ received: true });
}
