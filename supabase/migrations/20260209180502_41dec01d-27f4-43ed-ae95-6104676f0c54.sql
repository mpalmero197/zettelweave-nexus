-- Add DELETE policy for chat messages so senders can delete their own messages
CREATE POLICY "Users can delete messages they sent"
  ON public.chat_messages
  FOR DELETE
  USING (auth.uid() = sender_id);