# Prompt Library System Guide

Complete guide to managing, customizing, and optimizing AI prompts for animation production.

---

## Overview

The Prompt Library System provides centralized management of AI prompts used throughout the production pipeline. It includes version control, AI-powered enhancement, and organization-specific customization.

---

## System Architecture

### Three-Tier Structure

**1. Prompt Templates**
- Master records defining prompt configurations
- Include metadata, category, and variable schemas
- Can be system defaults or organization-specific

**2. Prompt Template Versions**
- Version history for each template
- One deployed version active at a time
- Includes content, change notes, and creator info

**3. Enhancement History**
- Tracks AI-suggested improvements
- Records acceptance/rejection decisions
- Supports learning and optimization

---

## Default System Prompts

The platform includes 10 production-ready prompt templates:

### 1. Script Generation
**Key:** `script_generation`
**Category:** Script
**Purpose:** Generate complete episode scripts with timing and structure

**Variables:**
- `episode_title` (required) - Episode title
- `episode_synopsis` - Brief synopsis
- `episode_theme` - Educational theme
- `target_age_group` - Audience age range
- `vocabulary_words` - Words to integrate
- `character_descriptions` (required) - Character list
- `tone` - Writing tone
- `pacing` - Story pacing

**Features:**
- 4-segment broadcast structure with commercial breaks
- Exact 22-minute TRT with timing breakdown
- Character naming consistency checks
- JSON output format for parsing

### 2. Claymation Style Base
**Key:** `claymation_style_base`
**Category:** Style
**Purpose:** Core style description for claymation aesthetic

**Content:**
```
Claymation animation style, stop-motion aesthetic, clay texture
visible on all surfaces, handmade appearance, physical clay models,
tangible materials
```

### 3. Claymation Style Full
**Key:** `claymation_style_full`
**Category:** Style
**Purpose:** Comprehensive style guide with detailed characteristics

**Content:**
```
Claymation style animation with tactile clay textures, hand-crafted
aesthetic, stop-motion feel, warm lighting, detailed clay surfaces.
High-quality claymation animation style, handcrafted clay characters
with visible fingerprint textures, stop-motion aesthetic, tangible
3D sets with miniature props, soft studio lighting, colorful and
whimsical design.
```

### 4. Video Negative Prompts
**Key:** `video_negative_prompts`
**Category:** Video
**Purpose:** Terms to exclude from video generation

**Content:**
```
CGI, digital rendering, 3D computer graphics, smooth surfaces,
photorealistic, live action, blurry, low quality, distorted,
watermark, background music, musical score, soundtrack, plastic
appearance, digital artifacts, motion blur, lens flare
```

### 5. Audio Directives
**Key:** `audio_directives`
**Category:** Voice
**Purpose:** Instructions for audio generation

**Content:**
```
NO MUSIC. Dialogue and natural sound effects only. Music will
be added in post-production.
```

### 6. Shot Description
**Key:** `shot_description`
**Category:** Storyboard
**Purpose:** Generate detailed shot descriptions for storyboard panels

**Variables:**
- `script_title` (required)
- `scene_setting` (required)
- `scene_description`
- `shot_type` (required)
- `camera_angle` (required)
- `camera_movement`
- `dialogue_text`
- `stage_directions`
- `character_info`
- `visual_style`

### 7. Storyboard Image
**Key:** `storyboard_image`
**Category:** Storyboard
**Purpose:** Template for generating storyboard panel images

**Variables:**
- `script_title` (required)
- `shot_type` (required)
- `enhanced_description` (required)
- `camera_angle` (required)
- `composition_notes`
- `lighting_notes`
- `style_guide`

### 8. Camera Shot Types
**Key:** `camera_shot_types`
**Category:** Storyboard
**Purpose:** Reference definitions for camera shots and angles

**Content:** Comprehensive list of:
- Shot types (establishing, wide, medium, close-up, etc.)
- Camera angles (eye level, high, low, dutch, etc.)
- Camera movements (static, pan, tilt, dolly, etc.)

### 9. Character Description
**Key:** `character_description`
**Category:** Video
**Purpose:** Template for consistent character descriptions

**Variables:**
- `character_name` (required)
- `character_role`
- `physical_description`
- `clay_features`
- `personality_traits`
- `clothing`

### 10. Veo3 Video Prompt
**Key:** `veo3_video_prompt`
**Category:** Video
**Purpose:** Complete template for Veo 3 video generation

**Variables:**
- `subject` (required) - Character descriptions
- `action` (required) - Scene action
- `environment` (required) - Location
- `camera` (required) - Camera setup
- `lighting` - Lighting conditions
- `style` - Visual style notes
- `audio` - Audio cues
- `dialogue` - Dialogue content

---

## Variable Schema System

### Schema Structure

Variables use JSON schema format:

```json
{
  "name": "episode_title",
  "type": "string",
  "required": true,
  "description": "Title of the episode",
  "default": null
}
```

### Variable Types

- `string` - Text content
- `array` - Lists of items
- `number` - Numeric values
- `boolean` - True/false flags

### Variable Substitution

In prompt content, use `${variable_name}` syntax:

```
Episode Title: ${episode_title}
Synopsis: ${episode_synopsis}
Theme: ${episode_theme}
```

The system automatically replaces variables with actual values during generation.

---

## Creating Custom Prompts

### Step 1: Access Prompt Library

1. Go to **Settings** > **Prompt Library**
2. View existing templates
3. Click **"Create New Prompt"**

### Step 2: Configure Template

**Basic Information:**
- **Prompt Key:** Unique identifier (lowercase, underscores)
  - Example: `custom_scene_opener`
- **Prompt Name:** Human-readable name
  - Example: "Custom Scene Opener"
- **Category:** Choose from:
  - `script` - Script generation
  - `video` - Video generation
  - `voice` - Audio/voice
  - `storyboard` - Storyboard/shots
  - `style` - Visual style
  - `general` - Other purposes

**Description:**
- Clear explanation of prompt's purpose
- Include use cases and context

### Step 3: Define Variables

Add variables needed by your prompt:

```json
[
  {
    "name": "location",
    "type": "string",
    "required": true,
    "description": "Scene location name"
  },
  {
    "name": "mood",
    "type": "string",
    "required": false,
    "default": "neutral"
  }
]
```

### Step 4: Write Prompt Content

Create your prompt with variable placeholders:

```
Create an opening shot for ${location}.

The mood should be ${mood}.
Include establishing details that set the scene.

Technical requirements:
- 6 seconds duration
- Wide establishing shot
- Claymation style: ${claymation_style_base}
```

### Step 5: Save and Deploy

1. Click **"Create Template"**
2. System creates version 1
3. Click **"Deploy Version"** to make it active
4. Prompt is now available throughout the platform

---

## Version Control

### Creating New Versions

**When to Create a New Version:**
- Improving prompt clarity
- Adding new requirements
- Fixing generation issues
- Adjusting for AI model changes
- Incorporating feedback

**Process:**
1. Open existing prompt template
2. Click **"Create New Version"**
3. Edit prompt content
4. Add change notes explaining modifications
5. Save new version
6. Review and test
7. Deploy when ready

### Version History

**View All Versions:**
- See complete history of changes
- Compare versions side-by-side
- View who created each version
- Read change notes

**Version Metadata:**
- Version number (auto-incremented)
- Created by (user identifier)
- Created date
- Change notes
- Deployment status
- Variables schema (may differ per version)

### Deployment

**Active Version:**
- Only one version can be deployed at a time
- Deploying a version deactivates all others
- Instant switchover (no downtime)

**Rolling Back:**
1. View version history
2. Select previous version
3. Click "Deploy This Version"
4. Previous version becomes active

---

## AI-Powered Enhancement

### Enhancement Types

**1. Clarity Enhancement**
- Improves prompt readability
- Removes ambiguity
- Structures information better

**2. Detail Enhancement**
- Adds missing technical details
- Expands on requirements
- Improves specificity

**3. Optimization Enhancement**
- Reduces token count
- Improves efficiency
- Maintains quality with less text

**4. Custom Enhancement**
- User-provided instructions
- Specific improvements requested
- Targeted modifications

### Using Enhancement

**Process:**
1. Open prompt template
2. Click **"Enhance with AI"**
3. Select enhancement type
4. (Optional) Add custom instructions
5. Review AI suggestions
6. Accept or reject changes
7. If accepted, creates new version

**Enhancement History:**
- Track all enhancement attempts
- See original vs. enhanced content
- Review acceptance decisions
- Learn from patterns

### Best Practices

**Before Enhancement:**
- Test current prompt to identify issues
- Note specific problems to address
- Have clear improvement goals

**During Enhancement:**
- Review all AI changes carefully
- Don't blindly accept suggestions
- Test enhanced version before deployment

**After Enhancement:**
- Compare results between versions
- Track improvement metrics
- Document what worked

---

## Prompt Testing

### Testing Workflow

**1. Create Test Content:**
- Sample script excerpt
- Character descriptions
- Scene setup

**2. Generate with Prompt:**
- Use test content as variables
- Review AI output quality
- Note any issues

**3. Iterate:**
- Adjust prompt based on results
- Create new version
- Test again

**4. Deploy:**
- When satisfied with results
- Deploy version for production use

### Testing Checklist

- [ ] Variables substitute correctly
- [ ] Output format is consistent
- [ ] Required elements are included
- [ ] Style matches expectations
- [ ] No hallucinations or errors
- [ ] Timing/length requirements met
- [ ] Character consistency maintained

---

## Organization-Specific Customization

### System Defaults vs. Custom

**System Defaults:**
- Provided by platform
- organization_id is NULL
- Read-only for all users
- Can be copied to organizations

**Custom Prompts:**
- Created by organization members
- organization_id set to workspace
- Editable by workspace members
- Isolated per workspace

### Copying System Defaults

**Manual Copy:**
1. View system default prompt
2. Click "Copy to My Workspace"
3. Prompt is duplicated with version 1
4. Can now customize freely

**Automatic Initialization:**
```sql
SELECT initialize_organization_prompts('<organization-id>');
```

Copies all 10 system defaults to your workspace.

### Customization Strategies

**Brand-Specific Style:**
```
Replace generic claymation style with your brand's specific aesthetic:
- Color palette
- Character design rules
- Animation style notes
```

**Client Requirements:**
```
Add client-specific requirements:
- Content guidelines
- Tone preferences
- Technical specifications
```

**Language/Localization:**
```
Adapt prompts for different languages or regions:
- Cultural considerations
- Translation guidelines
- Local references
```

---

## Integration with Production Pipeline

### Where Prompts Are Used

**Script Generation:**
- Uses `script_generation` template
- Generates complete episode scripts
- Applied in Scripts tab

**Storyboard Creation:**
- Uses `shot_description` template
- Uses `storyboard_image` template
- Applied in Storyboard generator

**Video Generation:**
- Uses `veo3_video_prompt` template
- Uses `claymation_style_full` template
- Uses `video_negative_prompts` template
- Applied in Production workflow

**Voice Synthesis:**
- Uses `audio_directives` template
- Uses `character_description` template
- Applied in Voice Generation tab

### Prompt Resolution

**Resolution Order:**
1. Check for workspace-specific version
2. Fall back to system default if none exists
3. Use deployed version of selected prompt
4. Substitute variables with actual values
5. Send to AI service

---

## Best Practices

### Writing Effective Prompts

**Be Specific:**
```
Bad: "Create a character"
Good: "Create a claymation character with visible clay texture,
fingerprints, and handmade appearance"
```

**Use Structure:**
```
1. Context: What this is for
2. Requirements: Must-have elements
3. Style: Visual/tonal guidelines
4. Technical: Format, length, constraints
5. Output: Expected result format
```

**Include Examples:**
```
Example character description:
"Barnaby, an anxious 12-year-old student with a clay head that
inflates when nervous..."
```

**Specify Constraints:**
```
- Maximum 6 seconds duration
- Must include dialogue from script
- Character names must match reference list
- Maintain claymation aesthetic
```

### Version Control Strategy

**Semantic Versioning:**
- v1.x - Initial production version
- v2.x - Major improvements
- v3.x - Significant rewrites

**Change Notes Format:**
```
v2.1 - December 14, 2024
- Added character consistency checks
- Improved timing accuracy
- Fixed vocabulary word integration bug
```

### Testing Strategy

**Test Matrix:**
| Prompt Version | Test Case | Result | Notes |
|---------------|-----------|--------|-------|
| v1.0 | Simple scene | Pass | Good quality |
| v1.0 | Complex scene | Fail | Missing details |
| v2.0 | Complex scene | Pass | Improved |

---

## Troubleshooting

### Prompt Not Applying

**Issue:** Changes to prompt don't affect output

**Solutions:**
1. Verify version is deployed (green checkmark)
2. Check prompt category matches use case
3. Confirm variables are defined correctly
4. Clear cache and retry

### Variable Substitution Fails

**Issue:** Variables show as `${variable_name}` in output

**Solutions:**
1. Check variable name spelling in schema
2. Verify variable is provided in generation call
3. Ensure variable type matches schema
4. Review variable_schema JSON format

### Enhancement Not Working

**Issue:** AI enhancement returns errors

**Solutions:**
1. Check prompt content isn't too long
2. Verify internet connection
3. Review custom instructions for clarity
4. Try different enhancement type

### Version Deployment Issues

**Issue:** Can't deploy new version

**Solutions:**
1. Verify you have admin permissions
2. Check for validation errors
3. Ensure prompt content isn't empty
4. Review variables schema format

---

## API Reference

### Get Prompt Templates

```typescript
const { data: templates } = await supabase
  .from('prompt_templates')
  .select('*')
  .eq('organization_id', orgId)
  .eq('is_active', true);
```

### Get Deployed Version

```typescript
const { data: version } = await supabase
  .from('prompt_template_versions')
  .select('*')
  .eq('prompt_template_id', templateId)
  .eq('is_deployed', true)
  .single();
```

### Create New Version

```typescript
const { data: newVersion } = await supabase
  .from('prompt_template_versions')
  .insert({
    prompt_template_id: templateId,
    version_number: nextVersionNumber,
    prompt_content: updatedContent,
    variables_schema: schema,
    created_by: userId,
    change_notes: notes,
    is_deployed: false
  })
  .select()
  .single();
```

### Deploy Version

```typescript
await supabase.rpc('deploy_prompt_version', {
  p_version_id: versionId
});
```

---

## Advanced Topics

### Conditional Logic

Use variable values to create conditional behavior:

```
${character_name} enters the scene.

${if_character_role_is_protagonist}
The camera focuses on their determined expression.
${endif}

${if_character_role_is_antagonist}
Ominous lighting casts dramatic shadows.
${endif}
```

### Template Composition

Reference other prompts within prompts:

```
Style: ${claymation_style_full}
Avoid: ${video_negative_prompts}
Audio: ${audio_directives}
```

### Localization

Create language-specific versions:

```json
{
  "prompt_key": "script_generation_es",
  "prompt_name": "Script Generation (Spanish)",
  "category": "script"
}
```

---

## Support & Resources

**Documentation:**
- See TECHNICAL_REQUIREMENTS.md for database schema
- See README.md for system overview
- See WORKSPACE_MANAGEMENT.md for workspace setup

**Community:**
- Share prompt templates with other users
- Discuss best practices in forums
- Submit improvement suggestions

---

**Last Updated:** December 14, 2024
**Version:** 1.0.0
