-- Fix storage bucket RLS policies for user data protection
-- This ensures users can only access their own files

-- RLS policies for card-media bucket (user-uploaded images/videos for cards)
CREATE POLICY "Users can view own card media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'card-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own card media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'card-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own card media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'card-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own card media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'card-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for audio-snippets bucket
CREATE POLICY "Users can view own audio snippets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-snippets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own audio snippets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-snippets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own audio snippets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-snippets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for meeting-recordings bucket
CREATE POLICY "Users can view own meeting recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own meeting recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own meeting recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for documents bucket
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for video-recordings bucket
CREATE POLICY "Users can view own video recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'video-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own video recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'video-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own video recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'video-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for screen-recordings bucket
CREATE POLICY "Users can view own screen recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'screen-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own screen recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'screen-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own screen recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'screen-recordings' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Avatars bucket: Public read, users can only upload/update their own
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);