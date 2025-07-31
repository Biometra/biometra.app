/*
  # Add increment_lifetime_ore RPC function

  1. Functions
    - `increment_lifetime_ore` - Safely increment lifetime_ore_earned for a user
  
  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Only increments, never decrements (safe operation)
*/

CREATE OR REPLACE FUNCTION increment_lifetime_ore(user_id UUID, ore_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET lifetime_ore_earned = COALESCE(lifetime_ore_earned, 0) + ore_amount
  WHERE id = user_id;
END;
$$;