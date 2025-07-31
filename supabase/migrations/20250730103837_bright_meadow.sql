/*
  # Add missing columns to marketplace transactions

  1. New Columns
    - `payment_instructions` (text) - Instructions for buyer payment
    - `transfer_deadline` (timestamptz) - Deadline for payment transfer
    - `requires_approval` (boolean) - Whether transaction needs seller approval
    - `approved_at` (timestamptz) - When seller approved the transaction
    - `approval_notes` (text) - Notes from seller about approval/rejection

  2. Updates
    - Set default values for existing records
    - Add appropriate constraints and indexes
*/

-- Add missing columns to marketplace_transactions table
DO $$
BEGIN
  -- Add payment_instructions column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_transactions' AND column_name = 'payment_instructions'
  ) THEN
    ALTER TABLE marketplace_transactions ADD COLUMN payment_instructions text;
  END IF;

  -- Add transfer_deadline column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_transactions' AND column_name = 'transfer_deadline'
  ) THEN
    ALTER TABLE marketplace_transactions ADD COLUMN transfer_deadline timestamptz DEFAULT (now() + interval '24 hours');
  END IF;

  -- Add requires_approval column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_transactions' AND column_name = 'requires_approval'
  ) THEN
    ALTER TABLE marketplace_transactions ADD COLUMN requires_approval boolean DEFAULT true;
  END IF;

  -- Add approved_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_transactions' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE marketplace_transactions ADD COLUMN approved_at timestamptz;
  END IF;

  -- Add approval_notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_transactions' AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE marketplace_transactions ADD COLUMN approval_notes text;
  END IF;
END $$;

-- Update existing records to have default values
UPDATE marketplace_transactions 
SET 
  requires_approval = true,
  transfer_deadline = created_at + interval '24 hours'
WHERE requires_approval IS NULL OR transfer_deadline IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_deadline 
ON marketplace_transactions(transfer_deadline);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_approval 
ON marketplace_transactions(requires_approval, approved_at);

-- Add comments for documentation
COMMENT ON COLUMN marketplace_transactions.payment_instructions IS 'Instructions for buyer on how to make payment';
COMMENT ON COLUMN marketplace_transactions.transfer_deadline IS 'Deadline for buyer to complete payment transfer';
COMMENT ON COLUMN marketplace_transactions.requires_approval IS 'Whether transaction requires seller approval';
COMMENT ON COLUMN marketplace_transactions.approved_at IS 'Timestamp when seller approved the transaction';
COMMENT ON COLUMN marketplace_transactions.approval_notes IS 'Notes from seller about approval or rejection';