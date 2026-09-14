import type { ActionFunctionArgs } from '@remix-run/node';
import { stripe, STRIPE_WEBHOOK_SECRET, TOKEN_PACKAGES } from '~/lib/stripe.server';
import { createSupabaseServerClient } from '~/lib/supabaseServer';
import { addTokens } from '~/lib/database';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_email || session.customer_details?.email;

    if (!customerEmail) {
      console.error('No customer email found in session:', session.id);
      return new Response('No email found', { status: 400 });
    }

    const priceId = session.line_items?.data?.[0]?.price?.id || '';

    let tokensToAdd = 0;

    for (const key of Object.keys(TOKEN_PACKAGES) as Array<keyof typeof TOKEN_PACKAGES>) {
      if (TOKEN_PACKAGES[key].priceId === priceId) {
        tokensToAdd = TOKEN_PACKAGES[key].tokens;
        break;
      }
    }

    if (tokensToAdd === 0) {
      console.error('Unknown price ID:', priceId);
      return new Response('Unknown price', { status: 400 });
    }

    // Find user by email
    const { supabase } = createSupabaseServerClient(request);
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .single();

    if (userError || !userData) {
      console.error('User not found for email:', customerEmail);
      return new Response('User not found', { status: 404 });
    }

    const newBalance = await addTokens(userData.id, tokensToAdd);

    if (newBalance === null) {
      console.error('Failed to add tokens for user:', userData.id);
      return new Response('Failed to add tokens', { status: 500 });
    }

    console.log(`Added ${tokensToAdd} tokens to user ${userData.id}. New balance: ${newBalance}`);
    return new Response(JSON.stringify({ received: true, newBalance }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
