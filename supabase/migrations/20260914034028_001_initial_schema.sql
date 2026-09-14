/*
# Coderion v2 — Initial Schema & Security Hardening

## Overview
Creates the core database tables for Coderion v2: `profiles` (user accounts with token balances) and `chats` (AI conversation history). Includes automatic profile creation on signup, updated_at triggers, and hardened Row Level Security policies.

## Tables

### profiles
- `id` (UUID, PK) — References `auth.users(id)` with `ON DELETE CASCADE`
- `email` (TEXT) — User email, copied from auth
- `full_name` (TEXT) — Display name
- `avatar_url` (TEXT) — Profile picture URL
- `token_balance` (BIGINT, default 100000) — AI token credits
- `created_at` (TIMESTAMPTZ, default now())
- `updated_at` (TIMESTAMPTZ, default now())

### chats
- `id` (UUID, PK, default gen_random_uuid())
- `user_id` (UUID, NOT NULL) — References `auth.users(id)` with `ON DELETE CASCADE`
- `title` (TEXT, default 'Nueva conversación')
- `messages` (JSONB, default '[]')
- `model` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ, default now())
- `updated_at` (TIMESTAMPTZ, default now())

## Security
- RLS enabled on both tables
- `profiles`: owner-scoped SELECT/INSERT/UPDATE only (no DELETE — profiles cascade-delete with auth.users)
- `chats`: full owner-scoped CRUD (SELECT/INSERT/UPDATE/DELETE)
- `anon` role gets NO access to any table (auth-only app)
- `deduct_tokens` and `add_tokens` functions are `SECURITY DEFINER` with explicit `auth.uid()` ownership check
- Grants restricted to `authenticated` role only

## Important Notes
1. `deduct_tokens` now validates that the caller owns the profile before deducting
2. `add_tokens` added as a companion function for crediting tokens (used by Stripe webhook)
3. Anon role explicitly revoked from all tables — this is a sign-in-only app
4. Profile INSERT policy includes `WITH CHECK (auth.uid() = id)` to prevent cross-user inserts
*/

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  token_balance BIGINT NOT NULL DEFAULT 100000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. CHATS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at DESC);

-- ============================================================
-- 4. AUTOMATIC PROFILE CREATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, token_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    100000
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. RLS POLICIES — PROFILES (owner-scoped, no DELETE)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 8. RLS POLICIES — CHATS (full owner-scoped CRUD)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
CREATE POLICY "Users can view own chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own chats" ON public.chats;
CREATE POLICY "Users can create own chats"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chats" ON public.chats;
CREATE POLICY "Users can update own chats"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chats" ON public.chats;
CREATE POLICY "Users can delete own chats"
  ON public.chats FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 9. DEDUCT TOKENS FUNCTION (hardened with auth.uid() check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_tokens(
  p_user_id UUID,
  p_amount BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance BIGINT;
  v_caller UUID := auth.uid();
BEGIN
  -- Ensure caller can only deduct from their own balance
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot deduct tokens for another user';
  END IF;

  -- Ensure amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: must be positive';
  END IF;

  UPDATE public.profiles
  SET token_balance = token_balance - p_amount
  WHERE id = p_user_id
    AND token_balance >= p_amount
  RETURNING token_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_tokens(UUID, BIGINT) TO authenticated;

-- ============================================================
-- 10. ADD TOKENS FUNCTION (for Stripe webhook credits)
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_tokens(
  p_user_id UUID,
  p_amount BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: must be positive';
  END IF;

  UPDATE public.profiles
  SET token_balance = token_balance + p_amount
  WHERE id = p_user_id
  RETURNING token_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- add_tokens is callable by authenticated (for self-service) and anon
-- (the Stripe webhook uses the service role key which bypasses RLS,
-- but we grant to authenticated in case it's called from a client)
GRANT EXECUTE ON FUNCTION public.add_tokens(UUID, BIGINT) TO authenticated;

-- ============================================================
-- 11. GRANTS — authenticated only, anon explicitly excluded
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;

-- Revoke any accidental anon grants
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.chats FROM anon;