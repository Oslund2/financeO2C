/*
  # Create Storage Bucket for Production Assets

  1. Storage Setup
    - Create a public storage bucket called `production-assets`
    - Allow public read access to all files
    - Allow authenticated and anonymous users to upload files
    - Support images, videos, and audio files

  2. Security
    - Public bucket for easy access to production assets
    - Anyone can upload (for demo purposes)
    - Files are publicly readable
*/

-- Create the storage bucket for production assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('production-assets', 'production-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload assets (for demo purposes)
CREATE POLICY "Allow public asset uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'production-assets');

-- Allow anyone to read assets (public bucket)
CREATE POLICY "Allow public asset downloads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'production-assets');

-- Allow anyone to update their uploads
CREATE POLICY "Allow public asset updates"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'production-assets')
WITH CHECK (bucket_id = 'production-assets');

-- Allow anyone to delete (for demo purposes)
CREATE POLICY "Allow public asset deletes"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'production-assets');
