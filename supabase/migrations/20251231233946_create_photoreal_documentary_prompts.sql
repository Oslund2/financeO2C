/*
  # Photoreal Documentary System Prompts
  
  This migration creates comprehensive prompts for Building 2 (photoreal)
  historical documentary production.
  
  ## Prompts Created
  1. Script Generation - Documentary narration with citation markers
  2. Video Style - Photorealistic cinematic guidelines
  3. Negative Prompt - Anti-claymation exclusions
  4. Audio Guidelines - Professional documentary narration
  5. Character Design - Realistic human rendering
  6. Environment Design - Period-accurate settings
  7. Accuracy Check - Historical fact verification
  8. Regeneration - Script correction with improvements
  
  ## Important Notes
  - All prompts use organization_id = NULL for system-level access
  - workspace_types = ['photoreal'] to scope to Building 2
*/

-- Helper function to insert prompt with version
CREATE OR REPLACE FUNCTION insert_photoreal_prompt(
  p_key text,
  p_name text,
  p_category text,
  p_description text,
  p_content text,
  p_variables jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_id uuid;
  v_existing_version integer;
BEGIN
  -- Insert or update the template
  INSERT INTO prompt_templates (
    organization_id,
    prompt_key,
    prompt_name,
    category,
    description,
    is_system_default,
    is_active,
    variables_schema,
    workspace_types,
    created_at,
    updated_at
  ) VALUES (
    NULL,
    p_key,
    p_name,
    p_category,
    p_description,
    true,
    true,
    p_variables,
    ARRAY['photoreal']::text[],
    now(),
    now()
  )
  ON CONFLICT (organization_id, prompt_key) 
  DO UPDATE SET
    prompt_name = EXCLUDED.prompt_name,
    description = EXCLUDED.description,
    variables_schema = EXCLUDED.variables_schema,
    workspace_types = EXCLUDED.workspace_types,
    updated_at = now()
  RETURNING id INTO v_template_id;
  
  -- Check if version already exists
  SELECT MAX(version_number) INTO v_existing_version
  FROM prompt_template_versions
  WHERE prompt_template_id = v_template_id;
  
  -- Only insert if no version exists
  IF v_existing_version IS NULL THEN
    INSERT INTO prompt_template_versions (
      prompt_template_id,
      version_number,
      prompt_content,
      variables_schema,
      created_by,
      change_notes,
      is_deployed,
      created_at
    ) VALUES (
      v_template_id,
      1,
      p_content,
      p_variables,
      'system',
      'Initial photoreal documentary prompt',
      true,
      now()
    );
  ELSE
    -- Update deployed version content
    UPDATE prompt_template_versions
    SET prompt_content = p_content,
        variables_schema = p_variables
    WHERE prompt_template_id = v_template_id
      AND is_deployed = true;
  END IF;
  
  RETURN v_template_id;
END;
$$;

-- 1. Photoreal Documentary Script Generation Prompt
SELECT insert_photoreal_prompt(
  'photoreal_documentary_script_generation',
  'Documentary Script Generation',
  'script_generation',
  'Master prompt for generating historically accurate documentary scripts with citation markers',
  E'You are an expert documentary scriptwriter specializing in historically accurate content for adult audiences. Generate a compelling documentary script that balances rigorous historical accuracy with engaging storytelling.

## Documentary Parameters
- Historical Period: {{historical_period}}
- Key Figures: {{key_figures}}
- Primary Theme: {{primary_theme}}
- Documentary Style: {{documentary_style}}
- Tone: {{tone}}
- Target Runtime: {{target_runtime}} minutes
- Episode Title: {{episode_title}}

## Script Structure
Create a three-act documentary structure:

### Act 1: Hook & Context (20% of runtime)
- Open with a compelling hook that draws viewers in
- Establish the historical context and significance
- Introduce key figures and their relevance
- Set up the central question or conflict

### Act 2: Evidence & Narrative (60% of runtime)
- Present historical events in chronological or thematic order
- Include primary source quotes and documented facts
- Build tension through cause-and-effect storytelling
- Incorporate multiple perspectives where historically documented
- Use transitional narration to connect segments

### Act 3: Impact & Legacy (20% of runtime)
- Reveal the resolution or outcome of events
- Explore the lasting impact and historical significance
- Connect to broader themes or contemporary relevance
- End with a thought-provoking conclusion

## Narration Guidelines
- Write in present tense for immediacy where appropriate
- Use measured pacing that allows facts to resonate
- Include pauses for visual moments (marked with [VISUAL MOMENT])
- Vary sentence length for natural rhythm
- Avoid sensationalism while maintaining engagement

## Citation Requirements
CRITICAL: For every specific historical claim, include a citation marker in this format:
[CITATION: Brief source description]

Examples:
- "On April 4, 1968, Martin Luther King Jr. was assassinated [CITATION: Contemporary news reports]"
- "The population reached 50,000 by 1890 [CITATION: Census Bureau records]"

## Dialogue Guidelines
When including historical quotes or recreated dialogue:
- Mark documented quotes with [DOCUMENTED QUOTE]
- Mark dramatized dialogue with [DRAMATIZED]
- Base all dialogue on historical record where possible

## Output Format
Return your response as a JSON object with this structure:
{
  "script": {
    "title": "Episode Title",
    "acts": [
      {
        "act_number": 1,
        "title": "Act Title",
        "scenes": [
          {
            "scene_number": 1,
            "setting": "Location and time",
            "narration": "Narrator text...",
            "dialogue": [
              {
                "character": "Character Name",
                "line": "Dialogue text",
                "type": "documented|dramatized"
              }
            ],
            "visual_notes": "Visual direction"
          }
        ]
      }
    ]
  },
  "citations": [
    {
      "marker": "Brief description used in script",
      "source_name": "Full source name",
      "source_type": "book|archive|interview|etc",
      "citation_text": "Full formatted citation",
      "reference_context": "What this citation supports"
    }
  ],
  "uncertain_items": [
    {
      "claim": "The specific claim text",
      "location": "Act X, Scene Y",
      "reason": "Why this needs verification"
    }
  ]
}

Generate a historically rigorous documentary script that educates while engaging the viewer.',
  '{"historical_period": {"type": "string", "required": true}, "key_figures": {"type": "string", "required": true}, "primary_theme": {"type": "string", "required": true}, "documentary_style": {"type": "string", "enum": ["biographical", "investigative", "archival", "narrative"]}, "tone": {"type": "string", "enum": ["somber", "triumphant", "analytical", "balanced"]}, "target_runtime": {"type": "number"}, "episode_title": {"type": "string"}}'::jsonb
);

-- 2. Photoreal Video Style Prompt
SELECT insert_photoreal_prompt(
  'photoreal_cinematic_video_style',
  'Cinematic Video Style',
  'video_style',
  'Cinematic style guidelines for photorealistic historical documentary visuals',
  E'## Photorealistic Documentary Visual Style

### Image Quality
- Photorealistic rendering with meticulous attention to detail
- Resolution suitable for 4K broadcast
- Natural skin textures and subsurface scattering
- Authentic fabric textures and material properties

### Camera Work
- Smooth dolly movements for establishing shots
- Steady handheld for intimate moments
- Crane shots for scope and grandeur
- Push-ins for emotional emphasis
- Pull-backs for revelation moments
- Documentary-style motivated camera movement

### Lighting
- Natural window light with soft shadows
- Golden hour exterior scenes where appropriate
- Three-point dramatic lighting for interviews
- Practical lighting from period-accurate sources
- Volumetric atmosphere for mood
- Chiaroscuro for dramatic moments

### Period Accuracy - {{historical_period}}
- Costumes accurate to within 2-year period
- Authentic props and set dressing
- Period-appropriate architecture
- Historical vehicles and technology
- Accurate signage and typography
- Weather and seasonal accuracy

### Color Grading
- Cinematic color palette appropriate to era
- Desaturated tones for somber moments
- Warm tones for nostalgic sequences
- Cool tones for tension
- Consistent look throughout episode

### Film Characteristics
- Subtle 35mm film grain texture
- 24fps with natural motion blur
- Shallow depth of field for portraits
- Deep focus for establishing shots
- Lens characteristics appropriate to era

### Human Rendering
- Anatomically accurate proportions
- Age-appropriate features
- Realistic micro-expressions
- Natural body language and movement
- Period-accurate grooming and styling
- Ethnically accurate casting',
  '{"historical_period": {"type": "string", "required": true}}'::jsonb
);

-- 3. Photoreal Negative Prompt (Anti-Claymation)
SELECT insert_photoreal_prompt(
  'photoreal_negative_prompt',
  'Negative Prompt - Anti-Claymation',
  'negative_prompt',
  'Exclusions to ensure photorealistic output and prevent cartoon/claymation aesthetics',
  E'## EXCLUDE from all generations:

### Animation Styles to Avoid
- cartoon, animated, anime, manga
- claymation, stop-motion, puppet
- clay, plasticine, play-doh
- pixar style, disney style, dreamworks
- cel-shaded, vector art
- stylized, exaggerated

### Material Appearances to Avoid
- plastic skin, waxy appearance
- fingerprints in material, visible seams
- miniature, diorama, model
- toy-like, action figure
- craft materials, handmade look
- felt, fabric puppet

### Feature Distortions to Avoid
- oversized eyes, small mouth
- exaggerated proportions
- simplified anatomy
- cartoonish expressions
- unrealistic body ratios
- caricature features

### Color/Lighting to Avoid
- oversaturated colors
- flat lighting, no shadows
- primary color palette
- candy colors, neon
- uniform lighting
- harsh cel-shading

### Quality Issues to Avoid
- low resolution, pixelated
- blurry, out of focus inappropriately
- visible artifacts, compression
- inconsistent style
- amateur rendering
- uncanny valley

### Historical Inaccuracies to Avoid
- anachronistic elements
- modern objects in period scenes
- incorrect fashion or hairstyles
- wrong technology for era
- inaccurate architecture
- contemporary language in visuals',
  '{}'::jsonb
);

-- 4. Photoreal Audio/Voice Guidelines
SELECT insert_photoreal_prompt(
  'photoreal_audio_guidelines',
  'Documentary Audio Guidelines',
  'audio_voice',
  'Professional documentary narration and audio design guidelines',
  E'## Documentary Audio Guidelines

### Narrator Voice Characteristics
- Professional, authoritative presence
- Warm but objective tone
- Clear enunciation without over-articulation
- Measured pacing allowing facts to land
- Appropriate gravitas for subject matter

### Tone Variations by Content
- **Somber moments**: Slower pace, lower register, respectful pauses
- **Triumphant moments**: Lifted energy, brighter tone, building momentum
- **Analytical sections**: Even pace, matter-of-fact delivery
- **Emotional revelations**: Subtle warmth, controlled emotion

### Pacing Guidelines
- Allow 2-3 seconds after significant facts
- Build pace during action sequences
- Slow for emotional moments
- Natural breathing rhythm
- Vary pace to maintain engagement

### Period-Appropriate Sound Design - {{historical_period}}
- Authentic ambient soundscapes
- Period-accurate music styles
- Historical recording quality for archival audio
- Appropriate environmental sounds
- Era-specific machinery and technology sounds

### Music Direction
- Orchestral scoring for emotional depth
- Period-appropriate instrumentation
- Subtle underscoring for narration
- Dynamic builds for climactic moments
- Silence used purposefully

### Interview/Dialogue Style
- Natural, unrehearsed feel
- Period-appropriate speech patterns
- Regional accents where documented
- Authentic emotional delivery
- Professional but not theatrical

### Technical Standards
- Broadcast-quality audio
- Consistent levels throughout
- Clean separation of elements
- Professional mix balance
- Appropriate dynamic range',
  '{"historical_period": {"type": "string", "required": true}}'::jsonb
);

-- 5. Photoreal Character Design Prompt
SELECT insert_photoreal_prompt(
  'photoreal_character_design',
  'Realistic Character Design',
  'character_design',
  'Guidelines for creating photorealistic historical figures',
  E'## Photorealistic Character Design Guidelines

### Anatomical Accuracy
- Correct human proportions for age and build
- Natural skeletal structure visible in posture
- Appropriate muscle definition
- Realistic joint articulation
- Accurate hand and foot proportions

### Facial Features
- Ethnically accurate features
- Age-appropriate skin texture and lines
- Natural eye positioning and proportion
- Realistic nose and ear shapes
- Authentic lip fullness and shape
- Subtle asymmetry as in real humans

### Skin Rendering
- Subsurface scattering for skin translucency
- Natural pores and texture
- Appropriate blemishes and variations
- Realistic color variation across face
- Age spots, freckles where appropriate
- Natural sheen and oil distribution

### Period Styling - {{historical_period}}
- Historically accurate hairstyles
- Period-appropriate facial hair
- Authentic makeup styles (if any)
- Correct grooming standards for era
- Class-appropriate presentation

### Costume Accuracy
- Fabrics authentic to period and class
- Correct construction and tailoring
- Appropriate wear and aging
- Accurate accessories
- Proper fit for era standards

### Expression and Movement
- Micro-expressions for authenticity
- Natural eye movement and blink
- Authentic body language for era
- Professional actor-level presence
- Emotional range within realism

### Individual Distinction
- Unique identifying features
- Distinguishing characteristics
- Memorable but not caricatured
- Based on historical reference where available

### Character: {{character_name}}
- Role: {{character_role}}
- Age: {{character_age}}
- Key traits: {{character_traits}}
- Historical reference: {{historical_reference}}',
  '{"historical_period": {"type": "string", "required": true}, "character_name": {"type": "string"}, "character_role": {"type": "string"}, "character_age": {"type": "string"}, "character_traits": {"type": "string"}, "historical_reference": {"type": "string"}}'::jsonb
);

-- 6. Photoreal Environment Design Prompt
SELECT insert_photoreal_prompt(
  'photoreal_environment_design',
  'Historical Environment Design',
  'environment_design',
  'Guidelines for historically accurate environment and setting design',
  E'## Historical Environment Design Guidelines

### Period: {{historical_period}}
### Location: {{location}}
### Setting Type: {{setting_type}}

### Architectural Accuracy
- Period-correct building styles
- Authentic construction materials
- Accurate structural details
- Proper scale and proportions
- Regional architectural variations

### Interior Details
- Period-appropriate furniture
- Authentic decorative elements
- Correct floor coverings
- Historical wall treatments
- Appropriate window styles
- Accurate door hardware

### Props and Objects
- Technology accurate to year
- Authentic household items
- Period publications and media
- Correct currency and documents
- Historical tools and equipment

### Signage and Typography
- Period-accurate lettering styles
- Historical advertising aesthetics
- Correct brand names for era
- Authentic official signage
- Regional language variations

### Vehicles and Transportation
- Accurate vehicle models for year
- Correct details and trim
- Appropriate wear and condition
- Period license plates
- Historical traffic elements

### Lighting Environment
- Authentic light sources for era
- Correct lamp and fixture styles
- Appropriate ambient light levels
- Natural light behavior
- Period artificial lighting

### Weather and Atmosphere
- Seasonally appropriate conditions
- Regional weather accuracy
- Atmospheric perspective
- Period air quality (industrial, rural)
- Time-of-day accuracy

### Aging and Wear
- Appropriate patina and weathering
- Realistic dirt and grime
- Period-correct wear patterns
- Authentic material aging
- Lived-in authenticity

### Geographic Accuracy
- Correct landscape features
- Authentic vegetation
- Regional terrain
- Historical land use
- Accurate urban/rural balance',
  '{"historical_period": {"type": "string", "required": true}, "location": {"type": "string", "required": true}, "setting_type": {"type": "string"}}'::jsonb
);

-- 7. Historical Accuracy Check Prompt
SELECT insert_photoreal_prompt(
  'historical_accuracy_check',
  'Historical Accuracy Verification',
  'accuracy_verification',
  'Prompt for AI-powered historical fact verification of documentary scripts',
  E'You are a meticulous historical fact-checker with expertise in {{historical_period}}. Analyze the provided documentary script and verify all historical claims.

## Script to Analyze
{{script_content}}

## Existing Citations
{{existing_citations}}

## Your Task
Identify and verify ALL verifiable claims in the script. For each claim:

1. **Identify the claim type**:
   - date: Specific dates, years, timelines
   - person: Names, identities, roles
   - event: Historical events, incidents
   - quote: Direct quotes, attributed statements
   - statistic: Numbers, quantities, measurements
   - location: Places, addresses, geography
   - relationship: Connections between people/entities
   - causation: Cause and effect claims
   - fact: Other verifiable facts

2. **Verify against historical record**:
   - Check if existing citations support the claim
   - Assess accuracy based on your knowledge
   - Identify any conflicts with established history

3. **Assign verification status**:
   - verified: Claim is accurate and well-supported
   - needs_citation: Claim appears accurate but needs source
   - disputed: Claim conflicts with historical record
   - unverified: Cannot determine accuracy

4. **Provide confidence score (0-100)**:
   - 90-100: Highly confident, well-documented fact
   - 70-89: Reasonably confident, minor details uncertain
   - 50-69: Moderately confident, needs verification
   - Below 50: Low confidence, likely needs correction

## Output Format
Return JSON:
{
  "overall_assessment": {
    "confidence_score": number,
    "total_claims_found": number,
    "critical_issues": number,
    "recommendation": "approve|needs_citations|needs_corrections|regenerate"
  },
  "claims": [
    {
      "claim_text": "The specific claim from script",
      "original_context": "Surrounding text for context",
      "location": {"act": number, "scene": number},
      "check_type": "date|person|event|etc",
      "verification_status": "verified|needs_citation|disputed|unverified",
      "confidence_score": number,
      "reasoning": "Explanation of verification result",
      "supporting_citations": ["citation markers that support this"],
      "suggested_correction": "If disputed, the correct information",
      "correction_source": "Source for the correction",
      "priority": "critical|high|medium|low"
    }
  ],
  "missing_citations": [
    {
      "claim_text": "Claim needing citation",
      "suggested_source_type": "What type of source would verify this",
      "search_suggestion": "How to find supporting evidence"
    }
  ],
  "regeneration_recommendations": [
    "Specific improvements if script should be regenerated"
  ]
}

Be thorough but reasonable. Focus on verifiable facts, not interpretations or stylistic choices.',
  '{"historical_period": {"type": "string", "required": true}, "script_content": {"type": "string", "required": true}, "existing_citations": {"type": "string"}}'::jsonb
);

-- 8. Script Regeneration with Corrections Prompt
SELECT insert_photoreal_prompt(
  'photoreal_script_regeneration',
  'Script Regeneration with Corrections',
  'script_regeneration',
  'Prompt for regenerating scripts with historical accuracy corrections',
  E'You are regenerating a documentary script to improve its historical accuracy. Use the original script as a foundation but incorporate all necessary corrections.

## Original Script
{{original_script}}

## Accuracy Issues Found
{{accuracy_issues}}

## Verified Citations
{{verified_citations}}

## Correction Instructions
1. Preserve the narrative structure and style
2. Correct all disputed facts with accurate information
3. Add citation markers for claims that needed sources
4. Maintain the original tone and pacing
5. Keep verified content unchanged
6. Improve unclear or ambiguous statements

## Specific Corrections Required
{{specific_corrections}}

## Output Requirements
Generate a corrected script that:
- Fixes all identified historical inaccuracies
- Maintains documentary quality and engagement
- Includes proper citation markers
- Preserves the original creative vision
- Improves overall historical confidence

Return in the same JSON format as original generation:
{
  "script": { ... },
  "citations": [ ... ],
  "changes_made": [
    {
      "original": "Original text",
      "corrected": "Corrected text",
      "reason": "Why this was changed"
    }
  ],
  "confidence_improvement": {
    "original_score": number,
    "new_score": number,
    "improvements_summary": "Brief summary of improvements"
  }
}',
  '{"original_script": {"type": "string", "required": true}, "accuracy_issues": {"type": "string", "required": true}, "verified_citations": {"type": "string"}, "specific_corrections": {"type": "string"}}'::jsonb
);

-- Update workspace_type_configs for photoreal
INSERT INTO workspace_type_configs (
  workspace_type,
  display_name,
  description,
  icon_name,
  primary_color,
  features,
  default_settings,
  video_style_presets,
  is_system_default,
  created_at,
  updated_at
) VALUES (
  'photoreal',
  'Photoreal Documentary',
  'Historical documentaries with photorealistic visuals and rigorous fact-checking',
  'film',
  '#1e3a5f',
  '{
    "citation_manager": {"enabled": true, "auto_generate": true, "bibliography_export": true},
    "historical_fact_checker": {"enabled": true, "auto_check_on_generate": false, "confidence_threshold": 70},
    "script_regeneration": {"enabled": true, "preserve_approved_sections": true},
    "documentary_format": {"enabled": true, "default_style": "narrative", "three_act_structure": true},
    "realistic_video_style": {"enabled": true, "film_grain": true, "color_grading": "cinematic"},
    "period_accuracy": {"enabled": true, "strict_mode": true, "anachronism_detection": true},
    "spelling_word_integration": {"enabled": false},
    "children_format": {"enabled": false}
  }'::jsonb,
  '{
    "default_tone": "balanced",
    "default_documentary_style": "narrative",
    "target_audience": "adult",
    "citation_required": true
  }'::jsonb,
  '{
    "default": {
      "film_grain": true,
      "color_grading": "cinematic",
      "aspect_ratio": "16:9",
      "frame_rate": 24
    }
  }'::jsonb,
  false,
  now(),
  now()
)
ON CONFLICT (workspace_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  default_settings = EXCLUDED.default_settings,
  video_style_presets = EXCLUDED.video_style_presets,
  updated_at = now();

-- Ensure claymation workspace has its features explicitly set
UPDATE workspace_type_configs
SET features = features || '{
  "citation_manager": {"enabled": false},
  "historical_fact_checker": {"enabled": false}
}'::jsonb,
updated_at = now()
WHERE workspace_type = 'claymation';

-- Clean up helper function
DROP FUNCTION IF EXISTS insert_photoreal_prompt(text, text, text, text, text, jsonb);
