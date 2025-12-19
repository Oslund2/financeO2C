# Character Consistency Checklist

## ✅ System Verification: PASSED

Your system is correctly configured to maintain character consistency from the Characters section to generated Storyboard images. Here's what the system does automatically:

### Automatic Character Consistency Features

1. **Reference Image Passing** ✅
   - System extracts character names from script dialogue
   - Matches names to Characters database (case-insensitive)
   - Fetches `reference_image_url` for each character
   - Converts images to base64 and sends to Nano Banana
   - Instructs AI to use references for visual consistency

2. **Clay Features Integration** ✅
   - Includes `clay_features` text in image prompt
   - Reinforces visual details described in character profile
   - Combined with reference images for maximum consistency

3. **Character Positioning & Expression** ✅
   - Extracts character positions from shot metadata
   - Includes emotional context from dialogue
   - Preserves stage directions and actions

## Required Setup for Perfect Character Consistency

### 1. Character Database Requirements

For EACH main character in your series, ensure:

- [ ] **Name**: Matches exactly with character names in scripts (aside from capitalization)
- [ ] **Reference Image URL**: High-quality claymation image uploaded
  - Clear visibility of character features
  - Good lighting, no shadows obscuring details
  - Shows character proportions and color scheme
  - Recommended: Multiple angles if possible (upload best one)

- [ ] **Clay Features**: Detailed text description including:
  - Clay texture and color (e.g., "smooth mint-green clay")
  - Distinctive features (e.g., "bright orange curly hair made of textured clay coils")
  - Facial features (e.g., "large round eyes with white clay, black bead pupils")
  - Clothing/accessories (e.g., "yellow clay vest with red buttons")
  - Size/build (e.g., "tall and lanky", "short and round")

- [ ] **Description**: General character personality and role (for context)

### 2. Script Consistency Requirements

In your scripts, ensure:

- [ ] Character names in dialogue match EXACTLY (except case) with Character names in database
  - ✅ Good: Script uses "Max", Database has "Max"
  - ✅ Good: Script uses "max", Database has "Max" (case doesn't matter)
  - ❌ Bad: Script uses "Maxwell", Database has "Max"
  - ❌ Bad: Script uses "Dr. Max", Database has "Max"

- [ ] All speaking characters exist in Characters database
- [ ] Character names are consistent throughout the script

### 3. Reference Image Quality Guidelines

**Best Practices for Reference Images:**

1. **Lighting**: Soft, even lighting with no harsh shadows
2. **Background**: Clean, neutral background that doesn't distract
3. **Focus**: Character should be in sharp focus
4. **Angle**: Straight-on or slight 3/4 view showing key features
5. **Framing**: Character should fill most of frame but not be cut off
6. **Quality**: High resolution (minimum 1024x1024)
7. **Consistency**: Use same art style/technique for all characters

**What to Avoid:**
- Blurry or out-of-focus images
- Heavy shadows obscuring features
- Extreme angles that distort proportions
- Low resolution images
- Different art styles between characters

## How to Verify Character Consistency

### Before Full Production:

1. **Test Generation**: Generate 2-3 test shots with your main characters
2. **Visual Check**: Compare generated images to reference images
3. **Multi-Shot Check**: Generate shots with same character in different scenes
4. **Multi-Character Check**: Generate shots with multiple characters together

### During Production:

1. **Check Metadata**: In storyboard_shots table, verify `generation_metadata.characterReferencesUsed` contains expected character names
2. **Visual Review**: Review generated images for consistency
3. **Update References**: If character appearance drifts, consider updating reference images

## Troubleshooting Character Consistency Issues

### Issue: Character doesn't look consistent
**Possible Causes:**
- Reference image URL not set in Characters database
- Reference image is low quality or unclear
- Character name in script doesn't match database name
- Clay features description is too vague

**Solutions:**
1. Verify `reference_image_url` is set and accessible
2. Upload a clearer reference image
3. Check character name spelling in both script and database
4. Enhance clay_features description with more detail

### Issue: Character not using reference at all
**Possible Causes:**
- Character name mismatch between script and database
- Reference image URL is broken or inaccessible
- Character not actually in the shot's character_positions

**Solutions:**
1. Check `generation_metadata.characterReferencesUsed` in storyboard_shots - this shows which characters had references loaded
2. Verify character name appears in shot's dialogue
3. Test reference image URL in browser to ensure it loads
4. Check browser console for any image loading errors

### Issue: Multiple characters look too similar
**Possible Causes:**
- Clay features descriptions are too similar
- Reference images have similar color schemes
- Prompts don't emphasize distinctive features enough

**Solutions:**
1. Make clay_features descriptions more distinct and specific
2. Ensure reference images show clear visual differences
3. Emphasize distinctive features in clay_features (height, build, colors, style)

## Technical Data Flow

```
Script Dialogue
    ↓ (character names extracted)
Shot Character Positions
    ↓ (matched by name, case-insensitive)
Characters Database
    ↓ (reference_image_url + clay_features loaded)
Comprehensive Prompt Builder
    ↓ (reference images as base64 + text features)
Nano Banana (Gemini Image Generation)
    ↓
Generated Storyboard Image (with character consistency)
```

## Summary

**Status: ✅ FULLY IMPLEMENTED**

Your system is correctly configured to maintain character consistency. The key to success is:

1. **High-quality reference images** in the Characters database
2. **Detailed clay_features** descriptions
3. **Consistent character naming** between scripts and database
4. **Regular testing** to verify visual consistency

The system handles everything else automatically, including:
- Extracting character names from scripts
- Matching characters to reference images
- Passing images and descriptions to AI
- Tracking which references were used

**Next Steps:**
1. Review each character in your Characters database
2. Ensure reference_image_url is set and high quality
3. Enhance clay_features descriptions with specific details
4. Run test generations to verify consistency
