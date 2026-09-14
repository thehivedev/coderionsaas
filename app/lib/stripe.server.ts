import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not configured — Stripe features will not work');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = stripeWebhookSecret;

export const TOKEN_PACKAGES = {
  basic: {
    name: 'Básico',
    tokens: 500_000,
    price: 10,
    priceId: process.env.STRIPE_PRICE_BASIC || '',
  },
  pro: {
    name: 'Pro',
    tokens: 2_000_000,
    price: 25,
    priceId: process.env.STRIPE_PRICE_PRO || '',
  },
  enterprise: {
    name: 'Empresarial',
    tokens: 10_000_000,
    price: 99,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
  },
} as const;

export type TokenPackageKey = keyof typeof TOKEN_PACKAGES;
