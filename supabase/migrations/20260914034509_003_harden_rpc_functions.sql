/*
# Harden RPC & Trigger Functions

## Overview
Fixes all 7 security advisor warnings:
1. Revoke EXECUTE from PUBLIC on all SECURITY DEFINER functions (PostgreSQL grants EXECUTE to PUBLIC by default — revoking from anon alone is insufficient)
2. `add_tokens`: revoke from all roles (only the service role key calls it, which bypasses permission checks)
3. `deduct_tokens`: grant only to authenticated (called from server-side API route with user session); revoke from anon and PUBLIC
4. `handle_new_user`: revoke from all roles (trigger-only function, must not be callable via REST)
5. `update_updated_at_column`: revoke from all roles + add `SET search_path = public` to fix mutable search_path warning

## Security Changes
- All trigger functions locked down — no longer callable via `/rest/v1/rpc/`
- `add_tokens` locked to service-role-only (webhook uses service key which bypasses checks)
- `deduct_tokens` restricted to authenticated only (has internal `auth.uid()` ownership check)
- `update_updated_at_column` search_path hardened
*/

-- ============================================================
-- 1. add_tokens: service-role only (webhook calls with service key)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.add_tokens(UUID, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_tokens(UUID, BIGINT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_tokens(UUID, BIGINT) FROM authenticated;

-- ============================================================
-- 2. deduct_tokens: authenticated only (internal auth.uid() check)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(UUID, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(UUID, BIGINT) FROM anon;
GRANT EXECUTE ON FUNCTION public.deduct_tokens(UUID, BIGINT) TO authenticated;

-- ============================================================
-- 3. handle_new_user: trigger-only, not callable via REST
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- ============================================================
-- 4. update_updated_at_column: trigger-only + fixed search_path
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;

-- Recreate with SET search_path to fix the mutable search_path warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Re-revoke after recreate (CREATE OR REPLACE resets grants to PUBLIC)
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
