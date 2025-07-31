/*
  # Fix RLS policies for marketplace chat system

  1. Security Updates
    - Update marketplace_chats INSERT policy to allow users to create chats for their transactions
    - Update marketplace_chats SELECT policy to allow users to read their own chats
    - Update marketplace_chat_messages INSERT policy to allow users to send messages in their chats
    - Update marketplace_chat_messages SELECT policy to allow users to read messages in their chats

  2. Policy Changes
    - Allow authenticated users to create chats where they are buyer or seller
    - Allow users to read chats where they participate
    - Allow users to send messages in chats they participate in
    - Allow users to read messages in chats they participate in
*/

-- Drop existing policies for marketplace_chats
DROP POLICY IF EXISTS "Users can insert chats for their transactions" ON marketplace_chats;
DROP POLICY IF EXISTS "Users can read their own chats" ON marketplace_chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON marketplace_chats;

-- Create new policies for marketplace_chats
CREATE POLICY "Authenticated users can create chats for their transactions"
  ON marketplace_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (buyer_id = auth.uid()) OR (seller_id = auth.uid())
  );

CREATE POLICY "Users can read chats they participate in"
  ON marketplace_chats
  FOR SELECT
  TO authenticated
  USING (
    (buyer_id = auth.uid()) OR (seller_id = auth.uid())
  );

CREATE POLICY "Users can update chats they participate in"
  ON marketplace_chats
  FOR UPDATE
  TO authenticated
  USING (
    (buyer_id = auth.uid()) OR (seller_id = auth.uid())
  )
  WITH CHECK (
    (buyer_id = auth.uid()) OR (seller_id = auth.uid())
  );

-- Drop existing policies for marketplace_chat_messages
DROP POLICY IF EXISTS "Users can insert messages in their chats" ON marketplace_chat_messages;
DROP POLICY IF EXISTS "Users can read messages in their chats" ON marketplace_chat_messages;

-- Create new policies for marketplace_chat_messages
CREATE POLICY "Authenticated users can send messages in their chats"
  ON marketplace_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (sender_id = auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM marketplace_chats 
      WHERE marketplace_chats.id = marketplace_chat_messages.chat_id 
      AND (marketplace_chats.buyer_id = auth.uid() OR marketplace_chats.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can read messages in chats they participate in"
  ON marketplace_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_chats 
      WHERE marketplace_chats.id = marketplace_chat_messages.chat_id 
      AND (marketplace_chats.buyer_id = auth.uid() OR marketplace_chats.seller_id = auth.uid())
    )
  );

-- Allow users to update message read status
CREATE POLICY "Users can update message read status in their chats"
  ON marketplace_chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_chats 
      WHERE marketplace_chats.id = marketplace_chat_messages.chat_id 
      AND (marketplace_chats.buyer_id = auth.uid() OR marketplace_chats.seller_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_chats 
      WHERE marketplace_chats.id = marketplace_chat_messages.chat_id 
      AND (marketplace_chats.buyer_id = auth.uid() OR marketplace_chats.seller_id = auth.uid())
    )
  );