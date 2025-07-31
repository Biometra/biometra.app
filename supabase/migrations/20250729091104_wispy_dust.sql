/*
  # Fix referral_links RLS policies

  1. Security
    - Drop existing policies that may be blocking operations
    - Create proper RLS policies for authenticated users
    - Allow users to insert/update their own referral links
    - Allow users to read their own referral links
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own referral links" ON referral_links;
DROP POLICY IF EXISTS "Users can read their own referral links" ON referral_links;
DROP POLICY IF EXISTS "Users can update their own referral links" ON referral_links;

-- Create proper RLS policies for referral_links table
CREATE POLICY "Allow authenticated users to create their own referral link"
  ON referral_links
  FOR INSERT
  TO authenticated
  WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Allow authenticated users to update their own referral link"
  ON referral_links
  FOR UPDATE
  TO authenticated
  USING (referrer_id = auth.uid())
  WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Allow authenticated users to read their own referral link"
  ON referral_links
  FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());

-- Also allow public read access for referral code validation
CREATE POLICY "Allow public to read active referral codes for validation"
  ON referral_links
  FOR SELECT
  TO public
  USING (is_active = true);