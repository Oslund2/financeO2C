/*
  # Increase Production Assets Storage Limit to 250MB

  1. Changes
    - Update `production-assets` bucket to support 250MB file uploads
    - Add allowed MIME types for better validation
    - Supports large video files for Asset Library

  2. Configuration
    - Max file size: 250MB (262144000 bytes)
    - Allowed types: images, videos, audio, documents

  3. Security
    - File size limit prevents excessive storage usage
    - MIME type restrictions prevent malicious file uploads
    - Maintains existing RLS policies
*/

-- Update production-assets bucket with file size limit and MIME types
UPDATE storage.buckets
SET
  file_size_limit = 262144000,  -- 250MB in bytes
  allowed_mime_types = ARRAY[
    -- Images
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml',
    -- Videos
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg',
    -- Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp3',
    -- Documents
    'application/pdf', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
WHERE id = 'production-assets';