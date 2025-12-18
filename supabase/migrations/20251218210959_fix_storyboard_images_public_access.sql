/*
  # Fix Storyboard Images Storage - Allow Public Access

  ## Problem
  The storyboard-images bucket was configured to only allow authenticated users to upload images.
  Since this application uses anonymous access (anon key), image uploads were failing after
  AI generation completed.

  ## Solution
  Update storage policies to allow public/anonymous access for INSERT, UPDATE, and DELETE operations.
  This matches the pattern used by the working character-images bucket.

  ## Changes
  1. Drop existing authenticated-only policies for storyboard-images
  2. Create new public access policies that allow anonymous uploads
  3. Keep public SELECT policy unchanged (already allows public reads)

  ## Security Note
  This allows anonymous uploads for demo/development purposes.
  For production, consider implementing proper authentication.
*/

-- Drop existing authenticated-only policies
DROP POLICY IF EXISTS "Authenticated users can upload storyboard images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update storyboard images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete storyboard images" ON storage.objects;

-- Create new public access policies for storyboard-images bucket

-- Allow anyone to upload storyboard images
CREATE POLICY "Public can upload storyboard images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'storyboard-images');

-- Allow anyone to update storyboard images
CREATE POLICY "Public can update storyboard images"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'storyboard-images')
  WITH CHECK (bucket_id = 'storyboard-images');

-- Allow anyone to delete storyboard images
CREATE POLICY "Public can delete storyboard images"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'storyboard-images');
