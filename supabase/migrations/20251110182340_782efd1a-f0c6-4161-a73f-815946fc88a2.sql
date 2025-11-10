-- Create table for tracking user activity patterns
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'card_view', 'note_view', 'search', 'catalyst_view', etc.
  resource_id TEXT, -- ID of the resource accessed
  resource_type TEXT, -- 'card', 'note', 'catalyst', 'notebook', etc.
  hour_of_day INTEGER NOT NULL, -- 0-23
  day_of_week INTEGER NOT NULL, -- 0-6 (Sunday-Saturday)
  metadata JSONB, -- Additional context
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own activity logs"
  ON public.user_activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
  ON public.user_activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_activity_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_type ON public.user_activity_logs(activity_type);
CREATE INDEX idx_user_activity_time ON public.user_activity_logs(hour_of_day, day_of_week);
CREATE INDEX idx_user_activity_resource ON public.user_activity_logs(resource_type, resource_id);
CREATE INDEX idx_user_activity_created_at ON public.user_activity_logs(created_at DESC);

-- Create table for storing cache predictions
CREATE TABLE IF NOT EXISTS public.cache_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_ids TEXT[] NOT NULL,
  hour_of_day INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_type, hour_of_day, day_of_week)
);

-- Enable RLS
ALTER TABLE public.cache_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own cache predictions"
  ON public.cache_predictions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cache predictions"
  ON public.cache_predictions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache predictions"
  ON public.cache_predictions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_cache_predictions_user_time ON public.cache_predictions(user_id, hour_of_day, day_of_week);