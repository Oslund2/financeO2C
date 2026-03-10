import { supabase } from '../lib/supabase';
import type { DialogueLine } from './dialogueExtractionService';

type WorkspaceType = 'claymation' | 'photoreal' | 'documentary' | 'general' | null;

export interface Veo3PromptConfig {
  shot_type: string;
  camera_angle: string;
  camera_movement: string;
  duration_seconds: number;
  narrative_description: string;
  technical_description: string;
  characters: string[];
  location: string;
  props: string[];
  dialogue_content?: DialogueLine[];
  no_music?: boolean;
  workspaceType?: WorkspaceType;
}

export interface GeneratedPrompt {
  veo3_prompt_text: string;
  negative_prompt: string;
  style_directives: string;
  audio_cues: string;
  character_references: string[];
  location_reference: string;
}

const STYLE_CONFIGS: Record<string, { base: string; directives: string; negative: string[] }> = {
  claymation: {
    base: 'Claymation style animation with tactile clay textures, hand-crafted aesthetic, stop-motion feel, warm lighting, detailed clay surfaces',
    directives: 'Maintain consistent claymation aesthetic, preserve character proportions, ensure proper lighting continuity, avoid anachronistic elements',
    negative: [
      'photorealistic',
      'live-action',
      'CGI',
      'smooth 3D rendering',
      'plastic appearance',
      'digital artifacts',
      'motion blur',
      'lens flare'
    ]
  },
  photoreal: {
    base: 'Photorealistic imagery, cinematic quality, professional cinematography, natural lighting, film grain appropriate to era, broadcast quality, period-accurate visuals',
    directives: 'Maintain photorealistic aesthetic, ensure period accuracy, use cinematic camera movements, natural color grading, professional lighting continuity',
    negative: [
      'animation',
      'cartoon',
      'claymation',
      'clay texture',
      'stop-motion',
      'anime',
      'illustration',
      'drawing',
      'digital artifacts',
      'oversaturated'
    ]
  },
  documentary: {
    base: 'Documentary-style photography, cinematic realism, natural and available lighting, handheld or steadicam movement, authentic environments, journalistic composition',
    directives: 'Maintain documentary realism, prioritize authenticity over stylization, use observational camera work, factual and neutral presentation',
    negative: [
      'animation',
      'cartoon',
      'claymation',
      'clay texture',
      'stop-motion',
      'anime',
      'fantasy elements',
      'oversaturated',
      'heavy post-processing'
    ]
  },
  general: {
    base: 'High-quality cinematic composition, professional lighting, clear visual storytelling, versatile production aesthetic',
    directives: 'Maintain visual consistency, professional production quality, clear subject framing',
    negative: [
      'low quality',
      'blurry',
      'distorted',
      'artifacts',
      'noise',
      'overexposed',
      'underexposed'
    ]
  }
};

function buildCameraDirective(shotType: string, angle: string, movement: string): string {
  const directives: string[] = [];

  switch (shotType) {
    case 'establishing_shot':
      directives.push('wide establishing frame showing complete environment');
      break;
    case 'wide_shot':
      directives.push('wide frame capturing full scene context');
      break;
    case 'medium_shot':
      directives.push('medium frame focusing on character from waist up');
      break;
    case 'close_up':
      directives.push('close frame on character face showing emotion');
      break;
    case 'extreme_close_up':
      directives.push('extreme close frame on specific detail');
      break;
    case 'over_the_shoulder':
      directives.push('over-the-shoulder perspective between characters');
      break;
    case 'two_shot':
      directives.push('two characters in frame with balanced composition');
      break;
    case 'reaction_shot':
      directives.push('character reaction captured with emotional focus');
      break;
  }

  switch (angle) {
    case 'high_angle':
      directives.push('camera positioned above looking down');
      break;
    case 'low_angle':
      directives.push('camera positioned below looking up');
      break;
    case 'dutch_angle':
      directives.push('tilted camera angle creating dynamic tension');
      break;
    case 'aerial':
      directives.push('aerial view from above');
      break;
    case 'birds_eye':
      directives.push('bird\'s eye view directly from above');
      break;
    default:
      directives.push('eye-level camera perspective');
  }

  switch (movement) {
    case 'pan':
      directives.push('smooth horizontal camera pan');
      break;
    case 'tilt':
      directives.push('vertical camera tilt');
      break;
    case 'dolly':
      directives.push('camera dolly movement toward or away');
      break;
    case 'track':
      directives.push('tracking camera movement following action');
      break;
    case 'zoom':
      directives.push('zoom lens adjustment');
      break;
    default:
      directives.push('static camera position');
  }

  return directives.join(', ');
}

function buildCharacterDescription(characters: string[]): string {
  if (characters.length === 0) return '';
  if (characters.length === 1) return `featuring ${characters[0]}`;
  if (characters.length === 2) return `featuring ${characters[0]} and ${characters[1]}`;
  return `featuring ${characters.slice(0, -1).join(', ')}, and ${characters[characters.length - 1]}`;
}

function formatDialogueForPrompt(dialogue: DialogueLine[]): string {
  if (dialogue.length === 0) return '';

  const formatted = dialogue.map(line => {
    const voiceInfo = `[${line.voice_provider}: ${line.voice_id}]`;
    return `${line.character_name} ${voiceInfo}: "${line.text}"`;
  }).join('\n');

  return `\n\nDialogue:\n${formatted}`;
}

function extractAudioCues(
  narrative: string,
  characters: string[],
  dialogue: DialogueLine[] = [],
  noMusic: boolean = true
): string {
  const cues: string[] = [];

  if (dialogue.length > 0) {
    const voiceProviders = Array.from(new Set(dialogue.map(d => d.voice_provider)));
    const voiceCue = voiceProviders.map(provider => {
      const providerLines = dialogue.filter(d => d.voice_provider === provider);
      return `${provider} voices for ${providerLines.map(l => l.character_name).join(', ')}`;
    }).join('; ');
    cues.push(voiceCue);
    cues.push('NO MUSIC - dialogue present');
  } else if (characters.length > 0) {
    cues.push('character presence');
  }

  if (narrative.toLowerCase().includes('sound') || narrative.toLowerCase().includes('noise')) {
    cues.push('ambient sound effects');
  }

  if (noMusic) {
    if (!cues.some(c => c.includes('NO MUSIC'))) {
      cues.push('NO MUSIC');
    }
  } else if (dialogue.length === 0 && narrative.toLowerCase().includes('music')) {
    cues.push('background music');
  }

  if (dialogue.length === 0) {
    cues.push('atmospheric audio');
  }

  return cues.join(', ');
}

export function generateVeo3Prompt(config: Veo3PromptConfig): GeneratedPrompt {
  const workspaceType = config.workspaceType || 'general';
  const styleConfig = STYLE_CONFIGS[workspaceType] ?? STYLE_CONFIGS.general;
  const isPhotoreal = workspaceType === 'photoreal' || workspaceType === 'documentary';

  const cameraDirective = buildCameraDirective(
    config.shot_type,
    config.camera_angle,
    config.camera_movement
  );

  const characterDesc = isPhotoreal
    ? buildSubjectDescription(config.characters)
    : buildCharacterDescription(config.characters);

  const locationDesc = config.location ? `in ${config.location}` : '';

  const propsDesc = config.props.length > 0
    ? `with ${isPhotoreal ? 'artifacts/elements' : 'props'}: ${config.props.join(', ')}`
    : '';

  const dialogueSection = config.dialogue_content && config.dialogue_content.length > 0
    ? formatDialogueForPrompt(config.dialogue_content)
    : '';

  const technicalDetails = isPhotoreal
    ? 'professional cinematography, period-accurate details'
    : 'detailed textures and lighting';

  const promptParts: string[] = [
    styleConfig.base,
    cameraDirective,
    characterDesc,
    locationDesc,
    config.narrative_description.substring(0, 200),
    propsDesc,
    technicalDetails,
    'cinematic composition'
  ].filter(p => p);

  const veo3_prompt_text = promptParts.join(', ') + '.' + dialogueSection;

  const negative_prompt = styleConfig.negative.join(', ');

  const style_directives = styleConfig.directives;

  const audio_cues = extractAudioCues(
    config.narrative_description,
    config.characters,
    config.dialogue_content || [],
    config.no_music ?? true
  );

  return {
    veo3_prompt_text,
    negative_prompt,
    style_directives,
    audio_cues,
    character_references: config.characters,
    location_reference: config.location
  };
}

function buildSubjectDescription(subjects: string[]): string {
  if (subjects.length === 0) return '';
  if (subjects.length === 1) return `featuring ${subjects[0]}`;
  if (subjects.length === 2) return `featuring ${subjects[0]} and ${subjects[1]}`;
  return `featuring ${subjects.slice(0, -1).join(', ')}, and ${subjects[subjects.length - 1]}`;
}

async function getWorkspaceTypeForOrg(organizationId: string): Promise<WorkspaceType> {
  const { data } = await supabase
    .from('organizations')
    .select('workspace_type')
    .eq('id', organizationId)
    .maybeSingle();
  return (data?.workspace_type as WorkspaceType) || 'general';
}

export async function generatePromptsForShots(
  shotIds: string[],
  organizationId: string
): Promise<number> {
  const [{ data: shots, error: shotsError }, workspaceType] = await Promise.all([
    supabase
      .from('production_shot_plans')
      .select('*')
      .in('id', shotIds)
      .eq('organization_id', organizationId),
    getWorkspaceTypeForOrg(organizationId)
  ]);

  if (shotsError || !shots) {
    throw new Error('Failed to fetch shots');
  }

  const prompts = shots.map(shot => {
    const generated = generateVeo3Prompt({
      shot_type: shot.shot_type,
      camera_angle: shot.camera_angle,
      camera_movement: shot.camera_movement,
      duration_seconds: shot.duration_seconds,
      narrative_description: shot.narrative_description,
      technical_description: shot.technical_description,
      characters: shot.characters,
      location: shot.location,
      props: shot.props,
      dialogue_content: shot.dialogue_content,
      workspaceType
    });

    return {
      shot_plan_id: shot.id,
      organization_id: organizationId,
      ...generated,
      prompt_version: 1,
      validated: false
    };
  });

  const { error: insertError } = await supabase
    .from('production_shot_prompts')
    .insert(prompts);

  if (insertError) {
    console.error('Error saving prompts:', insertError);
    throw insertError;
  }

  return prompts.length;
}

export async function regeneratePromptForShot(
  shotPlanId: string,
  organizationId: string
): Promise<void> {
  const [{ data: shot, error: shotError }, workspaceType] = await Promise.all([
    supabase
      .from('production_shot_plans')
      .select('*')
      .eq('id', shotPlanId)
      .eq('organization_id', organizationId)
      .maybeSingle(),
    getWorkspaceTypeForOrg(organizationId)
  ]);

  if (shotError || !shot) {
    throw new Error('Shot plan not found');
  }

  const generated = generateVeo3Prompt({
    shot_type: shot.shot_type,
    camera_angle: shot.camera_angle,
    camera_movement: shot.camera_movement,
    duration_seconds: shot.duration_seconds,
    narrative_description: shot.narrative_description,
    technical_description: shot.technical_description,
    characters: shot.characters,
    location: shot.location,
    props: shot.props,
    dialogue_content: shot.dialogue_content,
    workspaceType
  });

  const { data: existingPrompt } = await supabase
    .from('production_shot_prompts')
    .select('prompt_version')
    .eq('shot_plan_id', shotPlanId)
    .maybeSingle();

  const newVersion = existingPrompt ? existingPrompt.prompt_version + 1 : 1;

  const { error: upsertError } = await supabase
    .from('production_shot_prompts')
    .upsert({
      shot_plan_id: shotPlanId,
      organization_id: organizationId,
      ...generated,
      prompt_version: newVersion,
      validated: false
    });

  if (upsertError) {
    throw upsertError;
  }
}

export async function updatePrompt(
  shotPlanId: string,
  updates: Partial<GeneratedPrompt>
): Promise<void> {
  const { error } = await supabase
    .from('production_shot_prompts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('shot_plan_id', shotPlanId);

  if (error) {
    throw error;
  }
}

export async function validatePrompt(
  shotPlanId: string,
  isValid: boolean,
  errors: string[] = []
): Promise<void> {
  const { error } = await supabase
    .from('production_shot_prompts')
    .update({
      validated: isValid,
      validation_errors: errors,
      updated_at: new Date().toISOString()
    })
    .eq('shot_plan_id', shotPlanId);

  if (error) {
    throw error;
  }
}

export async function getShotPrompt(shotPlanId: string): Promise<any> {
  const { data, error } = await supabase
    .from('production_shot_prompts')
    .select('*')
    .eq('shot_plan_id', shotPlanId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
