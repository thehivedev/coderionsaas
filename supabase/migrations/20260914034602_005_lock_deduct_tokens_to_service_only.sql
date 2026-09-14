/*
# Lock deduct_tokens to Service-Role Only

## Overview
The `deduct_tokens` function is callable by any authenticated user via `/rest/v1/rpc/deduct_tokens`. Although it has an internal `auth.uid()` ownership check, the function is only meant to be called from the server-side chat API route (which uses the user's session cookie). Exposing it via REST lets users attempt direct calls.

This migration revokes EXECUTE from all roles except the service role (which bypasses permission checks anyway). The server-side `api.chat.ts` route calls `supabase.rpc('deduct_tokens')` using the user's session — since the server client runs as the user, this would now fail.

## Resolution
The server-side chat API route (`api.chat.ts`) must use the service role client for token deduction, not the user's session client. This is the correct pattern: the user authenticates, the server verifies the user's session, calls OpenRouter, then uses the service role to deduct tokens — the user never directly touches the deduction function.

## Security Changes
- Revoke EXECUTE on `deduct_tokens` from PUBLIC, anon, and authenticated
- Only the service role (which bypasses all permission checks) can call it
*/

REVOKE EXECUTE ON FUNCTION public.deduct_tokens(UUID, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(UUID, BIGINT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(UUID, BIGINT) FROM authenticated;
