/*
  # Rupiah Marketplace with Bank Account System

  1. New Tables
    - `rupiah_marketplace_listings`
      - `id` (uuid, primary key)
      - `seller_id` (uuid, foreign key to users)
      - `rupiah_amount` (numeric, amount to sell)
      - `price_per_rupiah` (numeric, price in USDT per 1 IDR)
      - `total_usdt_value` (numeric, calculated total)
      - `bank_name` (text, seller's bank)
      - `account_number` (text, seller's account)
      - `account_name` (text, account holder name)
      - `status` (text, active/sold/cancelled)
      - `expires_at` (timestamp, listing expiry)
      - `created_at` (timestamp)
    
    - `rupiah_marketplace_transactions`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key)
      - `buyer_id` (uuid, foreign key to users)
      - `seller_id` (uuid, foreign key to users)
      - `rupiah_amount` (numeric, amount bought)
      - `price_per_rupiah` (numeric, agreed price)
      - `total_usdt_paid` (numeric, total USDT paid)
      - `platform_commission` (numeric, $0.15 commission)
      - `seller_received` (numeric, USDT after commission)
      - `bank_name` (text, seller's bank)
      - `account_number` (text, seller's account)
      - `account_name` (text, account holder name)
      - `payment_proof` (text, buyer's payment proof URL)
      - `status` (text, pending/completed/cancelled)
      - `created_at` (timestamp)
      - `completed_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own data
    - Add policies for reading active listings

  3. Functions
    - `create_rupiah_listing()` - create new listing
    - `purchase_rupiah_listing()` - process purchase
    - `cancel_rupiah_listing()` - cancel listing
    - `complete_rupiah_transaction()` - mark as completed
*/

-- Create rupiah marketplace listings table
CREATE TABLE IF NOT EXISTS rupiah_marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES users(id) ON DELETE CASCADE,
  rupiah_amount numeric NOT NULL CHECK (rupiah_amount > 0),
  price_per_rupiah numeric NOT NULL CHECK (price_per_rupiah > 0),
  total_usdt_value numeric NOT NULL CHECK (total_usdt_value > 0),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Create rupiah marketplace transactions table
CREATE TABLE IF NOT EXISTS rupiah_marketplace_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES rupiah_marketplace_listings(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES users(id) ON DELETE CASCADE,
  rupiah_amount numeric NOT NULL CHECK (rupiah_amount > 0),
  price_per_rupiah numeric NOT NULL CHECK (price_per_rupiah > 0),
  total_usdt_paid numeric NOT NULL CHECK (total_usdt_paid > 0),
  platform_commission numeric NOT NULL DEFAULT 0.15,
  seller_received numeric NOT NULL CHECK (seller_received > 0),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  payment_proof text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE rupiah_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rupiah_marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listings
CREATE POLICY "Users can read active rupiah listings"
  ON rupiah_marketplace_listings
  FOR SELECT
  TO public
  USING (status = 'active' AND expires_at > now());

CREATE POLICY "Users can insert their own rupiah listings"
  ON rupiah_marketplace_listings
  FOR INSERT
  TO public
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can update their own rupiah listings"
  ON rupiah_marketplace_listings
  FOR UPDATE
  TO public
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can read their own rupiah listings"
  ON rupiah_marketplace_listings
  FOR SELECT
  TO public
  USING (seller_id = auth.uid());

-- RLS Policies for transactions
CREATE POLICY "Users can read their own rupiah transactions"
  ON rupiah_marketplace_transactions
  FOR SELECT
  TO public
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can insert rupiah transactions"
  ON rupiah_marketplace_transactions
  FOR INSERT
  TO public
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users can update their own rupiah transactions"
  ON rupiah_marketplace_transactions
  FOR UPDATE
  TO public
  USING (buyer_id = auth.uid() OR seller_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rupiah_listings_seller ON rupiah_marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_rupiah_listings_status ON rupiah_marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_rupiah_listings_expires ON rupiah_marketplace_listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_rupiah_transactions_buyer ON rupiah_marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_rupiah_transactions_seller ON rupiah_marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_rupiah_transactions_listing ON rupiah_marketplace_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_rupiah_transactions_status ON rupiah_marketplace_transactions(status);

-- Function to create rupiah listing
CREATE OR REPLACE FUNCTION create_rupiah_listing(
  p_seller_id uuid,
  p_rupiah_amount numeric,
  p_price_per_rupiah numeric,
  p_bank_name text,
  p_account_number text,
  p_account_name text
) RETURNS json AS $$
DECLARE
  v_total_usdt_value numeric;
  v_listing_id uuid;
BEGIN
  -- Calculate total USDT value
  v_total_usdt_value := p_rupiah_amount * p_price_per_rupiah;
  
  -- Check if user has enough rupiah balance
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_seller_id 
    AND (rupiah_balance >= p_rupiah_amount OR rupiah_balance IS NULL)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient rupiah balance'
    );
  END IF;
  
  -- Create listing
  INSERT INTO rupiah_marketplace_listings (
    seller_id,
    rupiah_amount,
    price_per_rupiah,
    total_usdt_value,
    bank_name,
    account_number,
    account_name
  ) VALUES (
    p_seller_id,
    p_rupiah_amount,
    p_price_per_rupiah,
    v_total_usdt_value,
    p_bank_name,
    p_account_number,
    p_account_name
  ) RETURNING id INTO v_listing_id;
  
  -- Lock rupiah balance (subtract from available balance)
  UPDATE users 
  SET rupiah_balance = COALESCE(rupiah_balance, 0) - p_rupiah_amount,
      updated_at = now()
  WHERE id = p_seller_id;
  
  RETURN json_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'message', 'Listing created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purchase from rupiah listing
CREATE OR REPLACE FUNCTION purchase_rupiah_listing(
  p_buyer_id uuid,
  p_listing_id uuid,
  p_rupiah_amount numeric
) RETURNS json AS $$
DECLARE
  v_listing rupiah_marketplace_listings%ROWTYPE;
  v_total_usdt_cost numeric;
  v_commission numeric := 0.15;
  v_seller_receives numeric;
  v_buyer_balance numeric;
  v_transaction_id uuid;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM rupiah_marketplace_listings
  WHERE id = p_listing_id AND status = 'active' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Listing not found or expired'
    );
  END IF;
  
  -- Check if buyer is not the seller
  IF v_listing.seller_id = p_buyer_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Cannot buy from your own listing'
    );
  END IF;
  
  -- Check if requested amount is available
  IF p_rupiah_amount > v_listing.rupiah_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Requested amount exceeds available'
    );
  END IF;
  
  -- Calculate costs
  v_total_usdt_cost := p_rupiah_amount * v_listing.price_per_rupiah;
  v_seller_receives := v_total_usdt_cost - v_commission;
  
  -- Check buyer's USDT balance
  SELECT COALESCE(usdt_balance, 0) INTO v_buyer_balance
  FROM users WHERE id = p_buyer_id;
  
  IF v_buyer_balance < v_total_usdt_cost THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient USDT balance'
    );
  END IF;
  
  -- Create transaction record
  INSERT INTO rupiah_marketplace_transactions (
    listing_id,
    buyer_id,
    seller_id,
    rupiah_amount,
    price_per_rupiah,
    total_usdt_paid,
    platform_commission,
    seller_received,
    bank_name,
    account_number,
    account_name,
    status
  ) VALUES (
    p_listing_id,
    p_buyer_id,
    v_listing.seller_id,
    p_rupiah_amount,
    v_listing.price_per_rupiah,
    v_total_usdt_cost,
    v_commission,
    v_seller_receives,
    v_listing.bank_name,
    v_listing.account_number,
    v_listing.account_name,
    'pending'
  ) RETURNING id INTO v_transaction_id;
  
  -- Update buyer's USDT balance (deduct payment)
  UPDATE users 
  SET usdt_balance = usdt_balance - v_total_usdt_cost,
      updated_at = now()
  WHERE id = p_buyer_id;
  
  -- Update seller's USDT balance (add payment minus commission)
  UPDATE users 
  SET usdt_balance = COALESCE(usdt_balance, 0) + v_seller_receives,
      updated_at = now()
  WHERE id = v_listing.seller_id;
  
  -- Update listing (reduce available amount or mark as sold)
  IF p_rupiah_amount = v_listing.rupiah_amount THEN
    -- Full purchase - mark as sold
    UPDATE rupiah_marketplace_listings
    SET status = 'sold',
        rupiah_amount = 0
    WHERE id = p_listing_id;
  ELSE
    -- Partial purchase - reduce amount
    UPDATE rupiah_marketplace_listings
    SET rupiah_amount = rupiah_amount - p_rupiah_amount,
        total_usdt_value = (rupiah_amount - p_rupiah_amount) * price_per_rupiah
    WHERE id = p_listing_id;
  END IF;
  
  -- Mark transaction as completed
  UPDATE rupiah_marketplace_transactions
  SET status = 'completed',
      completed_at = now()
  WHERE id = v_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'total_paid', v_total_usdt_cost,
    'commission', v_commission,
    'seller_received', v_seller_receives,
    'bank_name', v_listing.bank_name,
    'account_number', v_listing.account_number,
    'account_name', v_listing.account_name,
    'message', 'Purchase completed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel rupiah listing
CREATE OR REPLACE FUNCTION cancel_rupiah_listing(
  p_seller_id uuid,
  p_listing_id uuid
) RETURNS json AS $$
DECLARE
  v_listing rupiah_marketplace_listings%ROWTYPE;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM rupiah_marketplace_listings
  WHERE id = p_listing_id AND seller_id = p_seller_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Listing not found or cannot be cancelled'
    );
  END IF;
  
  -- Return locked rupiah to seller
  UPDATE users 
  SET rupiah_balance = COALESCE(rupiah_balance, 0) + v_listing.rupiah_amount,
      updated_at = now()
  WHERE id = p_seller_id;
  
  -- Mark listing as cancelled
  UPDATE rupiah_marketplace_listings
  SET status = 'cancelled'
  WHERE id = p_listing_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Listing cancelled successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;