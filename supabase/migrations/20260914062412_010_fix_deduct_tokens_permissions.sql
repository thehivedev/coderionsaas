-- Add auth.uid() ownership check to deduct_tokens, then grant EXECUTE to authenticated
-- This allows the function to be called with the user's session client instead of the service role client

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
BEGIN
  -- Ensure the caller can only deduct from their own account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot deduct tokens from another user';
  END IF;

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
