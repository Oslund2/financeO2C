/*
  # Seed Default System Prompts

  This migration inserts the default system prompts that are used throughout the application.
  These prompts serve as templates that organizations can customize.

  1. Prompts Added
    - script_generation: Main prompt for generating episode scripts
    - claymation_style_base: Base style description for claymation animation
    - claymation_style_full: Complete style guide with detailed characteristics
    - video_negative_prompts: Negative prompts to avoid unwanted generation results
    - audio_directives: Instructions for audio/voice generation
    - shot_description: Prompt for generating storyboard shot descriptions
    - storyboard_image: Prompt template for storyboard image generation
    - camera_instructions: Reference for camera angles and movements
    - character_prompt_template: Template for character descriptions

  2. Categories
    - script: Script generation prompts
    - video: Video generation and style prompts
    - voice: Voice and audio generation prompts
    - storyboard: Storyboard and shot generation prompts
    - style: Visual style and aesthetic prompts

  3. Notes
    - All prompts have organization_id = NULL indicating they are system defaults
    - Each prompt has an initial deployed version
    - Variables use ${variable_name} syntax
*/

-- Insert system default prompt templates with their initial versions

-- 1. Script Generation Prompt
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'script_generation',
  'Episode Script Generation',
  'script',
  'Main prompt used to generate complete episode scripts with dialogue, scenes, and timing for claymation educational series.',
  true,
  true,
  '[
    {"name": "episode_title", "type": "string", "required": true, "description": "Title of the episode"},
    {"name": "episode_synopsis", "type": "string", "required": false, "description": "Brief synopsis or premise"},
    {"name": "episode_theme", "type": "string", "required": false, "description": "Educational theme"},
    {"name": "target_age_group", "type": "string", "required": false, "description": "Target audience age range"},
    {"name": "vocabulary_words", "type": "array", "required": false, "description": "Vocabulary words to integrate"},
    {"name": "character_descriptions", "type": "string", "required": true, "description": "Character list with traits"},
    {"name": "tone", "type": "string", "required": false, "default": "educational and entertaining"},
    {"name": "pacing", "type": "string", "required": false, "default": "moderate"}
  ]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'script_generation' AND organization_id IS NULL),
  1,
  'You are a professional children''s animation scriptwriter specializing in claymation educational series.

Episode Information:
- Title: ${episode_title}
- Synopsis: ${episode_synopsis}
- Theme: ${episode_theme}
- Target Age: ${target_age_group}
${vocabulary_section}

Characters:
${character_descriptions}

CRITICAL CHARACTER NAMING REQUIREMENTS:
- The teacher character''s name is "Mrs. Higginbottom" (NO ''S'' at the end - NOT "Mrs. Higginbottoms")
- She is lovingly referred to as "Mrs. H" by the students
- ALWAYS use "Mrs. Higginbottom" or "Mrs. H" - never add an ''S'' to her last name

SHOW PREMISE & CHARACTER PORTRAYAL:
- The entire premise is that kids are SMART, COOL, and FUNNY
- Portray all student characters (except antagonists) as intelligent, witty, and genuinely likeable
- EXCEPTION: Chad and certain cameo characters may be antagonists and obstructors in the storylines
- Chad can be portrayed as smug, condescending, or a rival
- Other students should be clever, quick-witted, and demonstrate genuine intelligence and humor

================================================================================
BROADCAST TIMING STRUCTURE (CRITICAL - MUST FOLLOW EXACTLY)
================================================================================

Total Episode TRT: 22:00 (1,320 seconds)
- Opening Sting: 1:00 (60 seconds) - NOT part of script
- Closing Sting: 0:30 (30 seconds) - NOT part of script
- Content Hole: 20:30 (1,230 seconds) - YOUR SCRIPT FILLS THIS

CONTENT HOLE BREAKDOWN:
- OPEN TIME: 00:01:00 (script content begins after opening sting)
- CLOSE TIME: 00:21:30 (script content ends before closing sting)

The content hole includes THREE 2-MINUTE COMMERCIAL BREAKS (6:00 total).
Your scripted content must be 14:30 (870 seconds) of actual dialogue and action.

FOUR SEGMENT STRUCTURE:
1. SEGMENT 1: ~3:30 (210 seconds) - Setup/Introduction
   - Timecode: 00:01:00 to 00:04:30
   - [BREAK 1: 2 minutes - 00:04:30 to 00:06:30]

2. SEGMENT 2: ~3:30 (210 seconds) - Rising Action
   - Timecode: 00:06:30 to 00:10:00
   - [BREAK 2: 2 minutes - 00:10:00 to 00:12:00]

3. SEGMENT 3: ~3:30 (210 seconds) - Climax/Confrontation
   - Timecode: 00:12:00 to 00:15:30
   - [BREAK 3: 2 minutes - 00:15:30 to 00:17:30]

4. SEGMENT 4: ~4:00 (240 seconds) - Resolution/Conclusion
   - Timecode: 00:17:30 to 00:21:30

================================================================================
SCENE REQUIREMENTS FOR AI VIDEO GENERATION (Veo 3 Optimization)
================================================================================

- Group multiple scenes in the SAME LOCATION when narratively appropriate
- Mark scenes with "reusable_setup": true if they share establishing shots
- Include specific "location" field matching one of: CLASSROOM, HALLWAY, PLAYGROUND, CAFETERIA, LIBRARY, GYM, OFFICE, or custom locations
- Include "time_of_day" field: MORNING, AFTERNOON, EVENING
- List all "characters_present" in each scene for reference image tracking
- Each scene needs 8-15 dialogue exchanges minimum for proper timing
- Include detailed stage directions between dialogue for animator reference

================================================================================
SCRIPT REQUIREMENTS
================================================================================

- Tone: ${tone}
- Pacing: ${pacing}
- Format: 4-segment structure with commercial breaks in TABLE READ FORMAT
- Runtime: EXACTLY 870 SECONDS (14:30) of scripted content
- Write in Table Read format suitable for printing and production use
- Each scene should include character dialogue with natural personality expression
- Integrate vocabulary words smoothly into conversations
- Include detailed stage directions for claymation production
- Keep dialogue age-appropriate but genuinely clever and engaging

================================================================================
JSON OUTPUT FORMAT
================================================================================

Generate a complete script in the following JSON format:

{
  "title": "Episode title",
  "synopsis": "Brief episode summary",
  "open_time": "00:01:00",
  "close_time": "00:21:30",
  "total_scripted_duration_seconds": 870,
  "segments": [...],
  "location_summary": [...]
}

Generate the complete script now with ALL segments and scenes filled in:',
  '[
    {"name": "episode_title", "type": "string", "required": true},
    {"name": "episode_synopsis", "type": "string", "required": false},
    {"name": "episode_theme", "type": "string", "required": false},
    {"name": "target_age_group", "type": "string", "required": false},
    {"name": "vocabulary_section", "type": "string", "required": false},
    {"name": "character_descriptions", "type": "string", "required": true},
    {"name": "tone", "type": "string", "required": false},
    {"name": "pacing", "type": "string", "required": false}
  ]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);

-- 2. Claymation Style Base
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'claymation_style_base',
  'Claymation Style Base',
  'style',
  'Core style description for claymation aesthetic used in video generation prompts.',
  true,
  true,
  '[]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'claymation_style_base' AND organization_id IS NULL),
  1,
  'Claymation animation style, stop-motion aesthetic, clay texture visible on all surfaces, handmade appearance, physical clay models, tangible materials',
  '[]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);

-- 3. Claymation Style Full
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'claymation_style_full',
  'Claymation Style Complete',
  'style',
  'Comprehensive style guide with detailed claymation characteristics for high-quality video generation.',
  true,
  true,
  '[]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'claymation_style_full' AND organization_id IS NULL),
  1,
  'Claymation style animation with tactile clay textures, hand-crafted aesthetic, stop-motion feel, warm lighting, detailed clay surfaces. High-quality claymation animation style, handcrafted clay characters with visible fingerprint textures, stop-motion aesthetic, tangible 3D sets with miniature props, soft studio lighting, colorful and whimsical design.',
  '[]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);

-- 4. Video Negative Prompts
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'video_negative_prompts',
  'Video Generation Negative Prompts',
  'video',
  'List of terms to exclude from video generation to maintain claymation aesthetic and quality.',
  true,
  true,
  '[]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'video_negative_prompts' AND organization_id IS NULL),
  1,
  'CGI, digital rendering, 3D computer graphics, smooth surfaces, photorealistic, live action, blurry, low quality, distorted, watermark, background music, musical score, soundtrack, plastic appearance, digital artifacts, motion blur, lens flare',
  '[]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);

-- 5. Audio Directives
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'audio_directives',
  'Audio Generation Directives',
  'voice',
  'Instructions for audio generation to ensure dialogue-only output without background music.',
  true,
  true,
  '[]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'audio_directives' AND organization_id IS NULL),
  1,
  'NO MUSIC. Dialogue and natural sound effects only. Music will be added in post-production.',
  '[]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);

-- 6. Shot Description Generation
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'shot_description',
  'Storyboard Shot Description',
  'storyboard',
  'Prompt for generating detailed shot descriptions for storyboard panels.',
  true,
  true,
  '[
    {"name": "script_title", "type": "string", "required": true},
    {"name": "scene_setting", "type": "string", "required": true},
    {"name": "scene_description", "type": "string", "required": false},
    {"name": "shot_type", "type": "string", "required": true},
    {"name": "camera_angle", "type": "string", "required": true},
    {"name": "camera_movement", "type": "string", "required": false},
    {"name": "dialogue_text", "type": "string", "required": false},
    {"name": "stage_directions", "type": "string", "required": false},
    {"name": "character_info", "type": "string", "required": false},
    {"name": "visual_style", "type": "string", "required": false}
  ]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'shot_description' AND organization_id IS NULL),
  1,
  'You are a professional storyboard artist for claymation animation. Create a detailed visual description for this shot.

Script: ${script_title}
Scene Setting: ${scene_setting}
Scene Description: ${scene_description}

Shot Details:
- Type: ${shot_type}
- Camera Angle: ${camera_angle}
- Camera Movement: ${camera_movement}
- Dialogue: ${dialogue_text}
- Stage Directions: ${stage_directions}

Characters in this Series:
${character_info}

Visual Style: Claymation animation with handcrafted clay characters, tactile textures, and whimsical design. ${visual_style}

Create a detailed shot description (2-3 sentences) that includes:
1. What is visible in the frame
2. Character positions, expressions, and actions
3. Important props or background elements
4. Lighting mood and color palette
5. Any special claymation effects or vocabulary word visualizations

Shot description:',
  '[
    {"name": "script_title", "type": "string", "required": true},
    {"name": "scene_setting", "type": "string", "required": true},
    {"name": "scene_description", "type": "string", "required": false},
    {"name": "shot_type", "type": "string", "required": true},
    {"name": "camera_angle", "type": "string", "required": true},
    {"name": "camera_movement", "type": "string", "required": false},
    {"name": "dialogue_text", "type": "string", "required": false},
    {"name": "stage_directions", "type": "string", "required": false},
    {"name": "character_info", "type": "string", "required": false},
    {"name": "visual_style", "type": "string", "required": false}
  ]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);

-- 7. Storyboard Image Generation
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'storyboard_image',
  'Storyboard Image Generation',
  'storyboard',
  'Template for generating storyboard panel images with proper composition and style.',
  true,
  true,
  '[
    {"name": "script_title", "type": "string", "required": true},
    {"name": "shot_type", "type": "string", "required": true},
    {"name": "enhanced_description", "type": "string", "required": true},
    {"name": "camera_angle", "type": "string", "required": true},
    {"name": "composition_notes", "type": "string", "required": false},
    {"name": "lighting_notes", "type": "string", "required": false},
    {"name": "style_guide", "type": "string", "required": false}
  ]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'storyboard_image' AND organization_id IS NULL),
  1,
  'Storyboard panel for "${script_title}" - ${shot_type} shot

Visual Description: ${enhanced_description}

Shot Type: ${shot_type}
Camera Angle: ${camera_angle}
Composition: ${composition_notes}
Lighting: ${lighting_notes}

Style: ${style_guide}

Format: Professional storyboard panel, 16:9 aspect ratio, suitable for animation production reference

Technical requirements: Clear character silhouettes, readable composition, production-ready reference image',
  '[
    {"name": "script_title", "type": "string", "required": true},
    {"name": "shot_type", "type": "string", "required": true},
    {"name": "enhanced_description", "type": "string", "required": true},
    {"name": "camera_angle", "type": "string", "required": true},
    {"name": "composition_notes", "type": "string", "required": false},
    {"name": "lighting_notes", "type": "string", "required": false},
    {"name": "style_guide", "type": "string", "required": false}
  ]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);

-- 8. Camera Shot Types Reference
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'camera_shot_types',
  'Camera Shot Types Reference',
  'storyboard',
  'Reference definitions for standard camera shot types used in storyboard generation.',
  true,
  true,
  '[]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'camera_shot_types' AND organization_id IS NULL),
  1,
  'SHOT TYPES:
- establishing: Establishing shot - shows the location and setting
- wide: Wide shot - shows full scene and all characters
- medium: Medium shot - shows characters from waist up
- close_up: Close-up - focuses on character face or important detail
- over_shoulder: Over-the-shoulder - conversation from one character''s perspective
- reaction: Reaction shot - captures character''s emotional response
- insert: Insert shot - close detail of object or action
- two_shot: Two shot - frames two characters in conversation

CAMERA ANGLES:
- eye_level: Eye level - neutral, realistic perspective
- high: High angle - looking down, makes subject appear smaller
- low: Low angle - looking up, makes subject appear powerful
- dutch: Dutch angle - tilted, creates unease or tension
- overhead: Overhead - bird''s eye view
- pov: Point of view - from character''s perspective

CAMERA MOVEMENTS:
- static: Static camera - no movement
- pan: Pan - horizontal camera rotation
- tilt: Tilt - vertical camera rotation
- dolly: Dolly - camera moves toward or away from subject
- track: Track - camera follows subject laterally
- zoom: Zoom - lens adjustment to change focal length',
  '[]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);

-- 9. Character Prompt Template
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'character_description',
  'Character Description Template',
  'video',
  'Template for generating consistent character descriptions for video generation.',
  true,
  true,
  '[
    {"name": "character_name", "type": "string", "required": true},
    {"name": "character_role", "type": "string", "required": false},
    {"name": "physical_description", "type": "string", "required": false},
    {"name": "clay_features", "type": "string", "required": false},
    {"name": "personality_traits", "type": "string", "required": false},
    {"name": "clothing", "type": "string", "required": false}
  ]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'character_description' AND organization_id IS NULL),
  1,
  '${character_name}, a ${character_role} claymation character. ${physical_description} Made of sculpted clay with visible texture and fingerprint marks. ${clay_features} Personality: ${personality_traits}. Wearing ${clothing}.',
  '[
    {"name": "character_name", "type": "string", "required": true},
    {"name": "character_role", "type": "string", "required": false},
    {"name": "physical_description", "type": "string", "required": false},
    {"name": "clay_features", "type": "string", "required": false},
    {"name": "personality_traits", "type": "string", "required": false},
    {"name": "clothing", "type": "string", "required": false}
  ]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);

-- 10. Veo3 Video Prompt Template
INSERT INTO prompt_templates (
  organization_id,
  prompt_key,
  prompt_name,
  category,
  description,
  is_system_default,
  is_active,
  variables_schema
) VALUES (
  NULL,
  'veo3_video_prompt',
  'Veo 3 Video Generation Prompt',
  'video',
  'Complete template for generating video clips using Veo 3 with claymation style.',
  true,
  true,
  '[
    {"name": "subject", "type": "string", "required": true, "description": "Character descriptions"},
    {"name": "action", "type": "string", "required": true, "description": "What is happening in the scene"},
    {"name": "environment", "type": "string", "required": true, "description": "Location description"},
    {"name": "camera", "type": "string", "required": true, "description": "Camera type, angle, movement"},
    {"name": "lighting", "type": "string", "required": false, "description": "Lighting conditions"},
    {"name": "style", "type": "string", "required": false, "description": "Visual style notes"},
    {"name": "audio", "type": "string", "required": false, "description": "Audio/dialogue cues"},
    {"name": "dialogue", "type": "string", "required": false, "description": "Dialogue content"}
  ]'::jsonb
);

INSERT INTO prompt_template_versions (
  prompt_template_id,
  version_number,
  prompt_content,
  variables_schema,
  created_by,
  change_notes,
  is_deployed
) VALUES (
  (SELECT id FROM prompt_templates WHERE prompt_key = 'veo3_video_prompt' AND organization_id IS NULL),
  1,
  '${subject}. ${action}. Setting: ${environment}. Camera: ${camera}. Lighting: ${lighting}. Style: ${style}. Audio: ${audio}. ${dialogue}',
  '[
    {"name": "subject", "type": "string", "required": true},
    {"name": "action", "type": "string", "required": true},
    {"name": "environment", "type": "string", "required": true},
    {"name": "camera", "type": "string", "required": true},
    {"name": "lighting", "type": "string", "required": false},
    {"name": "style", "type": "string", "required": false},
    {"name": "audio", "type": "string", "required": false},
    {"name": "dialogue", "type": "string", "required": false}
  ]'::jsonb,
  'system',
  'Initial system default prompt',
  true
);
