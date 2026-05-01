-- Enable RLS on realtime.messages (Supabase Realtime broadcast/presence channel table)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to receive messages only on topics scoped to their own uid.
-- Convention used in this project: `user:<uid>:<suffix>` (e.g. `user:<uid>:chat`).
CREATE POLICY "Users can read own user-scoped realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
);

-- Allow authenticated users to send/broadcast only on their own user-scoped topics.
CREATE POLICY "Users can send to own user-scoped realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
);