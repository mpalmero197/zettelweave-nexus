ALTER TABLE public.saved_courses 
ADD COLUMN IF NOT EXISTS certificate_earned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_url text DEFAULT NULL;