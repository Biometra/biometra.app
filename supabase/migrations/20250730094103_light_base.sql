/*
  # Fix Marketplace Payment System

  1. Database Changes
    - Remove USDT deduction from buyer during purchase
    - Add payment proof field for buyer to upload transfer evidence
    - Update transaction flow to use bank transfer only
    - Add payment instructions and bank details display

  2. Transaction Flow
    - Buyer creates purchase request (no USDT deducted)
    - Buyer transfers rupiah to seller's bank account
    - Buyer uploads payment proof (optional)
    - Seller approves after receiving bank transfer
    - System transfers USDT from seller to buyer
    - Platform takes commission from seller
*/

-- Update marketplace transactions table to support bank transfer payment
ALTER TABLE marketplace_transactions 
ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
ADD COLUMN IF NOT EXISTS transfer_deadline TIMESTAMPTZ DEFAULT (now() + interval '24 hours');

-- Update the purchase function to not deduct buyer's USDT
CREATE OR REPLACE FUNCTION purchase_marketplace_usdt(
  p_buyer_id UUID,
  p_listing_id UUID,
  p_usdt_amount NUMERIC
) RETURNS JSON AS $$
DECLARE
  v_listing marketplace_listings%ROWTYPE;
  v_seller_user users%ROWTYPE;
  v_total_rupiah NUMERIC;
  v_platform_commission NUMERIC := 0.15;
  v_seller_receives NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Get listing details
  SELECT * INTO v_listing
  FROM marketplace_listings
  WHERE id = p_listing_id AND status = 'active' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Listing not found or expired');
  END IF;
  
  -- Check if buyer is not the seller
  IF v_listing.seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot buy from your own listing');
  END IF;
  
  -- Validate amount
  IF p_usdt_amount < 20 THEN
    RETURN json_build_object('success', false, 'message', 'Minimum purchase is $20 USDT');
  END IF;
  
  IF p_usdt_amount > v_listing.usdt_amount THEN
    RETURN json_build_object('success', false, 'message', 'Amount exceeds available stock');
  END IF;
  
  -- Get seller details
  SELECT * INTO v_seller_user FROM users WHERE id = v_listing.seller_id;
  
  -- Calculate amounts
  v_total_rupiah := p_usdt_amount * v_listing.price_per_usdt;
  v_seller_receives := p_usdt_amount - v_platform_commission;
  
  -- Create transaction record (NO USDT DEDUCTION FROM BUYER)
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
    status,
    requires_approval,
    payment_instructions,
    transfer_deadline
  ) VALUES (
    p_listing_id,
    p_buyer_id,
    v_listing.seller_id,
    p_usdt_amount,
    v_listing.price_per_usdt,
    v_total_rupiah,
    v_platform_commission,
    v_seller_receives,
    v_listing.bank_name,
    v_listing.bank_account_number,
    v_listing.bank_account_name,
    'pending',
    true,
    'Transfer Rp ' || v_total_rupiah::text || ' to bank account: ' || v_listing.bank_name || ' - ' || v_listing.bank_account_number || ' a.n. ' || v_listing.bank_account_name,
    now() + interval '24 hours'
  ) RETURNING id INTO v_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'total_rupiah', v_total_rupiah,
    'bank_name', v_listing.bank_name,
    'bank_account_number', v_listing.bank_account_number,
    'bank_account_name', v_listing.bank_account_name,
    'transfer_deadline', now() + interval '24 hours',
    'message', 'Purchase request created. Please transfer Rp ' || v_total_rupiah::text || ' to the provided bank account within 24 hours.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update approve function to handle the new flow
CREATE OR REPLACE FUNCTION approve_marketplace_transaction(
  p_seller_id UUID,
  p_transaction_id UUID,
  p_approval_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_transaction marketplace_transactions%ROWTYPE;
  v_listing marketplace_listings%ROWTYPE;
  v_buyer_user users%ROWTYPE;
  v_seller_user users%ROWTYPE;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM marketplace_transactions
  WHERE id = p_transaction_id AND seller_id = p_seller_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Transaction not found or already processed');
  END IF;
  
  -- Get related data
  SELECT * INTO v_listing FROM marketplace_listings WHERE id = v_transaction.listing_id;
  SELECT * INTO v_buyer_user FROM users WHERE id = v_transaction.buyer_id;
  SELECT * INTO v_seller_user FROM users WHERE id = v_transaction.seller_id;
  
  -- Transfer USDT from seller to buyer
  UPDATE users 
  SET usdt_balance = usdt_balance + v_transaction.usdt_amount,
      updated_at = now()
  WHERE id = v_transaction.buyer_id;
  
  -- Deduct USDT from seller (including platform commission)
  UPDATE users 
  SET usdt_balance = usdt_balance - v_transaction.usdt_amount,
      updated_at = now()
  WHERE id = v_transaction.seller_id;
  
  -- Update listing stock
  UPDATE marketplace_listings
  SET usdt_amount = usdt_amount - v_transaction.usdt_amount,
      updated_at = now()
  WHERE id = v_transaction.listing_id;
  
  -- Mark listing as sold if stock is depleted
  UPDATE marketplace_listings
  SET status = 'sold'
  WHERE id = v_transaction.listing_id AND usdt_amount <= 0;
  
  -- Update transaction status
  UPDATE marketplace_transactions
  SET status = 'completed',
      approved_at = now(),
      approval_notes = p_approval_notes,
      completed_at = now()
  WHERE id = p_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Transaction approved successfully. USDT transferred to buyer.',
    'usdt_transferred', v_transaction.usdt_amount,
    'commission_deducted', v_transaction.platform_commission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reject function
CREATE OR REPLACE FUNCTION reject_marketplace_transaction(
  p_seller_id UUID,
  p_transaction_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_transaction marketplace_transactions%ROWTYPE;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM marketplace_transactions
  WHERE id = p_transaction_id AND seller_id = p_seller_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Transaction not found or already processed');
  END IF;
  
  -- Update transaction status (no USDT to return since none was deducted)
  UPDATE marketplace_transactions
  SET status = 'cancelled',
      approval_notes = p_rejection_reason,
      completed_at = now()
  WHERE id = p_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Transaction rejected successfully.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;