# Character Consistency Enhancements

## Overview
This document describes the enhancements made to ensure maximum character consistency in storyboard generation, particularly for use as reference images in Veo 3 video generation.

## Problem Statement
Character consistency is CRITICAL in animation production. Since storyboard images serve as reference material for Veo 3 video generation, any inconsistencies in character appearance will propagate through the entire production pipeline. While the system already passes character reference images to Nano Banana, there are two key areas for improvement:

1. **AI Generation Limitations**: Even with reference images, AI may not always perfectly match character appearance
2. **No Backup Option**: When AI fails to achieve perfect consistency, there was no way to manually correct individual shots

## Solutions Implemented

### 1. Enhanced AI Prompting for Character Inclusion

#### Problem
AI models sometimes generate scenes without clearly showing all required characters, or characters don't match references precisely enough.

#### Solution
**Stronger, more explicit prompt instructions:**

- Added `REQUIRED CHARACTERS - MUST BE CLEARLY VISIBLE` section at the top of prompts
- Lists all character names that MUST appear in the shot
- Explicitly states characters must match reference images exactly
- Emphasizes this is critical for animation production continuity

**Before:**
```
Reference images provided for characters: Max, Luna. Use these as visual references to maintain character consistency in the generated image.
```

**After:**
```
CRITICAL: Reference images provided for characters: Max, Luna. You MUST use these reference images to ensure EXACT visual consistency. Each character MUST match their reference image in appearance, proportions, colors, features, and style. The characters Max, Luna MUST be clearly visible and recognizable in the generated image. This is essential for animation production continuity.
```

Additionally, the comprehensive prompt builder now includes:
```
REQUIRED CHARACTERS - MUST BE CLEARLY VISIBLE: Max, Luna. These specific characters MUST appear prominently in the image, matching their reference images exactly.

CHARACTER DETAILS: [detailed character info including clay features, positions, expressions]
```

**Files Modified:**
- `src/services/storyboardService.ts:398-436` - Enhanced prompt building with required characters section
- `src/services/nanoBananaService.ts:222-227` - Stronger reference image instructions

### 2. Manual Reference Image Upload System

#### Problem
When AI generation doesn't achieve perfect character consistency (despite enhancements), there was no way to manually correct individual shots without regenerating the entire storyboard.

#### Solution
**Complete manual reference upload workflow:**

##### Database Schema
New columns added to `storyboard_shots`:
- `manual_reference_image_url` (text) - URL of manually uploaded reference image
- `use_manual_reference` (boolean) - Flag indicating whether to use manual reference
- `manual_upload_notes` (text) - Notes explaining why manual upload was needed

**Migration:** `add_manual_reference_images_to_shots.sql`

##### Service Layer
New function `uploadManualReferenceImage()`:
- Accepts file, shotId, and optional notes
- Validates file format (PNG, JPG, WEBP) and size (max 10MB)
- Automatically determines storage path based on shot metadata
- Uploads to Supabase storage with naming: `act-{act}/shot-{number}-reference-manual.{ext}`
- Updates shot record with manual reference URL and flags
- Returns public URL for the uploaded reference

**File:** `src/services/nanoBananaService.ts:362-431`

##### User Interface
New Modal Component: `ManualReferenceUploadModal`
- Clean, professional upload interface
- Shows current generated image for comparison
- Drag-and-drop or click to upload
- Live preview of selected image
- Optional notes field to document why manual upload was needed
- Clear explanatory text about the purpose
- Error handling and validation feedback

**File:** `src/components/ManualReferenceUploadModal.tsx`

##### Integration Points
Updated `StoryboardViewer`:
- Added "Upload Manual Reference" option to Image Actions Menu
- Shows for both shots with images (to replace) and without (to add)
- Integrated modal with proper state management
- Refreshes storyboard data after successful upload

Updated `ImageActionsMenu`:
- Added `onUploadReference` callback prop
- New menu item: "Upload Manual Reference" (blue highlight to distinguish from regular actions)
- Positioned between "Regenerate AI" and "Delete Image"

**Files Modified:**
- `src/components/StoryboardViewer.tsx:45,286-289,507,1035-1048`
- `src/components/ImageActionsMenu.tsx:2,10,20,76-84`

### 3. Visual Indicators for Manual References

#### Problem
No way to quickly identify which shots are using manual references vs. AI-generated images.

#### Solution
**Clear visual badges on shots with manual references:**

##### Grid View
- Small blue badge in bottom-left corner of shot thumbnail
- Shows shield icon + "Manual Ref" text
- Tooltip explains: "Using manual reference for character consistency"

##### Detailed View
- Larger, more prominent blue badge
- Shows shield icon + "Manual Reference" text
- Tooltip shows upload notes if available
- Positioned in bottom-left, doesn't obscure shot content

**Visual Design:**
- Blue color (`bg-blue-600`) to distinguish from other indicators
- Shield icon symbolizes "protected" or "verified" consistency
- Shadow for better visibility over images
- Responsive sizing (smaller in grid, larger in detail)

**Files Modified:**
- `src/components/StoryboardViewer.tsx:458-463` (grid view)
- `src/components/StoryboardViewer.tsx:659-664` (detailed view)

## User Workflow

### Happy Path (AI Works Perfectly)
1. Generate storyboard shots with character references
2. System automatically includes character reference images in prompts
3. AI generates images with proper character consistency
4. Proceed to Veo 3 video generation

### Manual Correction Path (AI Needs Help)
1. Generate storyboard shots with character references
2. Review generated images for character consistency
3. Identify shots where characters don't match references perfectly
4. Click image actions menu → "Upload Manual Reference"
5. Upload corrected image with notes explaining the issue
6. Shot now displays with "Manual Reference" badge
7. Manual reference will be used for Veo 3 video generation
8. Notes help track patterns to improve future AI generations

## Benefits

### For Production Quality
- **Zero Tolerance for Inconsistency**: Manual uploads ensure every shot meets standards
- **Veo 3 Ready**: Guarantees reference images are production-quality before video generation
- **Iterative Refinement**: Can fix individual shots without regenerating entire storyboard
- **Quality Control**: Easy to identify which shots needed manual intervention

### For Workflow Efficiency
- **Fast Corrections**: Upload single image vs. regenerating and hoping for better results
- **Progress Tracking**: Visual indicators show which shots have been manually verified
- **Documentation**: Upload notes create audit trail of generation issues
- **Flexibility**: Choose best approach per shot (AI or manual)

### For Future Improvements
- **Data Collection**: Manual upload notes identify patterns in AI generation failures
- **Training Insights**: Understand which character types or poses need better prompting
- **Quality Metrics**: Track ratio of manual uploads to identify improvement opportunities

## Technical Architecture

### Data Flow: AI Generation
```
Script Dialogue
    ↓
Character Names Extracted
    ↓
Characters Database (reference_image_url, clay_features)
    ↓
Prompt Builder
    - REQUIRED CHARACTERS section
    - CHARACTER DETAILS with clay features
    - Reference images as base64
    - CRITICAL instructions for AI
    ↓
Nano Banana (Gemini Image Generation)
    ↓
Generated Storyboard Image
    ↓
Stored as shot.image_url
```

### Data Flow: Manual Upload
```
User Selects Image File
    ↓
ManualReferenceUploadModal
    - Validate format & size
    - Show preview
    - Collect notes
    ↓
uploadManualReferenceImage()
    - Load shot metadata
    - Determine storage path
    - Upload to Supabase storage
    - Update shot record:
      * manual_reference_image_url
      * use_manual_reference = true
      * manual_upload_notes
    ↓
Visual Indicator Displayed
    ↓
Reference Available for Veo 3
```

### Priority Logic for Veo 3
When selecting reference images for Veo 3 video generation:
1. If `use_manual_reference = true` → Use `manual_reference_image_url`
2. Else → Use `image_url` (AI-generated)

This ensures manually corrected shots always take precedence.

## Database Schema Details

### New Columns: storyboard_shots

```sql
ALTER TABLE storyboard_shots
ADD COLUMN manual_reference_image_url text,
ADD COLUMN use_manual_reference boolean DEFAULT false,
ADD COLUMN manual_upload_notes text;

CREATE INDEX idx_storyboard_shots_manual_reference
ON storyboard_shots(use_manual_reference)
WHERE use_manual_reference = true;
```

**Column Purposes:**
- `manual_reference_image_url`: Public URL to manually uploaded reference image
- `use_manual_reference`: Boolean flag for quick filtering and priority logic
- `manual_upload_notes`: Free-text field for documenting why manual upload was needed

**Index Rationale:**
- Partial index on `use_manual_reference` for efficient filtering
- Only indexes TRUE values to minimize index size
- Useful for queries like "show me all shots that needed manual correction"

## Configuration & Environment

No new environment variables required. The system uses existing:
- `VITE_SUPABASE_URL` - For storage access
- `VITE_SUPABASE_ANON_KEY` - For authenticated uploads
- `VITE_GEMINI_API_KEY` - For AI generation

Storage bucket used: `storyboard-images` (existing)

## Testing Recommendations

### Unit Testing
1. **Prompt Building**
   - Verify "REQUIRED CHARACTERS" section appears when characters present
   - Confirm CRITICAL instruction added to reference images
   - Test with 0, 1, and multiple characters

2. **Upload Service**
   - Test file validation (format, size)
   - Test storage path generation
   - Test database updates
   - Test error handling

3. **UI Components**
   - Test modal open/close
   - Test file selection and preview
   - Test upload success/error states
   - Test visual indicator rendering

### Integration Testing
1. **End-to-End Workflow**
   - Generate storyboard with characters
   - Upload manual reference for a shot
   - Verify manual reference URL stored
   - Verify use_manual_reference flag set
   - Verify visual indicator appears
   - Verify notes saved correctly

2. **Edge Cases**
   - Shot with no characters (manual upload should still work)
   - Very large images (should be rejected)
   - Invalid file formats (should be rejected)
   - Network failures during upload

### Manual Testing
1. **Visual Consistency Check**
   - Generate multiple shots with same character
   - Verify AI-generated shots match reference
   - Upload manual reference for one shot
   - Verify manual shot visually distinguishable
   - Confirm tooltip shows on hover

2. **Production Simulation**
   - Create full storyboard
   - Review all shots for character consistency
   - Upload manual references where needed
   - Export all references for Veo 3
   - Verify manual references included in export

## Monitoring & Analytics

### Key Metrics to Track
1. **Manual Upload Rate**: % of shots requiring manual references
2. **Character-Specific Issues**: Which characters most often need manual correction
3. **Shot Type Patterns**: Do certain shot types (close-up, wide, etc.) need more corrections
4. **Upload Notes Analysis**: Common themes in why manual uploads needed

### Database Queries

**Find all shots with manual references:**
```sql
SELECT * FROM storyboard_shots
WHERE use_manual_reference = true;
```

**Manual upload rate by storyboard:**
```sql
SELECT
  storyboard_id,
  COUNT(*) as total_shots,
  SUM(CASE WHEN use_manual_reference THEN 1 ELSE 0 END) as manual_refs,
  ROUND(100.0 * SUM(CASE WHEN use_manual_reference THEN 1 ELSE 0 END) / COUNT(*), 2) as manual_percentage
FROM storyboard_shots
GROUP BY storyboard_id;
```

**Common issues from upload notes:**
```sql
SELECT manual_upload_notes, COUNT(*) as frequency
FROM storyboard_shots
WHERE use_manual_reference = true AND manual_upload_notes IS NOT NULL
GROUP BY manual_upload_notes
ORDER BY frequency DESC;
```

## Future Enhancements

### Short Term
1. **Batch Manual Upload**: Upload references for multiple shots at once
2. **Reference History**: Track all manual uploads per shot (currently only stores latest)
3. **AI Learning**: Use manual uploads to fine-tune prompts automatically
4. **Quick Replace**: One-click to swap between AI-generated and manual reference

### Long Term
1. **Similarity Scoring**: Automatically compare AI-generated images to references and flag low scores
2. **Character Detection**: Use computer vision to verify all required characters present
3. **Style Transfer**: Apply manual reference style to AI generations
4. **Collaborative Review**: Multi-user approval workflow for manual references

## Conclusion

These enhancements create a robust, production-ready system for ensuring character consistency:

1. **Prevention**: Enhanced AI prompting reduces need for manual intervention
2. **Correction**: Manual upload system provides safety net when AI falls short
3. **Transparency**: Visual indicators make quality control easy
4. **Tracking**: Upload notes provide data for continuous improvement

The system now supports both automated excellence (AI) and manual perfection (human oversight), ensuring every frame meets production standards before Veo 3 video generation.

**Key Success Metric**: 100% of storyboard shots can achieve perfect character consistency, either through AI generation or manual upload.
