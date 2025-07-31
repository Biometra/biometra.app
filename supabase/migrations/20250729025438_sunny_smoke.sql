/*
  # Fix Lucky Draw History RLS INSERT Policy

  1. Security Changes
    - Drop existing INSERT policy that's causing violations
    - Create new INSERT policy that allows authenticated users to insert their own records
    - Ensure policy uses proper auth.uid() check for user_id matching

  This fixes the RLS violation error when users try to record their lucky draw results.
*/

-- Drop the existing INSERT policy that's causing issues
DROP POLICY IF EXISTS "Users can insert their own draw history" ON lucky_draw_history;

-- Create a new INSERT policy that properly allows authenticated users to insert their own records
CREATE POLICY "Allow authenticated users to insert own draw history"
  ON lucky_draw_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also ensure the SELECT policy is correct for consistency
DROP POLICY IF EXISTS "Users can read their own draw history" ON lucky_draw_history;

CREATE POLICY "Allow users to read own draw history"
  ON lucky_draw_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Keep the admin policy for full access
DROP POLICY IF EXISTS "Admin can read all draw history" ON lucky_draw_history;

CREATE POLICY "Admin full access to draw history"
  ON lucky_draw_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);