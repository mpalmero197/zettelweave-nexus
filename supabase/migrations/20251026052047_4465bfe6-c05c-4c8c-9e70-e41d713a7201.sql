-- Create enum for friend request status
CREATE TYPE public.friend_request_status AS ENUM ('pending', 'accepted', 'declined');

-- Create enum for content types that can be shared
CREATE TYPE public.shareable_content_type AS ENUM ('card', 'note', 'scratchpad', 'stickynote', 'notebook');

-- Create enum for sharing permissions
CREATE TYPE public.sharing_permission AS ENUM ('view', 'edit');

-- Friend requests table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status friend_request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Friendships table (for accepted friends)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 < user_id_2)
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  CHECK (sender_id != receiver_id)
);

-- Shared content table
CREATE TABLE public.shared_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type shareable_content_type NOT NULL,
  content_id UUID NOT NULL,
  permission sharing_permission NOT NULL DEFAULT 'view',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, shared_with_user_id, content_type, content_id),
  CHECK (owner_id != shared_with_user_id)
);

-- Collaboration sessions table (for real-time editing)
CREATE TABLE public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type shareable_content_type NOT NULL,
  content_id UUID NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_users JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view friend requests they sent or received"
  ON public.friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received"
  ON public.friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- RLS Policies for friendships
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "System creates friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can delete their friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages they sent or received"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they received (mark as read)"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- RLS Policies for shared_content
CREATE POLICY "Users can view content shared with them or by them"
  ON public.shared_content FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);

CREATE POLICY "Owners can share their content"
  ON public.shared_content FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update sharing permissions"
  ON public.shared_content FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can revoke sharing"
  ON public.shared_content FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for collaboration_sessions
CREATE POLICY "Users can view collaboration sessions they're part of"
  ON public.collaboration_sessions FOR SELECT
  USING (
    auth.uid() = host_user_id OR 
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(active_users))
  );

CREATE POLICY "Users can create collaboration sessions"
  ON public.collaboration_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Users can update collaboration sessions they host"
  ON public.collaboration_sessions FOR UPDATE
  USING (auth.uid() = host_user_id);

-- Create indexes for performance
CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_friendships_user1 ON public.friendships(user_id_1);
CREATE INDEX idx_friendships_user2 ON public.friendships(user_id_2);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver ON public.chat_messages(receiver_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_shared_content_owner ON public.shared_content(owner_id);
CREATE INDEX idx_shared_content_shared_with ON public.shared_content(shared_with_user_id);
CREATE INDEX idx_shared_content_type_id ON public.shared_content(content_type, content_id);

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(_user_id_1 uuid, _user_id_2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE (user_id_1 = _user_id_1 AND user_id_2 = _user_id_2)
       OR (user_id_1 = _user_id_2 AND user_id_2 = _user_id_1)
  )
$$;

-- Function to get user's friends
CREATE OR REPLACE FUNCTION public.get_my_friends()
RETURNS TABLE (
  friend_user_id uuid,
  friend_email text,
  friend_display_name text,
  friend_avatar_url text,
  friendship_created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.user_id_1 = auth.uid() THEN f.user_id_2
      ELSE f.user_id_1
    END as friend_user_id,
    au.email as friend_email,
    p.display_name as friend_display_name,
    p.avatar_url as friend_avatar_url,
    f.created_at as friendship_created_at
  FROM public.friendships f
  LEFT JOIN auth.users au ON (
    CASE 
      WHEN f.user_id_1 = auth.uid() THEN f.user_id_2
      ELSE f.user_id_1
    END = au.id
  )
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE f.user_id_1 = auth.uid() OR f.user_id_2 = auth.uid()
  ORDER BY f.created_at DESC;
END;
$$;

-- Function to search for users (excluding self and existing friends/requests)
CREATE OR REPLACE FUNCTION public.search_users(_search_query text)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  is_friend boolean,
  has_pending_request boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    p.display_name,
    p.avatar_url,
    public.are_friends(auth.uid(), au.id) as is_friend,
    EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE ((fr.sender_id = auth.uid() AND fr.receiver_id = au.id)
         OR (fr.sender_id = au.id AND fr.receiver_id = auth.uid()))
        AND fr.status = 'pending'
    ) as has_pending_request
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE au.id != auth.uid()
    AND (
      au.email ILIKE '%' || _search_query || '%'
      OR p.display_name ILIKE '%' || _search_query || '%'
    )
  LIMIT 50;
END;
$$;

-- Trigger to create friendship when request is accepted
CREATE OR REPLACE FUNCTION public.handle_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create friendship with consistent ordering
    INSERT INTO public.friendships (user_id_1, user_id_2)
    VALUES (
      LEAST(NEW.sender_id, NEW.receiver_id),
      GREATEST(NEW.sender_id, NEW.receiver_id)
    )
    ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friend_request_accepted();

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_sessions;