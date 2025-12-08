/*
  # Create Storage Bucket for Character Images

  1. Storage Setup
    - Create a public storage bucket called `character-images`
    - Allow public read access to all files
    - Allow authenticated and anonymous users to upload files

  2. Security
    - Public bucket for easy access to character images
    - Anyone can upload (for demo purposes)
    - Files are publicly readable
*/

-- Create the storage bucket for character images
INSERT INTO storage.buckets (id, name, public)
VALUES ('character-images', 'character-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Allow anyone to upload images (for demo purposes)
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'character-images');

-- Allow anyone to read images (public bucket)
CREATE POLICY "Allow public downloads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'character-images');

-- Allow anyone to update their uploads
CREATE POLICY "Allow public updates"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'character-images')
WITH CHECK (bucket_id = 'character-images');

-- Allow anyone to delete (for demo purposes)
CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'character-images');