/*
  # Add unique constraint to referral_links table

  1. Changes
    - Add unique constraint on referrer_id column in referral_links table
    - This enables ON CONFLICT functionality for upsert operations

  2. Security
    - No changes to existing RLS policies
*/

-- Add unique constraint to referrer_id column
ALTER TABLE referral_links ADD CONSTRAINT unique_referrer_id UNIQUE (referrer_id);