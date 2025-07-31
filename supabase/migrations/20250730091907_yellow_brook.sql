/*
  # USDT Marketplace Schema

  1. New Tables
    - `marketplace_listings`
      - `id` (uuid, primary key)
      - `seller_id` (uuid, foreign key to users)
      - `usdt_amount` (numeric, amount of USDT to sell)
      - `price_per_usdt` (numeric, price in rupiah per 1 USDT)
      - `total_rupiah_value` (numeric, total value in rupiah)
      - `bank_name` (text, seller's bank name)
      - `bank_account_number` (text, seller's account number)
      - `bank_account_name` (text, seller's account name)
      - `status` (text, listing status)
      - `expires_at` (timestamptz, expiry date)
      - `created_at` (timestamptz, creation date)

    - `marketplace_transactions`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key to marketplace_listings)
      - `buyer_id` (uuid, foreign key to users)
      - `seller_id` (uuid, foreign key to users)
      - `usdt_amount` (numeric, amount of USDT traded)
      - `price_per_usdt` (numeric, price per USDT in rupiah)
      - `total_rupiah_paid` (numeric, total rupiah paid by buyer)
      - `platform_commission` (numeric, platform commission in USDT)
      - `seller_received` (numeric, USDT received by seller after commission)
      - `bank_name` (text, bank details)
      - `bank_account_number` (text, account number)
      - `bank_account_name` (text, account name)
      - `payment_proof` (text, optional payment proof)
      - `status` (text, transaction status)
      - `created_at` (timestamptz, transaction date)
      - `completed_at` (timestamptz, completion date)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own data
    - Add policies for public to read active listings

  3. Functions
    - `create_marketplace_listing` - create new USDT listing
    - `purchase_marketplace_usdt` - purchase USDT from listing
    - `cancel_marketplace_listing` - cancel listing and return USDT
*/

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES users(id) ON DELETE CASCADE,
  usdt_amount numeric NOT NULL CHECK (usdt_amount > 0),
  price_per_usdt numeric NOT NULL CHECK (price_per_usdt > 0),
  total_rupiah_value numeric NOT NULL CHECK (total_rupiah_value > 0),
  bank_name text NOT NULL,
  bank_account_number text NOT NULL,
  bank_account_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Create marketplace_transactions table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES users(id) ON DELETE CASCADE,
  usdt_amount numeric NOT NULL CHECK (usdt_amount > 0),
  price_per_usdt numeric NOT NULL CHECK (price_per_usdt > 0),
  total_rupiah_paid numeric NOT NULL CHECK (total_rupiah_paid > 0),
  platform_commission numeric NOT NULL DEFAULT 0.15,
  seller_received numeric NOT NULL CHECK (seller_received > 0),
  bank_name text NOT NULL,
  bank_account_number text NOT NULL,
  bank_account_name text NOT NULL,
  payment_proof text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_expires ON marketplace_listings(expires_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_listing ON marketplace_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status ON marketplace_transactions(status);

-- Enable Row Level Security
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_listings
CREATE POLICY "Users can insert their own marketplace listings"
  ON marketplace_listings
  FOR INSERT
  TO public
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can read active marketplace listings"
  ON marketplace_listings
  FOR SELECT
  TO public
  USING (status = 'active' AND expires_at > now());

CREATE POLICY "Users can read their own marketplace listings"
  ON marketplace_listings
  FOR SELECT
  TO public
  USING (seller_id = auth.uid());

CREATE POLICY "Users can update their own marketplace listings"
  ON marketplace_listings
  FOR UPDATE
  TO public
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- RLS Policies for marketplace_transactions
CREATE POLICY "Users can insert marketplace transactions"
  ON marketplace_transactions
  FOR INSERT
  TO public
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users can read their own marketplace transactions"
  ON marketplace_transactions
  FOR SELECT
  TO public
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can update their own marketplace transactions"
  ON marketplace_transactions
  FOR UPDATE
  TO public
  USING (buyer_id = auth.uid() OR seller_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Function to create marketplace listing
CREATE OR REPLACE FUNCTION create_marketplace_listing(
  p_seller_id uuid,
  p_usdt_amount numeric,
  p_price_per_usdt numeric,
  p_bank_name text,
  p_bank_account_number text,
  p_bank_account_name text
) RETURNS json AS $$
DECLARE
  v_seller_usdt_balance numeric;
  v_total_rupiah_value numeric;
  v_listing_id uuid;
BEGIN
  -- Check seller's USDT balance
  SELECT usdt_balance INTO v_seller_usdt_balance
  FROM users
  WHERE id = p_seller_id;
  
  IF v_seller_usdt_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF v_seller_usdt_balance < p_usdt_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient USDT balance');
  END IF;
  
  -- Calculate total rupiah value
  v_total_rupiah_value := p_usdt_amount * p_price_per_usdt;
  
  -- Lock seller's USDT
  UPDATE users
  SET usdt_balance = usdt_balance - p_usdt_amount,
      updated_at = now()
  WHERE id = p_seller_id;
  
  -- Create listing
  INSERT INTO marketplace_listings (
    seller_id,
    usdt_amount,
    price_per_usdt,
    total_rupiah_value,
    bank_name,
    bank_account_number,
    bank_account_name
  ) VALUES (
    p_seller_id,
    p_usdt_amount,
    p_price_per_usdt,
    v_total_rupiah_value,
    p_bank_name,
    p_bank_account_number,
    p_bank_account_name
  ) RETURNING id INTO v_listing_id;
  
  RETURN json_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'message', 'Listing created successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purchase USDT from marketplace
CREATE OR REPLACE FUNCTION purchase_marketplace_usdt(
  p_buyer_id uuid,
  p_listing_id uuid,
  p_usdt_amount numeric
) RETURNS json AS $$
DECLARE
  v_listing marketplace_listings%ROWTYPE;
  v_buyer_usdt_balance numeric;
  v_total_rupiah_cost numeric;
  v_platform_commission numeric := 0.15;
  v_seller_received numeric;
  v_transaction_id uuid;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = p_listing_id AND status = 'active' AND expires_at > now();
  
  IF v_listing.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Listing not found or expired');
  END IF;
  
  IF v_listing.seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot buy from your own listing');
  END IF;
  
  IF p_usdt_amount > v_listing.usdt_amount THEN
    RETURN json_build_object('success', false, 'message', 'Amount exceeds available USDT');
  END IF;
  
  -- Calculate costs
  v_total_rupiah_cost := p_usdt_amount * v_listing.price_per_usdt;
  v_seller_received := p_usdt_amount - v_platform_commission;
  
  -- Check buyer's USDT balance (used as booking fee)
  SELECT usdt_balance INTO v_buyer_usdt_balance
  FROM users
  WHERE id = p_buyer_id;
  
  IF v_buyer_usdt_balance < v_total_rupiah_cost THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient USDT balance for booking');
  END IF;
  
  -- Process transaction
  -- Deduct USDT from buyer (booking fee)
  UPDATE users
  SET usdt_balance = usdt_balance - v_total_rupiah_cost,
      updated_at = now()
  WHERE id = p_buyer_id;
  
  -- Add USDT to seller (minus commission)
  UPDATE users
  SET usdt_balance = usdt_balance + v_seller_received,
      updated_at = now()
  WHERE id = v_listing.seller_id;
  
  -- Update listing
  IF p_usdt_amount = v_listing.usdt_amount THEN
    -- Full purchase - mark as sold
    UPDATE marketplace_listings
    SET status = 'sold',
        usdt_amount = 0
    WHERE id = p_listing_id;
  ELSE
    -- Partial purchase - reduce amount
    UPDATE marketplace_listings
    SET usdt_amount = usdt_amount - p_usdt_amount,
        total_rupiah_value = (usdt_amount - p_usdt_amount) * price_per_usdt
    WHERE id = p_listing_id;
  END IF;
  
  -- Record transaction
  INSERT INTO marketplace_transactions (
    listing_id,
    buyer_id,
    seller_id,
    usdt_amount,
    price_per_usdt,
    total_rupiah_paid,
    platform_commission,
    seller_received,
    bank_name,
    bank_account_number,
    bank_account_name,
    status
  ) VALUES (
    p_listing_id,
    p_buyer_id,
    v_listing.seller_id,
    p_usdt_amount,
    v_listing.price_per_usdt,
    v_total_rupiah_cost,
    v_platform_commission,
    v_seller_received,
    v_listing.bank_name,
    v_listing.bank_account_number,
    v_listing.bank_account_name,
    'completed'
  ) RETURNING id INTO v_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'bank_name', v_listing.bank_name,
    'bank_account_number', v_listing.bank_account_number,
    'bank_account_name', v_listing.bank_account_name,
    'total_rupiah', v_total_rupiah_cost,
    'message', 'Purchase completed successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel marketplace listing
CREATE OR REPLACE FUNCTION cancel_marketplace_listing(
  p_seller_id uuid,
  p_listing_id uuid
) RETURNS json AS $$
DECLARE
  v_listing marketplace_listings%ROWTYPE;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = p_listing_id AND seller_id = p_seller_id AND status = 'active';
  
  IF v_listing.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Listing not found or not owned by you');
  END IF;
  
  -- Return USDT to seller
  UPDATE users
  SET usdt_balance = usdt_balance + v_listing.usdt_amount,
      updated_at = now()
  WHERE id = p_seller_id;
  
  -- Cancel listing
  UPDATE marketplace_listings
  SET status = 'cancelled'
  WHERE id = p_listing_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Listing cancelled successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;