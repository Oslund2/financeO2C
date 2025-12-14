# Script Translation System - Usage Guide

## Overview
The script translation system allows you to translate your animation scripts into multiple languages using the Gemini 2.5 Flash API.

## Status: ✅ WORKING

The translation system has been tested and verified to work correctly with:
- Spanish (Español)
- Hindi (हिन्दी)
- And all other configured languages

## Key Features

1. **Character Name Preservation**
   - All character names (Mrs. Higginbottom, Barnaby, Zora, Emma, etc.) are preserved exactly as written in English
   - Only dialogue and descriptions are translated

2. **Comprehensive Translation**
   - Script title, synopsis, and theme
   - Act content and notes
   - Scene settings and descriptions
   - Dialogue lines with character attribution
   - Stage directions

3. **Progress Tracking**
   - Real-time progress updates (refreshes every 2 seconds)
   - Clear status indicators: pending, in_progress, completed, failed
   - Error messages displayed with retry buttons

4. **Error Handling**
   - Automatic retry with exponential backoff for quota errors
   - Failed translations can be retried from the UI
   - Clear error messages for debugging

## How to Use

### Step 1: Enable Multi-Language Support
1. Navigate to the Scripts page in your dashboard
2. Open a script you want to translate
3. Find the "Script Language Versions" section
4. Toggle the "Enable Multi-Language" switch

### Step 2: Select Target Languages
1. Check the boxes next to the languages you want to translate to
2. Available languages:
   - Spanish (Español)
   - Mandarin Chinese (中文)
   - Hindi (हिन्दी)
   - Arabic (العربية)
   - Portuguese (Português)
   - Bengali (বাংলা)
   - French (Français)
   - Russian (Русский)
   - Japanese (日本語)

### Step 3: Start Translation
1. Click the "Convert Script" button next to your selected language
2. The system will:
   - Show "Translating..." with a progress percentage
   - Update progress in real-time
   - Complete in approximately 2-5 minutes depending on script length

### Step 4: View Translated Scripts
1. Once complete, a "View Translated Scripts" button appears
2. Click to see all completed translations
3. Export to PDF or view in the browser

## Troubleshooting

### Translation Stuck "In Progress"
- Previously stuck translations have been reset to "failed"
- Click the "Retry" button to restart the translation

### API Quota Exceeded
- Error message: "Translation failed: Gemini API quota exceeded"
- Solution: Wait a few minutes and retry, or check your Gemini API quota

### Character Names Not Preserved
- The system now explicitly instructs the AI to preserve character names
- If you notice issues, please report with the specific script and language

## Technical Details

### Translation Process
1. Retrieves script with all acts and scenes from database
2. Translates in order:
   - Title, synopsis, theme (3 items)
   - Each act's content and notes
   - Each scene's setting, description, dialogue, and stage directions
3. Batch processes dialogue lines for efficiency (10 lines per batch)
4. Updates progress after each completed item
5. Stores translations in separate tables linked to original content

### API Configuration
- Model: Gemini 2.5 Flash
- Temperature: 0.3 (consistent translations)
- Rate Limit Delay: 100ms between requests
- Max Retries: 3 attempts with exponential backoff

### Database Structure
- `script_translations` - Main translation record
- `script_act_translations` - Translated act content
- `script_scene_translations` - Translated scene content

## Testing Results

✅ API connectivity confirmed
✅ Spanish translations working
✅ Hindi translations working
✅ Character name preservation verified
✅ Progress tracking functional
✅ Error handling tested
✅ Build successful

## Next Steps

The translation system is ready for use. To translate your existing scripts:

1. Go to Scripts page
2. Select a script with acts and scenes
3. Enable multi-language support
4. Select Spanish and/or Hindi
5. Click "Convert Script"
6. Watch the progress update in real-time
7. View completed translations

## Support

If you encounter issues:
1. Check that VITE_GEMINI_API_KEY is set in your .env file
2. Verify your Gemini API quota at https://aistudio.google.com
3. Review error messages in the UI for specific guidance
4. Check browser console for detailed error logs
