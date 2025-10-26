-- Allow users to delete/cancel friend requests they sent
CREATE POLICY "Users can cancel friend requests they sent"
ON public.friend_requests
FOR DELETE
USING (auth.uid() = sender_id);