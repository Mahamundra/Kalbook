-- Manual setup script for Supabase Storage bucket
-- Run this in Supabase SQL Editor if you prefer manual setup over migration

-- Step 1: Create the bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true, -- Public bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create RLS policies for storage.objects
-- Note: These policies ensure users can only access files in their business folder

-- Allow uploads to business folder
CREATE POLICY "Users can upload to their business folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses
    WHERE id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Allow viewing files in business folder
CREATE POLICY "Users can view files in their business folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'business-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses
    WHERE id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Allow updating files in business folder
CREATE POLICY "Users can update files in their business folder"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses
    WHERE id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Allow deleting files in business folder
CREATE POLICY "Users can delete files in their business folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses
    WHERE id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'business-assets';

