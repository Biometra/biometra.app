/*
  # Fix marketplace transactions RLS policies

  1. Security Updates
    - Drop existing conflicting policies
    - Create new policies for authenticated users
    - Allow INSERT for authenticated users where buyer_id matches auth.uid()
    - Allow SELECT/UPDATE for users involved in transactions

  2. Changes
    - Remove public role policies that may conflict
    - Add proper authenticated user policies
    - Ensure auth.uid() is used correctly for RLS
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow users to insert their transactions" ON marketplace_transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON marketplace_transactions;
DROP POLICY IF EXISTS "Allow users to read their transactions" ON marketplace_transactions;
DROP POLICY IF EXISTS "Allow users to update their transactions" ON marketplace_transactions;

-- Create new policies for authenticated users
CREATE POLICY "Authenticated users can insert their own transactions"
  ON marketplace_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can read their own transactions"
  ON marketplace_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update their own transactions"
  ON marketplace_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);