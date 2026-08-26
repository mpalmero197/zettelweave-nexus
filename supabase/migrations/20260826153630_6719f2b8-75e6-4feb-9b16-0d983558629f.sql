CREATE TABLE public.youtube_transcripts (
  video_id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_transcript BOOLEAN NOT NULL DEFAULT false,
  transcript_source TEXT NOT NULL DEFAULT 'unknown',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.youtube_transcripts TO authenticated;
GRANT ALL ON public.youtube_transcripts TO service_role;

ALTER TABLE public.youtube_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cached transcripts"
ON public.youtube_transcripts
FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER youtube_transcripts_set_updated_at
BEFORE UPDATE ON public.youtube_transcripts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX youtube_transcripts_fetched_at_idx ON public.youtube_transcripts (fetched_at DESC);