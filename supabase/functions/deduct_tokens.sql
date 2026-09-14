-- ============================================
-- CODERION v2 - DEDUCT TOKENS FUNCTION
-- ============================================
-- Execute this in Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION public.deduct_tokens(
  p_user_id UUID,
  p_amount BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  -- Check if user has enough tokens
  UPDATE public.profiles
  SET token_balance = token_balance - p_amount
  WHERE id = p_user_id
    AND token_balance >= p_amount
  RETURNING token_balance INTO v_new_balance;

  -- If no row was updated, user doesn't have enough tokens
  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_tokens(UUID, BIGINT) TO authenticated;
