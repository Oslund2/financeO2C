/*
  # Create Storyboard Images Storage Bucket

  ## Overview
  Creates a dedicated Supabase Storage bucket for storing AI-generated and manually uploaded storyboard images.

  ## New Storage Bucket
  - **storyboard-images**: Public bucket for storyboard panel images
    - Folder structure: `{storyboard_id}/act-{act_number}/shot-{shot_number}.png`
    - Supports both AI-generated and manually uploaded images
    - Public read access for viewing images in the application
    - Authenticated write access for uploading images

  ## Storage Policies
  1. **Public Read Access**: Anyone can view storyboard images
  2. **Authenticated Upload**: Only authenticated users can upload images
  3. **Authenticated Update**: Only authenticated users can update/replace images
  4. **Authenticated Delete**: Only authenticated users can delete images

  ## File Organization
  - Images organized by storyboard ID and act number
  - Shot numbers padded with zeros (e.g., shot-001, shot-002)
  - Manual uploads append `-manual` to distinguish from AI-generated
  - Supports PNG, JPEG, and WEBP formats

  ## Configuration
  - Max file size: 10MB per image
  - Allowed MIME types: image/png, image/jpeg, image/webp
  - Public URL generation enabled for easy embedding
*/

-- Create storyboard-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'storyboard-images',
  'storyboard-images',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view storyboard images (public read)
CREATE POLICY "Public can view storyboard images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'storyboard-images');

-- Allow authenticated users to upload storyboard images
CREATE POLICY "Authenticated users can upload storyboard images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'storyboard-images');

-- Allow authenticated users to update storyboard images
CREATE POLICY "Authenticated users can update storyboard images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'storyboard-images')
  WITH CHECK (bucket_id = 'storyboard-images');

-- Allow authenticated users to delete storyboard images
CREATE POLICY "Authenticated users can delete storyboard images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'storyboard-images');
