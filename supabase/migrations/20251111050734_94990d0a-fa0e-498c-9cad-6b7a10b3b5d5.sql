-- Add encryption support to user preferences
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS encryption_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_key_salt text;

-- Add encryption fields to zettel_cards
ALTER TABLE public.zettel_cards
ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS encrypted_content text,
ADD COLUMN IF NOT EXISTS encryption_iv text;

-- Add encryption fields to notes
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS encrypted_content text,
ADD COLUMN IF NOT EXISTS encryption_iv text;

-- Add index for encrypted items filtering
CREATE INDEX IF NOT EXISTS idx_zettel_cards_encrypted ON public.zettel_cards(user_id, is_encrypted) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_encrypted ON public.notes(user_id, is_encrypted) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.zettel_cards.is_encrypted IS 'Whether this card is encrypted with end-to-end encryption';
COMMENT ON COLUMN public.zettel_cards.encrypted_content IS 'Encrypted content blob (only used when is_encrypted=true)';
COMMENT ON COLUMN public.zettel_cards.encryption_iv IS 'Initialization vector for AES-GCM encryption';

COMMENT ON COLUMN public.notes.is_encrypted IS 'Whether this note is encrypted with end-to-end encryption';
COMMENT ON COLUMN public.notes.encrypted_content IS 'Encrypted content blob (only used when is_encrypted=true)';
COMMENT ON COLUMN public.notes.encryption_iv IS 'Initialization vector for AES-GCM encryption';