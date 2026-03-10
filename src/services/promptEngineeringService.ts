import { supabase } from '../lib/supabase';
import { getCharacterProfilesForShot, getLocationProfileForShot } from './consistencyManagementService';
import { extractDialogueFromScene, formatDialogueForPrompt, type ExtractedDialogue } from './dialogueExtractionService';

type WorkspaceType = 'claymation' | 'photoreal' | 'documentary' | 'general' | null;

export interface PromptComponents {
  subject: string;
  action: string;
  environment: string;
  camera: string;
  lighting: string;
  style: string;
  audio?: string;
  dialogue?: string;
}

export interface GeneratedPrompt {
  veo3_prompt_text: string;
  negative_prompt: string;
  style_directives: string;
  audio_cues: string;
  dialogue_cues: any[];
  reference_image_uri?: string;
}

const STYLE_BASES: Record<string, { base: string; negative: string; defaultSubject: string }> = {
  claymation: {
    base: 'Claymation animation style, stop-motion aesthetic, clay texture visible on all surfaces, handmade appearance, physical clay models, tangible materials',
    negative: 'CGI, digital rendering, 3D computer graphics, smooth surfaces, photorealistic, live action, blurry, low quality, distorted, watermark, background music, musical score, soundtrack',
    defaultSubject: 'claymation characters'
  },
  photoreal: {
    base: 'Photorealistic quality, cinematic cinematography, natural lighting, period-accurate visuals, film grain appropriate to era, broadcast quality',
    negative: 'animation, cartoon, claymation, clay texture, stop-motion, anime, illustration, drawing, painting, blurry, low quality, distorted, watermark, background music, musical score, soundtrack',
    defaultSubject: 'subjects'
  },
  documentary: {
    base: 'Documentary-style photography, cinematic realism, natural and available lighting, authentic environments, observational composition',
    negative: 'animation, cartoon, claymation, clay texture, stop-motion, anime, fantasy elements, heavy stylization, blurry, low quality, distorted, watermark, background music, musical score, soundtrack',
    defaultSubject: 'documentary subjects'
  },
  general: {
    base: 'High-quality cinematic composition, professional lighting, clear visual storytelling',
    negative: 'low quality, blurry, distorted, artifacts, noise, watermark, background music, musical score, soundtrack',
    defaultSubject: 'subjects'
  }
};

const AUDIO_DIRECTIVES = 'NO MUSIC. Dialogue and natural sound effects only. Music will be added in post-production.';

function getCameraInstructionForShot(
  shotType: string,
  cameraAngle: string,
  cameraMovement: string,
  duration: number
): string {
  const angleDescriptions: { [key: string]: string } = {
    'eye_level': 'eye-level camera angle',
    'high_angle': 'high angle looking down',
    'low_angle': 'low angle looking up',
    'dutch_angle': 'tilted dutch angle',
    'aerial': 'aerial view from above',
    'birds_eye': 'birds-eye view directly overhead'
  };

  const movementDescriptions: { [key: string]: string } = {
    'static': 'static camera',
    'pan': 'smooth panning camera movement',
    'tilt': 'tilting camera movement',
    'dolly': 'dollying camera movement',
    'track': 'tracking camera movement',
    'zoom': 'gradual zoom'
  };

  const shotDescriptions: { [key: string]: string } = {
    'establishing_shot': 'wide establishing shot showing the entire scene',
    'wide_shot': 'wide shot capturing the full environment',
    'medium_shot': 'medium shot framing the subject from waist up',
    'close_up': 'close-up shot focusing on facial expressions',
    'extreme_close_up': 'extreme close-up showing fine details',
    'over_the_shoulder': 'over-the-shoulder perspective',
    'two_shot': 'two-shot framing both characters',
    'reaction_shot': 'reaction shot capturing emotional response'
  };

  const parts = [
    shotDescriptions[shotType] || 'medium shot',
    angleDescriptions[cameraAngle] || angleDescriptions['eye_level'],
    movementDescriptions[cameraMovement] || movementDescriptions['static']
  ];

  if (duration === 8) {
    parts.push('allowing time for scene to breathe');
  } else if (duration === 4) {
    parts.push('quick cut');
  }

  return parts.join(', ');
}

function getLightingForTimeAndLocation(timeOfDay?: string, isInterior?: boolean): string {
  if (!timeOfDay) {
    return isInterior ? 'warm interior lighting' : 'natural daylight';
  }

  const lightingMap: { [key: string]: string } = {
    'morning': 'bright morning sunlight streaming in, fresh and clear lighting',
    'afternoon': 'warm afternoon light, well-lit scene',
    'evening': 'golden hour lighting, warm sunset glow',
    'night': isInterior ? 'artificial interior lighting, warm ambient light' : 'dark night scene with artificial lighting'
  };

  return lightingMap[timeOfDay.toLowerCase()] || 'natural lighting';
}

export async function generatePromptForShot(
  shotPlanId: string,
  timeOfDay?: string,
  workspaceType?: WorkspaceType
): Promise<GeneratedPrompt> {
  const { data: shot, error: shotError } = await supabase
    .from('production_shot_plans')
    .select('*, series:series_id(*, organization:organization_id(workspace_type))')
    .eq('id', shotPlanId)
    .single();

  if (shotError || !shot) {
    throw shotError || new Error('Shot not found');
  }

  const effectiveWorkspaceType = workspaceType
    || shot.series?.organization?.workspace_type
    || 'general';
  const isPhotoreal = effectiveWorkspaceType === 'photoreal' || effectiveWorkspaceType === 'documentary';

  const characterProfiles = await getCharacterProfilesForShot(shotPlanId);
  const locationProfile = await getLocationProfileForShot(shotPlanId);

  const series = shot.series;
  const seriesStyle = series?.style_guide || '';

  const characterDescriptions = characterProfiles
    .map(profile => profile.veo3_character_prompt_template)
    .filter(Boolean)
    .join('. ');

  let locationDescription = shot.location || 'generic scene';
  if (locationProfile) {
    if (timeOfDay && locationProfile.time_of_day_variants[timeOfDay as keyof typeof locationProfile.time_of_day_variants]) {
      locationDescription = locationProfile.time_of_day_variants[timeOfDay as keyof typeof locationProfile.time_of_day_variants];
    } else {
      locationDescription = locationProfile.veo3_location_prompt_template || locationProfile.canonical_description;
    }
  }

  const cameraInstruction = getCameraInstructionForShot(
    shot.shot_type,
    shot.camera_angle,
    shot.camera_movement,
    shot.duration_seconds
  );

  const lightingInstruction = getLightingForTimeAndLocation(
    timeOfDay,
    !shot.location?.toLowerCase().includes('outdoor')
  );

  const actionDescription = shot.narrative_description || shot.technical_description || 'scene unfolds naturally';

  let dialogueExtracted: ExtractedDialogue | null = null;
  let dialoguePromptText = '';

  if (shot.dialogue_content && Array.isArray(shot.dialogue_content) && shot.dialogue_content.length > 0) {
    dialogueExtracted = await extractDialogueFromScene(shot.dialogue_content, shot.series_id);
    dialoguePromptText = formatDialogueForPrompt(dialogueExtracted);
  }

  const styleConfig = STYLE_BASES[effectiveWorkspaceType] ?? STYLE_BASES.general;
  const styleBase = styleConfig.base;
  const defaultSubject = styleConfig.defaultSubject;

  const components: PromptComponents = {
    subject: characterDescriptions || defaultSubject,
    action: actionDescription,
    environment: locationDescription,
    camera: cameraInstruction,
    lighting: lightingInstruction,
    style: [styleBase, seriesStyle].filter(Boolean).join('. '),
    audio: AUDIO_DIRECTIVES,
    dialogue: dialoguePromptText
  };

  const promptParts = [
    components.subject,
    components.action,
    `Setting: ${components.environment}`,
    `Camera: ${components.camera}`,
    `Lighting: ${components.lighting}`,
    `Style: ${components.style}`,
    `Audio: ${components.audio}`
  ];

  if (components.dialogue) {
    promptParts.push(components.dialogue);
  }

  const promptText = promptParts.filter(Boolean).join('. ');

  const referenceImageUri = characterProfiles.length > 0 && characterProfiles[0].reference_image_cloud_storage_uris.length > 0
    ? characterProfiles[0].reference_image_cloud_storage_uris[0]
    : undefined;

  const negativePrompt = styleConfig.negative;

  return {
    veo3_prompt_text: promptText,
    negative_prompt: negativePrompt,
    style_directives: components.style,
    audio_cues: AUDIO_DIRECTIVES,
    dialogue_cues: dialogueExtracted?.lines || [],
    reference_image_uri: referenceImageUri
  };
}

export async function savePromptForShot(
  shotPlanId: string,
  organizationId: string,
  prompt: GeneratedPrompt
): Promise<string> {
  const { data: shot } = await supabase
    .from('production_shot_plans')
    .select('characters, location')
    .eq('id', shotPlanId)
    .single();

  const characterReferences = shot?.characters || [];
  const locationReference = shot?.location || '';

  const validationErrors = validatePrompt(prompt.veo3_prompt_text);

  const { data, error } = await supabase
    .from('production_shot_prompts')
    .insert([{
      shot_plan_id: shotPlanId,
      organization_id: organizationId,
      veo3_prompt_text: prompt.veo3_prompt_text,
      negative_prompt: prompt.negative_prompt,
      style_directives: prompt.style_directives,
      audio_cues: prompt.audio_cues,
      dialogue_cues: prompt.dialogue_cues,
      character_references: characterReferences,
      location_reference: locationReference,
      reference_image_uri: prompt.reference_image_uri,
      validated: validationErrors.length === 0,
      validation_errors: validationErrors
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  await supabase
    .from('production_shot_plans')
    .update({ status: 'ready' })
    .eq('id', shotPlanId);

  return data.id;
}

export function validatePrompt(promptText: string, workspaceType?: WorkspaceType): string[] {
  const errors: string[] = [];
  const isPhotoreal = workspaceType === 'photoreal';

  if (!promptText || promptText.trim().length === 0) {
    errors.push('Prompt text is empty');
    return errors;
  }

  if (promptText.length < 50) {
    errors.push('Prompt is too short (minimum 50 characters)');
  }

  if (promptText.length > 2000) {
    errors.push('Prompt is too long (maximum 2000 characters)');
  }

  const nonEnglishPattern = /[^\x00-\x7F]+/;
  if (nonEnglishPattern.test(promptText)) {
    errors.push('Prompt contains non-English characters (Veo 3.1 supports English only)');
  }

  const restrictedKeywords = ['nude', 'naked', 'explicit', 'violence', 'gore', 'weapon'];
  const lowerPrompt = promptText.toLowerCase();
  restrictedKeywords.forEach(keyword => {
    if (lowerPrompt.includes(keyword)) {
      errors.push(`Prompt contains restricted keyword: ${keyword}`);
    }
  });

  if (isPhotoreal) {
    if (lowerPrompt.includes('claymation') || lowerPrompt.includes('clay texture') || lowerPrompt.includes('stop-motion')) {
      errors.push('Warning: Prompt contains animation references in a photoreal workspace');
    }
    if (!lowerPrompt.includes('documentary') && !lowerPrompt.includes('cinematic') && !lowerPrompt.includes('photorealistic')) {
      errors.push('Warning: Prompt should include documentary/cinematic reference for style consistency');
    }
  } else {
    if (!lowerPrompt.includes('clay')) {
      errors.push('Warning: Prompt should include claymation/clay reference for style consistency');
    }
  }

  return errors;
}

export async function generatePromptsForAllShots(
  episodeId: string,
  organizationId: string,
  timeOfDay?: string
): Promise<{
  generated: number;
  failed: number;
  errors: Array<{ shotId: string; error: string }>;
}> {
  const { data: shots, error } = await supabase
    .from('production_shot_plans')
    .select('id')
    .eq('episode_id', episodeId)
    .eq('status', 'draft');

  if (error || !shots) {
    throw error || new Error('Failed to fetch shots');
  }

  let generated = 0;
  let failed = 0;
  const errors: Array<{ shotId: string; error: string }> = [];

  for (const shot of shots) {
    try {
      const prompt = await generatePromptForShot(shot.id, timeOfDay);
      await savePromptForShot(shot.id, organizationId, prompt);
      generated++;
    } catch (error) {
      failed++;
      errors.push({
        shotId: shot.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { generated, failed, errors };
}

export async function regeneratePromptForShot(
  shotPlanId: string,
  organizationId: string,
  timeOfDay?: string
): Promise<string> {
  await supabase
    .from('production_shot_prompts')
    .delete()
    .eq('shot_plan_id', shotPlanId);

  const prompt = await generatePromptForShot(shotPlanId, timeOfDay);
  return await savePromptForShot(shotPlanId, organizationId, prompt);
}

export async function updatePromptManually(
  promptId: string,
  updates: {
    veo3_prompt_text?: string;
    negative_prompt?: string;
    style_directives?: string;
  }
): Promise<void> {
  const validationErrors = updates.veo3_prompt_text
    ? validatePrompt(updates.veo3_prompt_text)
    : [];

  const { error } = await supabase
    .from('production_shot_prompts')
    .update({
      ...updates,
      validated: validationErrors.length === 0,
      validation_errors: validationErrors,
      prompt_version: supabase.from('production_shot_prompts').select('prompt_version').eq('id', promptId).single().then(r => (r.data?.prompt_version || 0) + 1)
    })
    .eq('id', promptId);

  if (error) {
    throw error;
  }
}

export async function getPromptValidationSummary(episodeId: string): Promise<{
  total: number;
  validated: number;
  withErrors: number;
  ready: number;
}> {
  const { data: shots } = await supabase
    .from('production_shot_plans')
    .select(`
      id,
      status,
      production_shot_prompts (validated, validation_errors)
    `)
    .eq('episode_id', episodeId);

  if (!shots) {
    return { total: 0, validated: 0, withErrors: 0, ready: 0 };
  }

  const total = shots.length;
  let validated = 0;
  let withErrors = 0;
  let ready = 0;

  shots.forEach((shot: any) => {
    const prompts = shot.production_shot_prompts || [];
    if (prompts.length > 0) {
      const prompt = prompts[0];
      if (prompt.validated) validated++;
      if (prompt.validation_errors && prompt.validation_errors.length > 0) withErrors++;
    }
    if (shot.status === 'ready') ready++;
  });

  return { total, validated, withErrors, ready };
}
