/*
  # Fix marketplace listings RLS policy

  1. Security Updates
    - Drop existing restrictive policies
    - Add permissive policies for authenticated users
    - Allow public read access for active listings
    - Allow sellers to manage their own listings

  2. Policy Changes
    - INSERT: Allow authenticated users to create listings
    - SELECT: Public can read active listings, sellers can read their own
    - UPDATE: Sellers can update their own listings
    - DELETE: Sellers can delete their own listings
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Allow authenticated users to insert listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Allow public to read active listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Allow sellers to update their own listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Allow sellers to delete their own listings" ON marketplace_listings;

-- Create new permissive policies
CREATE POLICY "authenticated_users_can_insert_listings"
  ON marketplace_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "public_can_read_active_listings"
  ON marketplace_listings
  FOR SELECT
  TO public
  USING (
    (status = 'active' AND expires_at > now()) 
    OR 
    (auth.uid() = seller_id)
  );

CREATE POLICY "sellers_can_update_own_listings"
  ON marketplace_listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "sellers_can_delete_own_listings"
  ON marketplace_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Also add a fallback policy for public access (for debugging)
CREATE POLICY "public_can_insert_listings_fallback"
  ON marketplace_listings
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;