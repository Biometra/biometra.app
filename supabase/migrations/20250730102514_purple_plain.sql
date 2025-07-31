/*
  # Update marketplace transactions RLS policies

  1. Security Updates
    - Drop existing restrictive policies
    - Add new policies for authenticated users
    - Allow INSERT for authenticated users where buyer_id matches auth.uid()
    - Allow SELECT/UPDATE for transaction participants
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can insert marketplace transactions" ON marketplace_transactions;
DROP POLICY IF EXISTS "Users can read their own marketplace transactions" ON marketplace_transactions;
DROP POLICY IF EXISTS "Users can update their own marketplace transactions" ON marketplace_transactions;

-- Create new policies for authenticated users
CREATE POLICY "Allow authenticated users to insert transactions"
  ON marketplace_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Allow users to read their transactions"
  ON marketplace_transactions
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Allow users to update their transactions"
  ON marketplace_transactions
  FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());