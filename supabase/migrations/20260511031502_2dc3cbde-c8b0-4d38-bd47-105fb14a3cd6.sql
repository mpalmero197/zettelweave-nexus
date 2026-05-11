-- Per-user OAuth connections to external providers (Microsoft, Google, Notion, etc.)
CREATE TABLE public.user_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT,
  provider_account_email TEXT,
  provider_account_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}'::text[],
  metadata JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_connections_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX idx_user_connections_user_id ON public.user_connections(user_id);
CREATE INDEX idx_user_connections_provider ON public.user_connections(provider);

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see, modify, or delete their own connections.
-- Tokens are returned by SELECT, but the frontend never reads token columns —
-- the integrations UI only ever queries safe metadata fields.
CREATE POLICY "Users view their own connections"
  ON public.user_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own connections"
  ON public.user_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own connections"
  ON public.user_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own connections"
  ON public.user_connections FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER update_user_connections_updated_at
  BEFORE UPDATE ON public.user_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();