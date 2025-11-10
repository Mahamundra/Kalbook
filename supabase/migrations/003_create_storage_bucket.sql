-- Create storage bucket for business assets (logos, banners, videos)
-- This migration creates the bucket and sets up RLS policies

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true, -- Public bucket (files are accessible via public URLs)
  10485760, -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
-- Note: Storage RLS is handled differently - we use policies below

-- Policy: Users can upload files to their business folder
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

-- Policy: Users can view files in their business folder
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

-- Policy: Users can update files in their business folder
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

-- Policy: Users can delete files in their business folder
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

-- Note: Public files can be accessed via public URL without authentication
-- The RLS policies above ensure only authenticated users can manage files

