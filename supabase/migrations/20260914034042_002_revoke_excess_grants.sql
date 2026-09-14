/*
# Revoke excess grants

## Overview
Tightens grants on profiles and RPC functions:
1. Revokes DELETE on profiles from authenticated (profiles cascade-delete with auth.users, no manual delete needed)
2. Revokes EXECUTE on add_tokens and deduct_tokens from anon (only authenticated should call these)
*/

REVOKE DELETE ON public.profiles FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_tokens(UUID, BIGINT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.deduct_tokens(UUID, BIGINT) FROM anon;