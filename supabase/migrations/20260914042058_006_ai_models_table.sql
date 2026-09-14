/*
# AI Models Configuration Table

## Purpose
Creates a new `ai_models` table to store configurable AI models that users can select from.
This replaces the hardcoded model in api.chat.ts, allowing the admin to add/remove/adjust
models and pricing without touching code. Each model has a markup multiplier so the
operator controls profit margins per model.

## New Tables
- `ai_models`
  - `id` (uuid, primary key)
  - `name` (text, not null) — display name shown to users (e.g. "Claude 3.5 Sonnet")
  - `provider` (text, not null) — provider identifier (e.g. "openrouter")
  - `model_id` (text, not null) — the model identifier used by the API (e.g. "anthropic/claude-3.5-sonnet")
  - `input_price_per_token` (numeric, default 0) — cost per input token in USD
  - `output_price_per_token` (numeric, default 0) — cost per output token in USD
  - `markup_multiplier` (numeric, default 1.0) — profit margin multiplier (1.5 = 50% markup)
  - `token_cost_multiplier` (numeric, default 1.0) — how many user tokens are consumed per actual token (combines price + markup)
  - `is_active` (boolean, default true) — whether the model is available for selection
  - `sort_order` (integer, default 0) — display ordering
  - `badge` (text, nullable) — optional badge text (e.g. "Premium", "Económico")
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Modified Tables
- `profiles` — adds `preferred_model_id` (uuid, nullable, references ai_models.id ON DELETE SET NULL)
  so each user can have a default model preference.

## Security
- RLS enabled on `ai_models`.
- SELECT: any authenticated user can see active models (needed for the model selector).
- INSERT/UPDATE/DELETE: only the service role can manage models (admin operations via server-side API).
- No anon access since this app requires authentication.

## Seed Data
- Inserts 3 default models: DeepSeek V4 Pro (current), Claude 3.5 Sonnet, and Llama 3.3 70B.
*/

CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openrouter',
  model_id TEXT NOT NULL,
  input_price_per_token NUMERIC(12,8) NOT NULL DEFAULT 0,
  output_price_per_token NUMERIC(12,8) NOT NULL DEFAULT 0,
  markup_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  token_cost_multiplier NUMERIC(8,2) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  badge TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add preferred_model_id to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferred_model_id'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN preferred_model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON public.ai_models(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_model ON public.profiles(preferred_model_id);

-- RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read models (to populate the selector)
DROP POLICY IF EXISTS "select_ai_models" ON public.ai_models;
CREATE POLICY "select_ai_models"
  ON public.ai_models FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete (admin operations via server-side)
-- No INSERT/UPDATE/DELETE policies for authenticated → service role bypasses RLS
DROP POLICY IF EXISTS "insert_ai_models" ON public.ai_models;
CREATE POLICY "insert_ai_models"
  ON public.ai_models FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "update_ai_models" ON public.ai_models;
CREATE POLICY "update_ai_models"
  ON public.ai_models FOR UPDATE
  TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "delete_ai_models" ON public.ai_models;
CREATE POLICY "delete_ai_models"
  ON public.ai_models FOR DELETE
  TO authenticated
  USING (false);

-- Grant access
GRANT SELECT ON public.ai_models TO authenticated;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_ai_models_updated_at ON public.ai_models;
CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default models
INSERT INTO public.ai_models (name, provider, model_id, input_price_per_token, output_price_per_token, markup_multiplier, token_cost_multiplier, is_active, sort_order, badge)
VALUES
  ('DeepSeek V4 Pro', 'openrouter', 'deepseek/deepseek-v4-pro-0813', 0.000001, 0.000002, 1.0, 1.0, true, 1, 'Económico'),
  ('Claude 3.5 Sonnet', 'openrouter', 'anthropic/claude-3.5-sonnet', 0.000003, 0.000015, 1.5, 2.0, true, 2, 'Premium'),
  ('Llama 3.3 70B', 'openrouter', 'meta-llama/llama-3.3-70b-instruct', 0.0000007, 0.0000008, 1.2, 1.2, true, 3, 'Económico')
ON CONFLICT DO NOTHING;

-- Set the existing hardcoded model as default preference for all existing users
UPDATE public.profiles
SET preferred_model_id = (
  SELECT id FROM public.ai_models WHERE model_id = 'deepseek/deepseek-v4-pro-0813' LIMIT 1
)
WHERE preferred_model_id IS NULL;
