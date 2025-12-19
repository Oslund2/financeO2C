/*
  # Add Manual Reference Image Support to Storyboard Shots

  1. New Columns
    - `manual_reference_image_url` (text, nullable)
      - Stores URL of manually uploaded reference image for this shot
      - Used as backup when auto-generation doesn't achieve perfect character consistency
      - Will be used as reference for Veo 3 video generation

    - `use_manual_reference` (boolean, default false)
      - Flag to indicate whether to prefer manual reference over generated image
      - Useful for tracking which shots have been manually corrected

    - `manual_upload_notes` (text, nullable)
      - Notes about why manual upload was needed
      - Helps track issues with auto-generation for future improvements

  2. Purpose
    - Character consistency is critical for storyboards that will be used as Veo 3 references
    - Manual uploads provide backup when AI generation doesn't perfectly match character references
    - Allows iterative refinement of storyboard visual consistency

  3. Usage Flow
    - Auto-generate storyboard images with character references
    - Review generated images for character consistency
    - If character doesn't match reference, upload manual correction
    - Manual reference becomes the authoritative image for that shot
    - Manual reference used in Veo 3 video generation
*/

-- Add manual reference image columns to storyboard_shots
ALTER TABLE storyboard_shots
ADD COLUMN IF NOT EXISTS manual_reference_image_url text,
ADD COLUMN IF NOT EXISTS use_manual_reference boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_upload_notes text;

-- Create index for efficient queries on manual references
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_manual_reference
ON storyboard_shots(use_manual_reference)
WHERE use_manual_reference = true;

-- Add comment explaining the manual reference system
COMMENT ON COLUMN storyboard_shots.manual_reference_image_url IS 'Manually uploaded reference image for this shot, used when auto-generation does not achieve perfect character consistency';
COMMENT ON COLUMN storyboard_shots.use_manual_reference IS 'When true, prefer manual_reference_image_url over image_url for production reference';
COMMENT ON COLUMN storyboard_shots.manual_upload_notes IS 'Notes explaining why manual upload was needed, helps track generation quality issues';
