CREATE TABLE public.user_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  integration_id TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, integration_id)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integrations"
ON public.user_integrations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations"
ON public.user_integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
ON public.user_integrations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
ON public.user_integrations FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_integrations_updated_at
BEFORE UPDATE ON public.user_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();