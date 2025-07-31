/*
  # Fix referral_links RLS policy

  1. Security Changes
    - Drop existing restrictive INSERT policy
    - Add proper INSERT policy allowing users to create their own referral links
    - Add proper UPDATE policy allowing users to update their own referral links
    - Ensure referrer_id matches authenticated user ID

  This fixes the "new row violates row-level security policy" error.
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can insert their own referral links" ON referral_links;
DROP POLICY IF EXISTS "Users can update their own referral links" ON referral_links;

-- Create proper INSERT policy
CREATE POLICY "Users can insert their own referral links"
  ON referral_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

-- Create proper UPDATE policy  
CREATE POLICY "Users can update their own referral links"
  ON referral_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = referrer_id)
  WITH CHECK (auth.uid() = referrer_id);