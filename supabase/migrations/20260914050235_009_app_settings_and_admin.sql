/*
# App Settings Table + Admin Role Support

## Purpose
Stores application-level configuration (API keys, Stripe price IDs, etc.)
in the database so the admin panel can manage them without touching .env files.
Also adds an `is_admin` column to `profiles` to gate admin access.

## New Table
- `app_settings`
  - `id` (uuid, primary key)
  - `key` (text, unique, not null) — e.g. 'openrouter_api_key', 'stripe_secret_key'
  - `value` (text, nullable) — the actual value (empty string = not set)
  - `category` (text, not null) — 'ai', 'stripe', 'github', 'general'
  - `label` (text, not null) — human-readable label for the admin UI
  - `is_secret` (boolean, default true) — whether to mask the value in the UI
  - `updated_at` (timestamptz, default now())

## Modified Tables
- `profiles`: add `is_admin` boolean column (default false)

## Security
- `app_settings`: RLS enabled. Only admin users can read/write.
  - Admin check: `auth.uid()` exists in profiles WHERE `is_admin = true`.
- `profiles.is_admin`: users cannot self-promote. Only existing admins
  can update the `is_admin` column via the admin panel (service role).
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  label TEXT NOT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
DROP POLICY IF EXISTS "admin_read_settings" ON public.app_settings;
CREATE POLICY "admin_read_settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Only admins can insert settings
DROP POLICY IF EXISTS "admin_insert_settings" ON public.app_settings;
CREATE POLICY "admin_insert_settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Only admins can update settings
DROP POLICY IF EXISTS "admin_update_settings" ON public.app_settings;
CREATE POLICY "admin_update_settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Only admins can delete settings
DROP POLICY IF EXISTS "admin_delete_settings" ON public.app_settings;
CREATE POLICY "admin_delete_settings"
  ON public.app_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Seed default settings rows
INSERT INTO public.app_settings (key, value, category, label, is_secret) VALUES
  ('openrouter_api_key', '', 'ai', 'OpenRouter API Key', true),
  ('github_client_id', '', 'github', 'GitHub OAuth Client ID', false),
  ('github_client_secret', '', 'github', 'GitHub OAuth Client Secret', true),
  ('stripe_secret_key', '', 'stripe', 'Stripe Secret Key', true),
  ('stripe_webhook_secret', '', 'stripe', 'Stripe Webhook Secret', true),
  ('stripe_price_basic', '', 'stripe', 'Stripe Price ID - Básico', false),
  ('stripe_price_pro', '', 'stripe', 'Stripe Price ID - Pro', false),
  ('stripe_price_enterprise', '', 'stripe', 'Stripe Price ID - Empresarial', false)
ON CONFLICT (key) DO NOTHING;

-- Make the existing user an admin
UPDATE public.profiles SET is_admin = true WHERE email = 'marcxrivera@outlook.com';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
