/*
  # Fix referral_links RLS policies

  1. Security
    - Drop all existing policies to avoid conflicts
    - Create proper RLS policies for authenticated users
    - Allow INSERT for authenticated users
    - Allow UPDATE for own referral links
    - Allow SELECT for own referral links and public validation
*/

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to create their own referral link" ON referral_links;
DROP POLICY IF EXISTS "Allow authenticated users to read their own referral link" ON referral_links;
DROP POLICY IF EXISTS "Allow authenticated users to update their own referral link" ON referral_links;
DROP POLICY IF EXISTS "Allow public to read active referral codes for validation" ON referral_links;
DROP POLICY IF EXISTS "Users can insert their own referral links" ON referral_links;
DROP POLICY IF EXISTS "Users can read their own referral links" ON referral_links;
DROP POLICY IF EXISTS "Users can update their own referral links" ON referral_links;
DROP POLICY IF EXISTS "Public can read active referral codes" ON referral_links;

-- Create proper RLS policies
CREATE POLICY "authenticated_users_can_insert_own_referral_links"
  ON referral_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "authenticated_users_can_update_own_referral_links"
  ON referral_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = referrer_id)
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "authenticated_users_can_read_own_referral_links"
  ON referral_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "public_can_read_active_referral_codes"
  ON referral_links
  FOR SELECT
  TO public
  USING (is_active = true);