-- Table to track individual votes on feature requests (prevents double-voting)
CREATE TABLE public.feature_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_request_id, user_id)
);

ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;

-- Users can see all votes
CREATE POLICY "Users can view all votes"
  ON public.feature_request_votes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can vote"
  ON public.feature_request_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own votes
CREATE POLICY "Users can unvote"
  ON public.feature_request_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to toggle vote and update count atomically
CREATE OR REPLACE FUNCTION public.toggle_feature_vote(_feature_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _voted boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.feature_request_votes
    WHERE feature_request_id = _feature_id AND user_id = auth.uid()
  ) INTO _voted;

  IF _voted THEN
    DELETE FROM public.feature_request_votes
    WHERE feature_request_id = _feature_id AND user_id = auth.uid();
    
    UPDATE public.feature_requests
    SET votes = GREATEST(0, votes - 1)
    WHERE id = _feature_id;
    
    RETURN false;
  ELSE
    INSERT INTO public.feature_request_votes (feature_request_id, user_id)
    VALUES (_feature_id, auth.uid());
    
    UPDATE public.feature_requests
    SET votes = votes + 1
    WHERE id = _feature_id;
    
    RETURN true;
  END IF;
END;
$$;

-- Allow all authenticated users to view all feature requests (for community board)
CREATE POLICY "All users can view feature requests"
  ON public.feature_requests FOR SELECT
  TO authenticated
  USING (true);