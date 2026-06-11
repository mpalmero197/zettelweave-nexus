
CREATE TABLE public.vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('login','note','card')),
  label text,
  host text,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  passkey_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_items TO authenticated;
GRANT ALL ON public.vault_items TO service_role;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_items owner all" ON public.vault_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX vault_items_user_idx ON public.vault_items(user_id, item_type);
CREATE INDEX vault_items_host_idx ON public.vault_items(user_id, host);
CREATE TRIGGER vault_items_updated BEFORE UPDATE ON public.vault_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.vault_passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text,
  prf_salt text NOT NULL,
  label text,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_passkeys TO authenticated;
GRANT ALL ON public.vault_passkeys TO service_role;
ALTER TABLE public.vault_passkeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_passkeys owner all" ON public.vault_passkeys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
