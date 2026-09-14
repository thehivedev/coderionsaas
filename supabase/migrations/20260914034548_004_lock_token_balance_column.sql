/*
# Lock token_balance Column — Prevent Direct Client Modification

## Overview
Users currently have UPDATE privilege on ALL columns of their own profile row, including `token_balance`. This means any authenticated user can directly set their token balance to any value via the Supabase data API, completely bypassing the `deduct_tokens` RPC function.

This migration restricts column-level UPDATE privileges so users can only modify their display name and avatar — not their token balance, email, or ID.

## Security Changes
1. Revoke table-level UPDATE on `profiles` from `authenticated`
2. Grant column-level UPDATE only on `full_name` and `avatar_url` to `authenticated`
3. `token_balance` changes now MUST go through the `deduct_tokens` or `add_tokens` SECURITY DEFINER functions

## Important Notes
- The UPDATE RLS policy remains in place (auth.uid() = id), but column privileges are checked BEFORE policies, so even though the policy allows the row update, only `full_name` and `avatar_url` can actually be written
- The `deduct_tokens` and `add_tokens` functions run as SECURITY DEFINER (owner), so they bypass RLS and column privileges entirely — this is the intended path for token balance changes
- Email and id remain non-updatable by users (email is set at signup, id is fixed)
*/

-- ============================================================
-- 1. Revoke table-level UPDATE on profiles
-- ============================================================
REVOKE UPDATE ON public.profiles FROM authenticated;

-- ============================================================
-- 2. Grant column-level UPDATE only on user-editable columns
-- ============================================================
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;
