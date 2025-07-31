/*
  # Add requires_approval column to marketplace_transactions

  1. Changes
    - Add `requires_approval` column to marketplace_transactions table
    - Set default value to true (all transactions require approval)
    - Add `approved_at` and `approval_notes` columns for tracking approvals

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add requires_approval column to marketplace_transactions
ALTER TABLE marketplace_transactions 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT true;

-- Add approval tracking columns
ALTER TABLE marketplace_transactions 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE marketplace_transactions 
ADD COLUMN IF NOT EXISTS approval_notes TEXT DEFAULT NULL;

-- Update existing transactions to require approval
UPDATE marketplace_transactions 
SET requires_approval = true 
WHERE requires_approval IS NULL;