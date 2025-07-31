/*
  # Fix RLS policy for lucky_draw_history table

  1. Security Changes
    - Drop existing restrictive INSERT policy
    - Add new policy allowing authenticated users to insert their own records
    - Ensure users can only insert records where user_id matches their auth.uid()

  2. Policy Details
    - INSERT policy: Users can insert records where user_id = auth.uid()
    - This allows the lucky draw functionality to work properly
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own draw history" ON lucky_draw_history;

-- Create a new INSERT policy that allows authenticated users to insert their own records
CREATE POLICY "Users can insert their own draw history"
  ON lucky_draw_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure the existing SELECT policy is correct
DROP POLICY IF EXISTS "Users can read their own draw history" ON lucky_draw_history;

CREATE POLICY "Users can read their own draw history"
  ON lucky_draw_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);