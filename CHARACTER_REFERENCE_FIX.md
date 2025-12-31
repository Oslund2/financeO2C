# Character Reference Image Fix for Storyboard Generation

## Problem Solved
Previously, when generating storyboard images, characters like "Barnaby" would appear as random incorrect characters instead of using their actual reference images from the Character Library. This happened because the character reference system wasn't being properly initialized and validated before image generation.

## What Was Fixed

### 1. Automatic Reference Initialization
- **Before**: Character references were not initialized before image generation
- **After**: The system now automatically initializes and refreshes character-to-reference-image mappings every time you generate images
- References are loaded from the `storyboard_character_references` table before each generation run

### 2. Mandatory Reference Setup Wizard
- **Before**: Users could generate images without verifying character references
- **After**: Clicking "Generate Images" now shows a mandatory Character Reference Setup wizard that:
  - Lists all characters found in the storyboard
  - Shows which characters have reference images linked
  - Displays warnings for characters without references
  - Allows manual linking of reference images before generation

### 3. Enhanced Logging and Tracking
- **Before**: No visibility into which references were used during generation
- **After**: The system now logs:
  - Which reference image was used for each character
  - Whether it came from saved references or character library
  - Character positions in each shot
  - All metadata is stored in the `generation_metadata` field

### 4. Improved Character Name Matching
The system uses a sophisticated matching algorithm that checks:
1. **Exact match**: Character name matches exactly (case-insensitive)
2. **Alias match**: Checks character aliases for variations
3. **Parenthetical match**: Matches without parenthetical suffixes (e.g., "Barnaby (Young)" → "Barnaby")
4. **Partial match**: Fuzzy matching for typos or variations

## How to Use

### For First-Time Generation

1. **Create Your Storyboard**
   - Upload or generate a script
   - Generate the storyboard from the script

2. **Click "Generate Images"**
   - A Character Reference Setup wizard will appear automatically
   - The system scans all shots and identifies unique characters

3. **Review Character References**
   - Green checkmarks indicate characters with linked references
   - Amber warnings indicate characters without references
   - See the match confidence for auto-matched characters

4. **Link Missing References**
   - Click "Link Reference" on any character without a reference
   - Choose from:
     - **Character Library**: Characters you've created with reference images
     - **Asset Library**: Any uploaded assets (concept art, etc.)
     - **Custom Upload**: Upload a new reference image (future feature)

5. **Continue to Generate**
   - If all characters have references: Button turns green "Continue to Generate"
   - If some are missing: Button shows "Generate Anyway" with a warning
   - The system will use your linked references for consistent character appearance

### For Subsequent Generations

The reference mappings are saved at the storyboard level, so:
- References persist across multiple generation runs
- Click "Refresh" to update references if characters change
- References are automatically re-initialized before each generation

## Verification & Debugging

### Check Console Logs
Open browser DevTools console to see:
```
Loaded saved references for generation: ["barnaby", "pickle", "sesquipedalian"]
Using saved reference for "BARNABY" -> "Barnaby": https://...
Using character library reference for "Pickle" -> "Pickle": https://...
```

### Check Generation Metadata
After generation, the shot metadata includes:
```json
{
  "characterReferencesUsed": [
    {
      "name": "Barnaby",
      "imageUrl": "https://...",
      "source": "saved_reference"
    }
  ],
  "characterPositions": ["BARNABY", "Pickle"]
}
```

## Database Schema

### storyboard_character_references Table
Stores the character-to-reference mappings:
- `character_name`: Name as it appears in shots
- `linked_character_id`: Link to characters table (optional)
- `linked_asset_id`: Link to assets table (optional)
- `custom_reference_url`: Direct URL to reference image
- `reference_source`: 'character_library', 'asset_library', 'custom_upload', or 'auto'
- `match_confidence`: 0.0-1.0 confidence score for automatic matches
- `is_verified`: Whether user manually verified the reference

### Functions
- `initialize_storyboard_references(storyboard_id)`: Scans shots and creates/updates reference entries
- `get_storyboard_characters(storyboard_id)`: Extracts unique characters from all shots

## Best Practices

1. **Upload Reference Images First**
   - Add your characters to the Character Library with clear reference images
   - Use high-quality, well-lit images that show the character clearly
   - Include multiple angles if available

2. **Verify Auto-Matches**
   - The system tries to auto-match, but check the confidence scores
   - Low confidence matches (< 0.7) should be manually verified
   - Click "Change" to select a different reference if needed

3. **Use Consistent Character Names**
   - Use the same character name spelling throughout your script
   - Add aliases to characters for variations (nicknames, etc.)

4. **Review Before Generating**
   - Always review the Reference Setup wizard
   - Characters without references may generate incorrectly
   - Link references for all main characters at minimum

## Troubleshooting

### Character Still Appears Wrong
1. Check the console logs to verify which reference was used
2. Verify the reference image URL is accessible
3. Check if the character name in the shot matches exactly
4. Try refreshing references in the setup wizard
5. Manually clear and re-link the reference

### Character Not Found
1. Ensure the character exists in your Character Library
2. Check the spelling matches (or add as alias)
3. Refresh the reference setup wizard
4. Manually link the character using "Link Reference"

### Reference Not Loading
1. Check if the reference image URL is valid
2. Verify the image is publicly accessible
3. Check browser console for CORS or loading errors
4. Re-upload the reference image if needed

## Technical Notes

### Performance
- References are loaded once per generation batch
- Cached for the duration of the generation run
- Minimal database queries due to bulk loading

### Security
- RLS policies ensure users can only access their organization's references
- Reference URLs are validated before use
- No external image loading without user consent

### Future Enhancements
- Custom reference image upload directly in the wizard
- Bulk reference assignment for multiple characters
- Reference image versioning and history
- Per-shot reference overrides
- Visual similarity matching for auto-linking
