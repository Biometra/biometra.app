/*
  # Fix Lucky Draw RLS Policy

  1. Security
    - Add proper INSERT policy for lucky_draw_history table
    - Allow users to insert their own draw history records
    - Ensure user_id matches authenticated user
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert their own draws" ON lucky_draw_history;

-- Create proper INSERT policy for lucky_draw_history
CREATE POLICY "Users can insert their own draw history"
  ON lucky_draw_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure the table has RLS enabled
ALTER TABLE lucky_draw_history ENABLE ROW LEVEL SECURITY;