-- Make slips bucket private
UPDATE storage.buckets SET public = false WHERE id = 'slips';

-- Drop existing permissive SELECT policy (if any) and recreate ownership-scoped one
DROP POLICY IF EXISTS "Users can view slip images" ON storage.objects;
DROP POLICY IF EXISTS "Public read slip images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view slip images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own slip images" ON storage.objects;

CREATE POLICY "Users can view own slip images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'slips'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Ensure upload/update/delete policies are also owner-scoped
DROP POLICY IF EXISTS "Users can upload slip images" ON storage.objects;
CREATE POLICY "Users can upload own slip images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'slips'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update slip images" ON storage.objects;
CREATE POLICY "Users can update own slip images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'slips'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete slip images" ON storage.objects;
CREATE POLICY "Users can delete own slip images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'slips'
  AND auth.uid()::text = (storage.foldername(name))[1]
);