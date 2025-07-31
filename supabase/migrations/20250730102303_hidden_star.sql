/*
  # Fix marketplace transactions RLS policy

  1. Security Updates
    - Update RLS policy for marketplace_transactions table
    - Allow authenticated users to insert transactions where they are the buyer
    - Ensure proper access control for marketplace operations

  2. Changes Made
    - Drop existing restrictive INSERT policy
    - Create new policy allowing authenticated users to insert their own transactions
    - Maintain security by checking buyer_id matches authenticated user
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert marketplace transactions" ON marketplace_transactions;

-- Create new INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert marketplace transactions"
  ON marketplace_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Ensure the policy for reading transactions is correct
DROP POLICY IF EXISTS "Users can read their own marketplace transactions" ON marketplace_transactions;

CREATE POLICY "Users can read their own marketplace transactions"
  ON marketplace_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Ensure the policy for updating transactions is correct
DROP POLICY IF EXISTS "Users can update their own marketplace transactions" ON marketplace_transactions;

CREATE POLICY "Users can update their own marketplace transactions"
  ON marketplace_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);