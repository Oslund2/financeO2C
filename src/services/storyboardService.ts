import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { generateStoryboardImage, isNanoBananaAvailable, calculateEstimatedCost, clearImageCache, prewarmImageCache } from './nanoBananaService';
import type { CharacterReference } from './nanoBananaService';
import { findCharacterInList, extractKeyFeaturesFromDescription } from './characterMatchingService';
import { getReferencesForGeneration } from './storyboardReferenceService';

type Scene = Database['public']['Tables']['script_scenes']['Row'];
type Act = Database['public']['Tables']['script_acts']['Row'];
type Script = Database['public']['Tables']['scripts']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

// ---------------------------------------------------------------------------
// Character Consistency
// ---------------------------------------------------------------------------

export interface CharacterConsistencyProfile {
  /** Canonical name from the character library */
  name: string;
  /** URL of the verified reference image (library or custom upload) */
  referenceImageUrl: string | null;
  /** URL of the first generated shot used as a rolling seed */
  seedImageUrl: string | null;
  /** Whether a verified reference image is available */
  hasVerifiedReference: boolean;
  /** Locked traits that MUST appear in every shot */
  lockedFeatures: string[];
  /** Full description for the prompt */
  description: string;
}

/**
 * Build a consistency profile for every character detected in the storyboard.
 * Priority: custom_reference_url / library reference_image_url > seed (built during generation).
 */
function buildCharacterConsistencyProfiles(
  characters: Character[],
  savedReferencesMap: Map<string, { name: string; imageUrl: string; description?: string }>
): Map<string, CharacterConsistencyProfile> {
  const profiles = new Map<string, CharacterConsistencyProfile>();

  for (const char of characters) {
    const saved = savedReferencesMap.get(char.name.toLowerCase());
    const referenceImageUrl = saved?.imageUrl ?? char.reference_image_url ?? null;

    const rawFeatures: string[] = char.required_visual_features?.length
      ? char.required_visual_features
      : extractKeyFeaturesFromDescription(char.description || '');

    // Guarantee at least one feature line so the lock block is always populated
    const lockedFeatures = rawFeatures.length > 0
      ? rawFeatures
      : char.description
        ? [`distinctive appearance as described: ${char.description.slice(0, 120)}`]
        : [];

    const profile: CharacterConsistencyProfile = {
      name: char.name,
      referenceImageUrl,
      seedImageUrl: null,
      hasVerifiedReference: !!referenceImageUrl,
      lockedFeatures,
      description: char.description || ''
    };

    profiles.set(char.name.toLowerCase(), profile);

    // Also index by aliases so look-ups work for any name variant
    const aliases = (char.aliases as string[]) || [];
    for (const alias of aliases) {
      if (!profiles.has(alias.toLowerCase())) {
        profiles.set(alias.toLowerCase(), profile);
      }
    }
  }

  return profiles;
}

interface ShotBreakdown {
  shotNumber: number;
  sceneShotNumber: number;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  shotDescription: string;
  compositionNotes: string;
  characterPositions: any[];
  lightingNotes: string;
  propsNeeded: string[];
  durationSeconds: number;
  dialogueText: string;
  stageDirections: string;
  imagePrompt: string;
}

interface StoryboardGenerationOptions {
  shotDensity?: 'sparse' | 'moderate' | 'dense';
  visualStyle?: string;
  claymationEmphasis?: boolean;
  includeVocabularyVisuals?: boolean;
  imageGenerationMode?: 'auto' | 'manual' | 'text-only';
  generateImagesPerAct?: number;
}

const SHOT_TYPES = {
  establishing: 'Establishing shot - shows the location and setting',
  wide: 'Wide shot - shows full scene and all characters',
  medium: 'Medium shot - shows characters from waist up',
  close_up: 'Close-up - focuses on character face or important detail',
  over_shoulder: 'Over-the-shoulder - conversation from one character\'s perspective',
  reaction: 'Reaction shot - captures character\'s emotional response',
  insert: 'Insert shot - close detail of object or action',
  two_shot: 'Two shot - frames two characters in conversation'
};

const CAMERA_ANGLES = {
  eye_level: 'Eye level - neutral, realistic perspective',
  high: 'High angle - looking down, makes subject appear smaller',
  low: 'Low angle - looking up, makes subject appear powerful',
  dutch: 'Dutch angle - tilted, creates unease or tension',
  overhead: 'Overhead - bird\'s eye view',
  pov: 'Point of view - from character\'s perspective'
};

type WorkspaceType = 'claymation' | 'photoreal' | 'documentary' | 'general' | null;

async function getWorkspaceTypeFromSeries(seriesId: string): Promise<WorkspaceType> {
  const { data } = await supabase
    .from('series')
    .select('organization:organization_id(workspace_type)')
    .eq('id', seriesId)
    .maybeSingle();

  const org = data?.organization as { workspace_type?: string } | null;
  return (org?.workspace_type as WorkspaceType) || null;
}

const STYLE_PRESETS: Record<string, { base: string; negative: string; character_suffix: string }> = {
  claymation: {
    base: 'High-quality claymation animation, handcrafted clay characters with visible fingerprint textures, stop-motion aesthetic, tangible 3D miniature sets, soft studio lighting, colorful and whimsical design.',
    negative: 'photorealistic, live-action, CGI, digital, smooth surfaces, realistic skin, natural photography',
    character_suffix: 'Clay texture visible, stop-motion aesthetic.'
  },
  photoreal: {
    base: 'Photorealistic image quality, cinematic cinematography, natural lighting, film grain appropriate to era, high production value, broadcast quality.',
    negative: 'animation, cartoon, claymation, clay texture, stop-motion, anime, illustration, drawing, painting',
    character_suffix: 'Realistic appearance, period-accurate clothing and styling.'
  },
  documentary: {
    base: 'Documentary-style photography, cinematic realism, natural and available lighting, authentic environments, observational composition, journalistic visual approach.',
    negative: 'animation, cartoon, claymation, clay texture, stop-motion, anime, fantasy elements, heavy stylization',
    character_suffix: 'Realistic, authentic appearance, natural lighting on subject.'
  },
  general: {
    base: 'High-quality cinematic composition, professional lighting, clear visual storytelling.',
    negative: 'low quality, blurry, distorted, artifacts, noise',
    character_suffix: 'Clear character presentation, well-lit.'
  }
};

export function getGeminiAPIKey() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  return apiKey;
}

export async function loadScriptWithDetails(scriptId: string) {
  const { data: script, error: scriptError } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', scriptId)
    .single();

  if (scriptError) throw scriptError;

  const { data: acts, error: actsError } = await supabase
    .from('script_acts')
    .select('*')
    .eq('script_id', scriptId)
    .order('act_number', { ascending: true });

  if (actsError) throw actsError;

  const actsWithScenes = await Promise.all(
    (acts || []).map(async (act) => {
      const { data: scenes, error: scenesError } = await supabase
        .from('script_scenes')
        .select('*')
        .eq('act_id', act.id)
        .order('scene_number', { ascending: true });

      if (scenesError) throw scenesError;

      return {
        ...act,
        scenes: scenes || []
      };
    })
  );

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('series_id', script.series_id);

  return {
    script,
    acts: actsWithScenes,
    characters: characters || []
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractCharactersFromText(
  text: string,
  characters: Character[]
): Character[] {
  if (!text || !characters || characters.length === 0) {
    return [];
  }

  const matchedCharacters: Character[] = [];

  for (const character of characters) {
    const nameLower = character.name.toLowerCase();
    const aliasesArray = (character.aliases as string[]) || [];

    const escapedName = escapeRegex(nameLower);
    const namePattern = new RegExp(`\\b${escapedName}\\b`, 'i');
    if (namePattern.test(text)) {
      matchedCharacters.push(character);
      continue;
    }

    for (const alias of aliasesArray) {
      const escapedAlias = escapeRegex(alias.toLowerCase());
      const aliasPattern = new RegExp(`\\b${escapedAlias}\\b`, 'i');
      if (aliasPattern.test(text)) {
        matchedCharacters.push(character);
        break;
      }
    }
  }

  return matchedCharacters;
}

export function analyzeSceneForShots(
  scene: Scene,
  characters: Character[],
  options: StoryboardGenerationOptions
): ShotBreakdown[] {
  const shots: ShotBreakdown[] = [];
  const dialogue = scene.dialogue as any[];
  const shotDensity = options.shotDensity || 'moderate';

  const densityMultiplier = {
    sparse: 0.7,
    moderate: 1.0,
    dense: 1.5
  }[shotDensity];

  let shotCounter = 1;

  const baseShots = Math.max(2, Math.ceil((dialogue?.length || 0) * 0.3 * densityMultiplier));
  const targetShots = Math.min(8, Math.max(3, baseShots));

  const stageDirections = scene.stage_directions || '';
  const sceneDescription = scene.description || '';
  const textToAnalyze = `${stageDirections} ${sceneDescription}`;
  const charactersInScene = extractCharactersFromText(textToAnalyze, characters);

  const establishingCharacterPositions = charactersInScene.map(char => ({
    character: char.name,
    position: 'scene',
    expression: 'neutral'
  }));

  shots.push({
    shotNumber: shotCounter++,
    sceneShotNumber: 1,
    shotType: 'establishing',
    cameraAngle: 'eye_level',
    cameraMovement: 'static',
    shotDescription: `Establishing shot of ${scene.setting || 'the scene location'}. ${scene.description || ''}`,
    compositionNotes: 'Wide frame showing the full environment and setting the scene context',
    characterPositions: establishingCharacterPositions,
    lightingNotes: 'Natural lighting appropriate for the setting',
    propsNeeded: [],
    durationSeconds: 3,
    dialogueText: '',
    stageDirections: scene.stage_directions || '',
    imagePrompt: ''
  });

  if (dialogue && dialogue.length > 0) {
    const dialoguePerShot = Math.ceil(dialogue.length / (targetShots - 1));

    for (let i = 0; i < dialogue.length; i += dialoguePerShot) {
      const dialogueChunk = dialogue.slice(i, i + dialoguePerShot);
      const speakingCharacter = dialogueChunk[0]?.character;
      const isMultiCharacter = dialogueChunk.length > 1;

      let shotType = 'medium';
      let cameraAngle = 'eye_level';

      if (isMultiCharacter) {
        shotType = dialogueChunk.length === 2 ? 'two_shot' : 'wide';
      } else if (dialogueChunk[0]?.line?.length < 30) {
        shotType = 'close_up';
      }

      const emotionalWords = ['excited', 'angry', 'sad', 'worried', 'surprised', 'happy'];
      const hasEmotion = dialogueChunk.some(d =>
        emotionalWords.some(word => d.line?.toLowerCase().includes(word))
      );

      if (hasEmotion) {
        cameraAngle = 'low';
      }

      const dialogueText = dialogueChunk.map(d => `${d.character}: ${d.line}`).join(' ');

      const initialCharacterPositions = dialogueChunk.map(d => ({
        character: d.character,
        position: 'center',
        expression: 'speaking'
      }));

      const mentionedCharacters = extractCharactersFromText(dialogueText, characters);
      const characterPositionsMap = new Map<string, any>();

      for (const pos of initialCharacterPositions) {
        characterPositionsMap.set(pos.character.toLowerCase(), pos);
      }

      for (const char of mentionedCharacters) {
        const charNameLower = char.name.toLowerCase();
        if (!characterPositionsMap.has(charNameLower)) {
          characterPositionsMap.set(charNameLower, {
            character: char.name,
            position: 'scene',
            expression: 'neutral'
          });
        }
      }

      shots.push({
        shotNumber: shotCounter++,
        sceneShotNumber: shots.length + 1,
        shotType,
        cameraAngle,
        cameraMovement: 'static',
        shotDescription: `${shotType} shot of ${speakingCharacter || 'characters'} during dialogue`,
        compositionNotes: `Frame focusing on ${speakingCharacter || 'the speakers'} with appropriate headroom`,
        characterPositions: Array.from(characterPositionsMap.values()),
        lightingNotes: 'Character key lighting with soft fill',
        propsNeeded: [],
        durationSeconds: Math.ceil(dialogueChunk.reduce((sum, d) => sum + (d.line?.length || 0) * 0.05, 0)),
        dialogueText,
        stageDirections: dialogueChunk.map(d => d.stage_direction).filter(Boolean).join('; '),
        imagePrompt: ''
      });

      if (i + dialoguePerShot < dialogue.length && dialogueChunk.length > 0) {
        const nextSpeaker = dialogue[i + dialoguePerShot]?.character;
        if (nextSpeaker && nextSpeaker !== speakingCharacter) {
          shots.push({
            shotNumber: shotCounter++,
            sceneShotNumber: shots.length + 1,
            shotType: 'reaction',
            cameraAngle: 'eye_level',
            cameraMovement: 'static',
            shotDescription: `Reaction shot of ${nextSpeaker} responding`,
            compositionNotes: 'Close framing to capture facial expression',
            characterPositions: [{
              character: nextSpeaker,
              position: 'center',
              expression: 'reacting'
            }],
            lightingNotes: 'Soft lighting to emphasize expression',
            propsNeeded: [],
            durationSeconds: 2,
            dialogueText: '',
            stageDirections: 'Character reacts to what was said',
            imagePrompt: ''
          });
        }
      }
    }
  }

  return shots;
}

export async function generateShotDescription(
  shot: ShotBreakdown,
  scene: Scene,
  script: Script,
  characters: Character[],
  options: StoryboardGenerationOptions,
  workspaceType?: WorkspaceType
): Promise<string> {
  const apiKey = getGeminiAPIKey();

  const isPhotoreal = workspaceType === 'photoreal';

  const characterInfo = characters.map(c =>
    isPhotoreal
      ? `${c.name}: ${c.description || ''} - realistic historical figure/subject`
      : `${c.name}: ${c.description || ''} - ${c.clay_features || 'claymation character'}`
  ).join('\n');

  const charactersInShot = shot.characterPositions
    .map((pos: any) => pos.character || pos.name)
    .filter(Boolean);

  const charactersInShotList = charactersInShot.length > 0
    ? charactersInShot.join(', ')
    : 'None specified';

  const styleContext = isPhotoreal
    ? `Visual Style: Cinematic documentary with photorealistic quality, professional cinematography, period-accurate visuals. ${options.visualStyle || 'Serious documentary tone suitable for adult general audiences.'}`
    : `Visual Style: Claymation animation with handcrafted clay characters, tactile textures, and whimsical design. ${options.visualStyle || 'Bright, colorful, educational tone suitable for children ages 6-10.'}`;

  const roleDescription = isPhotoreal
    ? 'You are a professional cinematographer for historical documentaries. Create a detailed visual description for this shot.'
    : 'You are a professional storyboard artist for claymation animation. Create a detailed visual description for this shot.';

  const descriptionInstructions = isPhotoreal
    ? `Create a detailed shot description (2-3 sentences) that includes:
1. What is visible in the frame - ENSURE ALL LISTED SUBJECTS (${charactersInShotList}) ARE MENTIONED
2. Subject positions, expressions, and actions
3. Important props, artifacts, or background elements
4. Lighting mood, time period atmosphere, and color grading
5. Any documentary techniques (Ken Burns effect, archival integration, etc.)`
    : `Create a detailed shot description (2-3 sentences) that includes:
1. What is visible in the frame - ENSURE ALL LISTED CHARACTERS (${charactersInShotList}) ARE MENTIONED
2. Character positions, expressions, and actions
3. Important props or background elements
4. Lighting mood and color palette
5. Any special claymation effects or vocabulary word visualizations`;

  const prompt = `${roleDescription}

Script: ${script.title}
Scene Setting: ${scene.setting || 'Unknown'}
Scene Description: ${scene.description || ''}

Shot Details:
- Type: ${shot.shotType} (${SHOT_TYPES[shot.shotType as keyof typeof SHOT_TYPES] || shot.shotType})
- Camera Angle: ${shot.cameraAngle} (${CAMERA_ANGLES[shot.cameraAngle as keyof typeof CAMERA_ANGLES] || shot.cameraAngle})
- Camera Movement: ${shot.cameraMovement}
- Dialogue: ${shot.dialogueText || 'None'}
- Stage Directions: ${shot.stageDirections || 'None'}

IMPORTANT - ${isPhotoreal ? 'Subjects' : 'Characters'} that MUST be visible in this shot: ${charactersInShotList}

${isPhotoreal ? 'Subjects' : 'Characters'} in this Series:
${characterInfo}

${styleContext}

${descriptionInstructions}

Shot description:`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 500
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate shot description: ${response.statusText}`);
  }

  const data = await response.json();
  const description = data.candidates?.[0]?.content?.parts?.[0]?.text || shot.shotDescription;

  return description.trim();
}

export function buildImageGenerationPrompt(
  shot: ShotBreakdown,
  enhancedDescription: string,
  script: Script,
  options: StoryboardGenerationOptions
): string {
  const styleGuide = options.claymationEmphasis
    ? 'High-quality claymation animation style, handcrafted clay characters with visible fingerprint textures, stop-motion aesthetic, tangible 3D sets with miniature props, soft studio lighting, colorful and whimsical design'
    : 'Professional storyboard illustration, clean lines, clear composition';

  const prompt = `Storyboard panel for "${script.title}" - ${shot.shotType} shot

Visual Description: ${enhancedDescription}

Shot Type: ${shot.shotType}
Camera Angle: ${shot.cameraAngle}
Composition: ${shot.compositionNotes}
Lighting: ${shot.lightingNotes}

Style: ${styleGuide}

Format: Professional storyboard panel, 16:9 aspect ratio, suitable for animation production reference

Technical requirements: Clear character silhouettes, readable composition, production-ready reference image`;

  return prompt;
}

interface SceneContext {
  setting?: string;
  description?: string;
  actNumber?: number;
}

interface ShotData {
  shot_type?: string;
  camera_angle?: string;
  camera_movement?: string;
  shot_description?: string;
  composition_notes?: string;
  character_positions?: any[];
  lighting_notes?: string;
  props_needed?: string[];
  dialogue_text?: string;
  stage_directions?: string;
  image_prompt?: string;
}

export function buildComprehensiveImagePrompt(
  shot: ShotData,
  sceneContext: SceneContext,
  characters: Character[],
  useClaymation: boolean = true,
  workspaceType?: WorkspaceType
): string {
  const promptSections: string[] = [];

  const effectiveWorkspaceType = workspaceType || (useClaymation ? 'claymation' : 'general');
  const stylePreset = STYLE_PRESETS[effectiveWorkspaceType] ?? STYLE_PRESETS.general;

  promptSections.push(`STYLE: ${stylePreset.base}`);

  if (sceneContext.setting || sceneContext.description) {
    const sceneLines: string[] = [];
    if (sceneContext.setting) {
      sceneLines.push(`Location: ${sceneContext.setting}`);
    }
    if (sceneContext.description) {
      sceneLines.push(`Environment: ${sceneContext.description}`);
    }
    promptSections.push(`SCENE: ${sceneLines.join('. ')}`);
  }

  const framingParts: string[] = [];
  if (shot.shot_type) {
    const shotTypeDesc = SHOT_TYPES[shot.shot_type as keyof typeof SHOT_TYPES] || shot.shot_type;
    framingParts.push(`${shot.shot_type} shot (${shotTypeDesc})`);
  }
  if (shot.camera_angle) {
    const angleDesc = CAMERA_ANGLES[shot.camera_angle as keyof typeof CAMERA_ANGLES] || shot.camera_angle;
    framingParts.push(`${shot.camera_angle} angle (${angleDesc})`);
  }
  if (shot.camera_movement && shot.camera_movement !== 'static') {
    framingParts.push(`Camera movement: ${shot.camera_movement}`);
  }
  if (framingParts.length > 0) {
    promptSections.push(`FRAMING: ${framingParts.join('. ')}`);
  }

  if (shot.shot_description) {
    promptSections.push(`VISUAL: ${shot.shot_description}`);
  }

  if (shot.stage_directions) {
    promptSections.push(`ACTION: ${shot.stage_directions}`);
  }

  const positions = shot.character_positions || [];
  if (positions.length > 0 || shot.dialogue_text) {
    const characterDescriptions: string[] = [];
    const requiredCharacters: string[] = [];
    const criticalFeatures: string[] = [];

    for (const pos of positions) {
      const charName = pos?.character || pos?.name;
      if (!charName) continue;

      const matchResult = findCharacterInList(charName, characters);
      const matchedChar = matchResult.found ? matchResult.match?.character : null;

      const displayName = matchedChar?.name || charName;
      requiredCharacters.push(displayName);

      const charParts: string[] = [`${displayName}`];

      if (matchedChar) {
        if (matchedChar.description) {
          charParts.push(`PHYSICAL APPEARANCE: ${matchedChar.description}`);

          const features = matchedChar.required_visual_features?.length
            ? matchedChar.required_visual_features
            : extractKeyFeaturesFromDescription(matchedChar.description);

          if (features.length > 0) {
            criticalFeatures.push(`${displayName}: ${features.join(', ')}`);
          }
        }

        const isPhotorealOrDocumentary = effectiveWorkspaceType === 'photoreal' || effectiveWorkspaceType === 'documentary';
        if (isPhotorealOrDocumentary) {
          if (matchedChar.description) {
            charParts.push(`VISUAL STYLE: ${stylePreset.character_suffix}`);
          }
        } else if (matchedChar.clay_features) {
          charParts.push(`ANIMATION TRAITS: ${matchedChar.clay_features}`);
        }
      }

      if (pos.position) charParts.push(`positioned ${pos.position}`);
      if (pos.expression) charParts.push(`expression: ${pos.expression}`);

      characterDescriptions.push(charParts.join('. '));
    }

    if (shot.dialogue_text) {
      const emotionHints = inferEmotionFromDialogue(shot.dialogue_text);
      if (emotionHints) {
        characterDescriptions.push(`Emotional context: ${emotionHints}`);
      }
    }

    if (requiredCharacters.length > 0) {
      promptSections.push(
        `REQUIRED CHARACTERS - MUST BE CLEARLY VISIBLE AND RECOGNIZABLE: ${requiredCharacters.join(', ')}. These characters MUST appear exactly as described, with ALL their unique physical features intact.`
      );

      if (criticalFeatures.length > 0) {
        promptSections.push(
          `CRITICAL CHARACTER FEATURES (MUST BE VISIBLE IN IMAGE):\n${criticalFeatures.map(f => `- ${f}`).join('\n')}`
        );

        // CONSISTENCY LOCK — strongest possible language for production continuity
        const lockLines = criticalFeatures.map(f => `- ${f} — LOCKED, must match reference exactly`);
        promptSections.push(
          `CONSISTENCY LOCK — DO NOT VARY THESE TRAITS ACROSS ANY SHOT:\n` +
          `This is a multi-episode production. Character appearance must be IDENTICAL in every frame.\n` +
          lockLines.join('\n') + '\n' +
          `Any deviation from reference images or the traits above breaks production continuity and is unacceptable.`
        );
      }
    }

    if (characterDescriptions.length > 0) {
      promptSections.push(`CHARACTER DETAILS:\n${characterDescriptions.join('\n\n')}`);
    }
  }

  const technicalParts: string[] = [];
  if (shot.composition_notes) {
    technicalParts.push(`Composition: ${shot.composition_notes}`);
  }
  if (shot.lighting_notes) {
    technicalParts.push(`Lighting: ${shot.lighting_notes}`);
  }
  if (shot.props_needed && shot.props_needed.length > 0) {
    technicalParts.push(`Props visible: ${shot.props_needed.join(', ')}`);
  }
  if (technicalParts.length > 0) {
    promptSections.push(`TECHNICAL: ${technicalParts.join('. ')}`);
  }

  if (effectiveWorkspaceType === 'photoreal' || effectiveWorkspaceType === 'documentary') {
    promptSections.push(
      'FORMAT: Cinematic frame, 16:9 aspect ratio, photorealistic quality, period-accurate visuals, professional cinematography.'
    );
    promptSections.push(`NEGATIVE: ${stylePreset.negative}`);
  } else if (effectiveWorkspaceType === 'claymation') {
    promptSections.push(
      'FORMAT: Professional storyboard panel, 16:9 aspect ratio, clear character silhouettes, readable composition.'
    );
  } else {
    promptSections.push(
      'FORMAT: Professional storyboard panel, 16:9 aspect ratio, clear composition.'
    );
    promptSections.push(`NEGATIVE: ${stylePreset.negative}`);
  }

  return promptSections.join('\n\n');
}

function inferEmotionFromDialogue(dialogueText: string): string | null {
  const lower = dialogueText.toLowerCase();
  const emotions: string[] = [];

  if (lower.includes('!') || lower.includes('wow') || lower.includes('amazing') || lower.includes('excited')) {
    emotions.push('excited/enthusiastic');
  }
  if (lower.includes('?') && (lower.includes('why') || lower.includes('how') || lower.includes('what'))) {
    emotions.push('curious/questioning');
  }
  if (lower.includes('oh no') || lower.includes('worry') || lower.includes('scared') || lower.includes('afraid')) {
    emotions.push('worried/concerned');
  }
  if (lower.includes('happy') || lower.includes('glad') || lower.includes('great') || lower.includes('yay')) {
    emotions.push('happy/joyful');
  }
  if (lower.includes('sad') || lower.includes('sorry') || lower.includes('miss')) {
    emotions.push('sad/melancholy');
  }
  if (lower.includes('think') || lower.includes('hmm') || lower.includes('wonder') || lower.includes('maybe')) {
    emotions.push('thoughtful/contemplative');
  }
  if (lower.includes('help') || lower.includes('together') || lower.includes('friend')) {
    emotions.push('supportive/friendly');
  }
  if (lower.includes('angry') || lower.includes('mad') || lower.includes('upset')) {
    emotions.push('angry/frustrated');
  }
  if (lower.includes('surprise') || lower.includes('unexpected') || lower.includes('suddenly')) {
    emotions.push('surprised');
  }

  return emotions.length > 0 ? emotions.join(', ') : null;
}

export async function generateStoryboardForScript(
  scriptId: string,
  options: StoryboardGenerationOptions = {},
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  try {
    onProgress?.(0, 'Loading script and characters...');

    const { script, acts, characters } = await loadScriptWithDetails(scriptId);

    const workspaceType = await getWorkspaceTypeFromSeries(script.series_id);
    const isPhotoreal = workspaceType === 'photoreal';

    const { data: existingStoryboards } = await supabase
      .from('storyboards')
      .select('id, status')
      .eq('script_id', scriptId);

    if (existingStoryboards && existingStoryboards.length > 0) {
      onProgress?.(2, 'Cleaning up previous storyboard...');

      for (const oldStoryboard of existingStoryboards) {
        await supabase
          .from('storyboard_shots')
          .delete()
          .eq('storyboard_id', oldStoryboard.id);

        await supabase
          .from('storyboards')
          .delete()
          .eq('id', oldStoryboard.id);
      }
    }

    onProgress?.(5, 'Creating storyboard...');

    const { data: storyboard, error: storyboardError } = await supabase
      .from('storyboards')
      .insert([{
        script_id: scriptId,
        series_id: script.series_id,
        title: `${script.title} - Storyboard`,
        status: 'generating',
        style_preferences: {
          shotDensity: options.shotDensity || 'moderate',
          visualStyle: options.visualStyle || 'claymation',
          claymationEmphasis: options.claymationEmphasis !== false,
          includeVocabularyVisuals: options.includeVocabularyVisuals !== false
        },
        generation_settings: options,
        ai_generated: true
      }])
      .select()
      .single();

    if (storyboardError) throw storyboardError;

    let globalShotNumber = 1;
    const allShots: any[] = [];

    onProgress?.(10, 'Analyzing scenes and breaking down shots...');

    for (const act of acts) {
      for (const scene of act.scenes) {
        const sceneShots = analyzeSceneForShots(scene, characters, options);

        for (const shot of sceneShots) {
          allShots.push({
            ...shot,
            shotNumber: globalShotNumber++,
            sceneId: scene.id,
            storyboardId: storyboard.id
          });
        }
      }
    }

    await supabase
      .from('storyboards')
      .update({ total_shots: allShots.length })
      .eq('id', storyboard.id);

    // When auto image generation is enabled, descriptions use 0-50% and images use 50-100%.
    // Otherwise descriptions use the full 0-100% range.
    const autoImages = options.imageGenerationMode === 'auto' && isNanoBananaAvailable();
    const descProgressScale = autoImages ? 0.5 : 1.0;
    const descProgressOffset = 0;

    onProgress?.(
      Math.round(20 * descProgressScale),
      `Phase 1 of ${autoImages ? '2' : '1'}: Generating descriptions for ${allShots.length} shots...`
    );

    const shotsToInsert = [];
    for (let i = 0; i < allShots.length; i++) {
      const shot = allShots[i];
      const rawProgress = 20 + (i / allShots.length) * 60;
      const progress = Math.round(rawProgress * descProgressScale + descProgressOffset);

      onProgress?.(progress, `[Shot descriptions] ${i + 1} of ${allShots.length}...`);

      try {
        const scene = acts
          .flatMap(a => a.scenes)
          .find(s => s.id === shot.sceneId);

        if (!scene) continue;

        const enhancedDescription = await generateShotDescription(
          shot,
          scene,
          script,
          characters,
          options,
          workspaceType
        );

        const charactersFromDescription = extractCharactersFromText(enhancedDescription, characters);
        const charactersFromDialogue = shot.dialogueText
          ? extractCharactersFromText(shot.dialogueText, characters)
          : [];

        const existingCharacterNamesLower = new Set(
          shot.characterPositions.map((pos: any) => (pos.character || pos.name).toLowerCase())
        );

        const mergedCharacterPositions = [...shot.characterPositions];

        const allMentionedCharacters = [...charactersFromDescription, ...charactersFromDialogue];
        const seenCharacterIds = new Set<string>();

        for (const char of allMentionedCharacters) {
          if (!seenCharacterIds.has(char.id) && !existingCharacterNamesLower.has(char.name.toLowerCase())) {
            mergedCharacterPositions.push({
              character: char.name,
              position: 'scene',
              expression: 'neutral'
            });
            existingCharacterNamesLower.add(char.name.toLowerCase());
            seenCharacterIds.add(char.id);
          }
        }

        const sceneContext: SceneContext = {
          setting: scene.setting || scene.location,
          description: scene.description,
          actNumber: act.number
        };

        const shotDataForPrompt: ShotData = {
          shot_type: shot.shotType,
          camera_angle: shot.cameraAngle,
          camera_movement: shot.cameraMovement,
          shot_description: enhancedDescription,
          composition_notes: shot.compositionNotes,
          character_positions: mergedCharacterPositions,
          lighting_notes: shot.lightingNotes,
          props_needed: shot.propsNeeded,
          dialogue_text: shot.dialogueText,
          stage_directions: shot.stageDirections
        };

        const imagePrompt = buildComprehensiveImagePrompt(
          shotDataForPrompt,
          sceneContext,
          characters,
          !isPhotoreal,
          workspaceType
        );

        shotsToInsert.push({
          storyboard_id: storyboard.id,
          scene_id: shot.sceneId,
          shot_number: shot.shotNumber,
          scene_shot_number: shot.sceneShotNumber,
          shot_type: shot.shotType,
          camera_angle: shot.cameraAngle,
          camera_movement: shot.cameraMovement,
          shot_description: enhancedDescription,
          composition_notes: shot.compositionNotes,
          character_positions: mergedCharacterPositions,
          lighting_notes: shot.lightingNotes,
          props_needed: shot.propsNeeded,
          duration_seconds: shot.durationSeconds,
          dialogue_text: shot.dialogueText,
          stage_directions: shot.stageDirections,
          image_prompt: imagePrompt,
          generation_status: 'completed'
        });
      } catch (error) {
        console.error(`Error generating shot ${i + 1}:`, error);
        shotsToInsert.push({
          storyboard_id: storyboard.id,
          scene_id: shot.sceneId,
          shot_number: shot.shotNumber,
          scene_shot_number: shot.sceneShotNumber,
          shot_type: shot.shotType,
          camera_angle: shot.cameraAngle,
          camera_movement: shot.cameraMovement,
          shot_description: shot.shotDescription,
          composition_notes: shot.compositionNotes,
          character_positions: shot.characterPositions,
          duration_seconds: shot.durationSeconds,
          dialogue_text: shot.dialogueText,
          generation_status: 'failed'
        });
      }
    }

    onProgress?.(Math.round(85 * descProgressScale), 'Saving storyboard shots...');

    if (shotsToInsert.length > 0) {
      const { error: shotsError } = await supabase
        .from('storyboard_shots')
        .insert(shotsToInsert);

      if (shotsError) throw shotsError;
    }

    onProgress?.(Math.round(95 * descProgressScale), 'Finalizing shot descriptions...');

    await supabase
      .from('storyboards')
      .update({
        status: autoImages ? 'generating_images' : 'completed',
        completed_shots: shotsToInsert.length,
        completed_at: autoImages ? null : new Date().toISOString()
      })
      .eq('id', storyboard.id);

    const { error: jobError } = await supabase
      .from('production_jobs')
      .insert([{
        job_type: 'storyboard_generation',
        entity_id: storyboard.id,
        entity_type: 'storyboard',
        status: 'completed',
        service: 'vertex_ai_gemini',
        request_payload: { scriptId, options },
        response_data: { totalShots: allShots.length },
        completed_at: new Date().toISOString()
      }]);

    if (jobError) console.error('Error logging production job:', jobError);

    // -----------------------------------------------------------------------
    // Phase 2: Auto image generation
    // -----------------------------------------------------------------------
    if (autoImages) {
      const totalImageShots = shotsToInsert.length;
      onProgress?.(50, `Phase 2 of 2: Generating images for ${totalImageShots} shots...`);

      let imageSuccessCount = 0;
      await generateImagesForStoryboard(
        storyboard.id,
        undefined,
        (imgProgress, imgStatus, shotNumber) => {
          // Map image progress (0-100) to overall progress (50-100)
          const overallProgress = 50 + imgProgress * 0.5;
          onProgress?.(Math.round(overallProgress), `[Image generation] ${imgStatus}`, shotNumber);
        },
        { delayBetweenShots: 3000 }
      ).then(result => {
        imageSuccessCount = result.successCount;
      }).catch(err => {
        console.error('Image generation phase failed:', err);
        // Don't throw — the descriptions are already saved, images can be generated manually
      });

      await supabase
        .from('storyboards')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', storyboard.id);

      onProgress?.(100, `Storyboard complete — ${totalImageShots} shots with images!`);
    } else {
      onProgress?.(100, 'Storyboard generation complete!');
    }

    return storyboard.id;

  } catch (error) {
    console.error('Storyboard generation error:', error);
    throw error;
  }
}

export async function regenerateShot(
  shotId: string,
  newPrompt?: string
): Promise<void> {
  const { data: shot } = await supabase
    .from('storyboard_shots')
    .select('*')
    .eq('id', shotId)
    .single();

  if (!shot) throw new Error('Shot not found');

  await supabase
    .from('storyboard_shots')
    .update({
      generation_status: 'generating',
      revision_notes: newPrompt || shot.revision_notes
    })
    .eq('id', shotId);

  await supabase
    .from('storyboard_shots')
    .update({
      generation_status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', shotId);
}

export function selectShotsForImageGeneration(
  allShots: any[],
  acts: any[],
  minShotsPerAct: number = 5
): Set<string> {
  const selectedShotIds = new Set<string>();

  for (const act of acts) {
    const actShots = allShots.filter(shot => {
      const scene = act.scenes.find((s: any) => s.id === shot.sceneId);
      return !!scene;
    });

    if (actShots.length === 0) continue;

    const numberOfShotsToGenerate = Math.max(minShotsPerAct, Math.ceil(actShots.length * 0.5));
    const actualShotsToGenerate = Math.min(numberOfShotsToGenerate, actShots.length);

    const priorityShots: any[] = [];
    const regularShots: any[] = [];

    actShots.forEach(shot => {
      const isEstablishing = shot.shotType === 'establishing';
      const hasDialogue = shot.dialogueText && shot.dialogueText.length > 0;
      const isCloseUp = shot.shotType === 'close_up';
      const isReaction = shot.shotType === 'reaction';

      if (isEstablishing || hasDialogue || isCloseUp || isReaction) {
        priorityShots.push(shot);
      } else {
        regularShots.push(shot);
      }
    });

    const shotsToSelect = [...priorityShots];

    if (shotsToSelect.length < actualShotsToGenerate) {
      const remaining = actualShotsToGenerate - shotsToSelect.length;
      const interval = Math.floor(regularShots.length / remaining);

      for (let i = 0; i < remaining && i * interval < regularShots.length; i++) {
        shotsToSelect.push(regularShots[i * interval]);
      }
    }

    shotsToSelect.slice(0, actualShotsToGenerate).forEach(shot => {
      selectedShotIds.add(shot.shotNumber.toString());
    });
  }

  return selectedShotIds;
}

export interface GenerationProgressInfo {
  progress: number;
  status: string;
  shotNumber?: number;
  currentIndex: number;
  totalShots: number;
  successCount: number;
  failCount: number;
  estimatedTimeRemaining?: number;
}

export interface GenerationOptions {
  delayBetweenShots?: number;
  stopOnError?: boolean;
  onDetailedProgress?: (info: GenerationProgressInfo) => void;
}

const DEFAULT_DELAY_BETWEEN_SHOTS = 4000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateImagesForStoryboard(
  storyboardId: string,
  shotIds?: string[],
  onProgress?: (progress: number, status: string, shotNumber?: number) => void,
  options?: GenerationOptions
): Promise<{ successCount: number; failCount: number; totalCost: number }> {
  const { data: storyboard } = await supabase
    .from('storyboards')
    .select('*, scripts(*)')
    .eq('id', storyboardId)
    .single();

  if (!storyboard) throw new Error('Storyboard not found');

  const seriesId = (storyboard.scripts as any)?.series_id;
  let characters: Character[] = [];
  let workspaceType: WorkspaceType = null;

  if (seriesId) {
    const { data: seriesCharacters } = await supabase
      .from('characters')
      .select('*')
      .eq('series_id', seriesId);
    characters = seriesCharacters || [];
    workspaceType = await getWorkspaceTypeFromSeries(seriesId);
  }

  const isPhotoreal = workspaceType === 'photoreal';

  onProgress?.(0, 'Initializing character references...');

  const { initializeStoryboardReferences } = await import('./storyboardReferenceService');
  try {
    await initializeStoryboardReferences(storyboardId);
  } catch (error) {
    console.warn('Could not initialize references, continuing with fallback:', error);
  }

  let savedReferencesMap: Map<string, { name: string; imageUrl: string; description?: string }>;
  try {
    savedReferencesMap = await getReferencesForGeneration(storyboardId);
    console.log('Loaded saved references for generation:', Array.from(savedReferencesMap.keys()));
  } catch (error) {
    console.warn('Could not load saved references, falling back to character matching:', error);
    savedReferencesMap = new Map();
  }

  clearImageCache();

  // Build consistency profiles for every character in this series.
  // Profiles track verified reference images AND rolling seeds (first generated shot).
  const consistencyProfiles = buildCharacterConsistencyProfiles(characters, savedReferencesMap);

  // Pre-warm the image cache with all verified reference images so the first shot
  // doesn't pay a cold-fetch penalty and all references are loaded once.
  const referenceUrlsToPrewarm = Array.from(consistencyProfiles.values())
    .filter((p, idx, arr) => arr.findIndex(x => x.referenceImageUrl === p.referenceImageUrl) === idx)
    .map(p => p.referenceImageUrl)
    .filter((url): url is string => !!url);

  if (referenceUrlsToPrewarm.length > 0) {
    onProgress?.(0, `Pre-loading ${referenceUrlsToPrewarm.length} character reference image(s)...`);
    await prewarmImageCache(referenceUrlsToPrewarm);
    console.log(`Pre-warmed image cache for ${referenceUrlsToPrewarm.length} character references.`);
  }

  // Rolling seeds: character name (lower) → first generated shot URL.
  // When a character has no verified reference, the first shot that renders them
  // is stored here and used as the consistency anchor for all subsequent shots.
  const rollingSeeds = new Map<string, string>();

  let query = supabase
    .from('storyboard_shots')
    .select('*, script_scenes!inner(*, script_acts!inner(act_number))')
    .eq('storyboard_id', storyboardId)
    .order('shot_number', { ascending: true });

  if (shotIds && shotIds.length > 0) {
    query = query.in('id', shotIds);
  }

  const { data: shots } = await query;

  if (!shots || shots.length === 0) {
    throw new Error('No shots found for image generation');
  }

  const delayBetweenShots = options?.delayBetweenShots ?? DEFAULT_DELAY_BETWEEN_SHOTS;
  const stopOnError = options?.stopOnError ?? false;

  let completedShots = 0;
  let successCount = 0;
  let failCount = 0;
  const totalShots = shots.length;
  let totalCost = 0;
  const generationTimes: number[] = [];

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const isLastShot = i === shots.length - 1;

    try {
      const avgTime = generationTimes.length > 0
        ? generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length
        : 15000;
      const estimatedTimeRemaining = Math.round(((totalShots - completedShots) * (avgTime + delayBetweenShots)) / 1000);

      const progressInfo: GenerationProgressInfo = {
        progress: (completedShots / totalShots) * 100,
        status: `Generating shot ${shot.shot_number} (${completedShots + 1} of ${totalShots})...`,
        shotNumber: shot.shot_number,
        currentIndex: i,
        totalShots,
        successCount,
        failCount,
        estimatedTimeRemaining
      };

      onProgress?.(progressInfo.progress, progressInfo.status, shot.shot_number);
      options?.onDetailedProgress?.(progressInfo);

      await supabase
        .from('storyboard_shots')
        .update({ generation_status: 'generating' })
        .eq('id', shot.id);

      const sceneData = shot.script_scenes as any;
      const actNumber = sceneData.script_acts.act_number;
      const genStartTime = Date.now();

      const characterReferences: CharacterReference[] = [];
      const matchedCharactersForShot: Character[] = [];
      const positions = shot.character_positions as any[] || [];
      const addedCharacterNames = new Set<string>();

      // Collect every character name mentioned in this shot (positions + text)
      const shotText = `${shot.shot_description || ''} ${shot.stage_directions || ''} ${shot.dialogue_text || ''}`.toLowerCase();
      const shotCharacterNames: string[] = positions
        .map((pos: any) => pos?.character || pos?.name)
        .filter(Boolean);

      // Also detect characters mentioned in shot text but not explicitly positioned
      for (const char of characters) {
        const charNameLower = char.name.toLowerCase();
        if (shotCharacterNames.some(n => n.toLowerCase() === charNameLower)) continue;
        const aliases = (char.aliases as string[]) || [];
        const allNames = [charNameLower, ...aliases.map((a: string) => a.toLowerCase())];
        const isInShot = allNames.some(name => {
          const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return regex.test(shotText);
        });
        if (isInShot) shotCharacterNames.push(char.name);
      }

      for (const charName of shotCharacterNames) {
        const charNameLower = charName.toLowerCase();
        if (addedCharacterNames.has(charNameLower)) continue;

        // Resolve via consistency profile (covers saved refs + library refs)
        const profile = consistencyProfiles.get(charNameLower);
        const matchResult = findCharacterInList(charName, characters);
        const matchedChar = matchResult.found ? matchResult.match?.character : null;
        if (matchedChar) matchedCharactersForShot.push(matchedChar);

        // Priority 1: verified reference image (custom upload or library)
        const verifiedUrl = profile?.referenceImageUrl ?? matchedChar?.reference_image_url ?? null;
        if (verifiedUrl) {
          const displayName = profile?.name ?? matchedChar?.name ?? charName;
          console.log(`[Consistency] Shot #${shot.shot_number}: "${charName}" → verified reference: ${verifiedUrl}`);
          characterReferences.push({
            name: displayName,
            imageUrl: verifiedUrl,
            description: profile?.description ?? matchedChar?.description ?? undefined,
            requiredFeatures: profile?.lockedFeatures ?? matchedChar?.required_visual_features ?? [],
            referenceType: 'verified'
          });
          addedCharacterNames.add(charNameLower);
          continue;
        }

        // Priority 2: rolling seed from a previously generated shot this session
        const seedUrl = profile ? rollingSeeds.get(profile.name.toLowerCase()) : rollingSeeds.get(charNameLower);
        if (seedUrl) {
          const displayName = profile?.name ?? matchedChar?.name ?? charName;
          console.log(`[Consistency] Shot #${shot.shot_number}: "${charName}" → rolling seed: ${seedUrl}`);
          characterReferences.push({
            name: displayName,
            imageUrl: seedUrl,
            description: profile?.description ?? matchedChar?.description ?? undefined,
            requiredFeatures: profile?.lockedFeatures ?? matchedChar?.required_visual_features ?? [],
            referenceType: 'seed'
          });
          addedCharacterNames.add(charNameLower);
          continue;
        }

        // Priority 3: text description only — warn, but still populate features for prompt
        const displayName = profile?.name ?? matchedChar?.name ?? charName;
        console.warn(`[Consistency] Shot #${shot.shot_number}: "${charName}" has no reference or seed — text-only consistency`);
        // No imageUrl to add, but mark as needing seed after this shot
        addedCharacterNames.add(charNameLower);
      }

      // Characters that still need a seed after this shot is generated
      const needsSeedAfterShot = shotCharacterNames
        .map(n => n.toLowerCase())
        .filter(n => {
          const profile = consistencyProfiles.get(n);
          const hasVerified = profile?.referenceImageUrl ?? false;
          const hasSeed = rollingSeeds.has(profile ? profile.name.toLowerCase() : n);
          return !hasVerified && !hasSeed;
        });

      const sceneContext: SceneContext = {
        setting: sceneData.setting,
        description: sceneData.description,
        actNumber
      };

      const comprehensivePrompt = buildComprehensiveImagePrompt(
        {
          shot_type: shot.shot_type,
          camera_angle: shot.camera_angle,
          camera_movement: shot.camera_movement,
          shot_description: shot.shot_description,
          composition_notes: shot.composition_notes,
          character_positions: shot.character_positions as any[],
          lighting_notes: shot.lighting_notes,
          props_needed: shot.props_needed as string[],
          dialogue_text: shot.dialogue_text,
          stage_directions: shot.stage_directions,
          image_prompt: shot.image_prompt
        },
        sceneContext,
        characters,
        !isPhotoreal,
        workspaceType
      );

      if (characterReferences.length === 0 && shot.shot_description) {
        const descriptionLower = shot.shot_description.toLowerCase();
        const hasCharacterMention = characters.some(char =>
          descriptionLower.includes(char.name.toLowerCase())
        );
        if (hasCharacterMention) {
          console.warn(`Shot #${shot.shot_number}: Description mentions characters but no character references loaded. This may result in incorrect character appearances.`);
        }
      }

      console.log(`Shot #${shot.shot_number}: Generating with ${characterReferences.length} character reference(s): ${characterReferences.map(r => r.name).join(', ') || 'none'}`);

      const result = await generateStoryboardImage(
        {
          prompt: comprehensivePrompt,
          aspectRatio: '16:9',
          characterReferences
        },
        storyboardId,
        actNumber,
        shot.shot_number
      );

      generationTimes.push(Date.now() - genStartTime);

      // Store rolling seeds for characters that had no verified reference.
      // Subsequent shots featuring the same character will use this as their consistency anchor.
      for (const charNameLower of needsSeedAfterShot) {
        const profile = consistencyProfiles.get(charNameLower);
        const seedKey = profile ? profile.name.toLowerCase() : charNameLower;
        if (!rollingSeeds.has(seedKey)) {
          rollingSeeds.set(seedKey, result.imageUrl);
          console.log(`[Consistency] Stored rolling seed for "${seedKey}" from shot #${shot.shot_number}`);
        }
      }

      await supabase
        .from('storyboard_shots')
        .update({
          image_url: result.imageUrl,
          thumbnail_url: result.thumbnailUrl,
          generation_status: 'completed',
          generation_metadata: {
            generationTime: result.generationTime,
            estimatedCost: result.estimatedCost,
            generatedAt: new Date().toISOString(),
            characterReferencesUsed: characterReferences.map(r => ({
              name: r.name,
              imageUrl: r.imageUrl,
              source: r.referenceType === 'seed'
                ? 'rolling_seed'
                : savedReferencesMap.has(r.name.toLowerCase())
                  ? 'saved_reference'
                  : 'character_library'
            })),
            rollingSeedsUsed: Array.from(rollingSeeds.keys()),
            promptUsed: comprehensivePrompt,
            characterPositions: positions.map(p => p?.character || p?.name).filter(Boolean)
          }
        })
        .eq('id', shot.id);

      totalCost += result.estimatedCost;
      successCount++;
      completedShots++;

      await supabase
        .from('production_jobs')
        .insert({
          job_type: 'image_generation',
          entity_id: shot.id,
          entity_type: 'storyboard_shot',
          status: 'completed',
          service: 'nano_banana',
          request_payload: {
            shotNumber: shot.shot_number,
            prompt: shot.image_prompt
          },
          response_data: {
            imageUrl: result.imageUrl,
            generationTime: result.generationTime
          },
          estimated_cost: result.estimatedCost,
          completed_at: new Date().toISOString()
        });

      onProgress?.(
        (completedShots / totalShots) * 100,
        `Shot ${shot.shot_number} completed successfully`,
        shot.shot_number
      );

      if (!isLastShot && delayBetweenShots > 0) {
        onProgress?.(
          (completedShots / totalShots) * 100,
          `Waiting ${Math.round(delayBetweenShots / 1000)}s before next shot...`,
          shot.shot_number
        );
        await sleep(delayBetweenShots);
      }

    } catch (error) {
      console.error(`Failed to generate image for shot ${shot.shot_number}:`, error);

      await supabase
        .from('storyboard_shots')
        .update({
          generation_status: 'failed',
          generation_metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', shot.id);

      failCount++;
      completedShots++;

      onProgress?.(
        (completedShots / totalShots) * 100,
        `Shot ${shot.shot_number} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        shot.shot_number
      );

      if (stopOnError) {
        throw new Error(`Generation stopped: Shot ${shot.shot_number} failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      if (!isLastShot && delayBetweenShots > 0) {
        await sleep(delayBetweenShots);
      }
    }
  }

  const finalStatus = failCount > 0
    ? `Complete: ${successCount} succeeded, ${failCount} failed. Cost: $${totalCost.toFixed(2)}`
    : `All ${successCount} images generated successfully! Cost: $${totalCost.toFixed(2)}`;

  onProgress?.(100, finalStatus);

  return { successCount, failCount, totalCost };
}

export async function generateSingleImage(
  storyboardId: string,
  shotId: string,
  onProgress?: (progress: number, status: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await generateImagesForStoryboard(storyboardId, [shotId], onProgress);
    return { success: result.successCount > 0, error: result.failCount > 0 ? 'Generation failed' : undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function cleanupOrphanStoryboards(scriptId: string): Promise<{ deleted: number }> {
  const { data: storyboards } = await supabase
    .from('storyboards')
    .select('id, status')
    .eq('script_id', scriptId);

  if (!storyboards || storyboards.length === 0) {
    return { deleted: 0 };
  }

  let deleted = 0;
  for (const storyboard of storyboards) {
    if (storyboard.status === 'generating' || storyboard.status === 'failed') {
      await supabase
        .from('storyboard_shots')
        .delete()
        .eq('storyboard_id', storyboard.id);

      await supabase
        .from('storyboards')
        .delete()
        .eq('id', storyboard.id);

      deleted++;
    }
  }

  return { deleted };
}

export async function getStoryboardStatus(scriptId: string): Promise<{
  exists: boolean;
  status: string | null;
  shotCount: number;
  shotsWithPrompts: number;
  shotsWithImages: number;
}> {
  const { data: storyboard } = await supabase
    .from('storyboards')
    .select('id, status')
    .eq('script_id', scriptId)
    .maybeSingle();

  if (!storyboard) {
    return { exists: false, status: null, shotCount: 0, shotsWithPrompts: 0, shotsWithImages: 0 };
  }

  const { data: shots } = await supabase
    .from('storyboard_shots')
    .select('id, image_prompt, image_url')
    .eq('storyboard_id', storyboard.id);

  const shotCount = shots?.length || 0;
  const shotsWithPrompts = shots?.filter(s => s.image_prompt && s.image_prompt.trim() !== '').length || 0;
  const shotsWithImages = shots?.filter(s => s.image_url && s.image_url.trim() !== '').length || 0;

  return {
    exists: true,
    status: storyboard.status,
    shotCount,
    shotsWithPrompts,
    shotsWithImages
  };
}

export async function regenerateShotPrompt(
  shotId: string,
  useClaymation: boolean = true
): Promise<{ success: boolean; newPrompt: string; error?: string }> {
  try {
    const { data: shot, error: shotError } = await supabase
      .from('storyboard_shots')
      .select(`
        *,
        storyboards!inner (
          id,
          script_id,
          scripts!inner (
            id,
            series_id
          )
        )
      `)
      .eq('id', shotId)
      .single();

    if (shotError || !shot) {
      return { success: false, newPrompt: '', error: 'Shot not found' };
    }

    const scriptId = shot.storyboards?.scripts?.id;
    const seriesId = shot.storyboards?.scripts?.series_id;

    if (!scriptId) {
      return { success: false, newPrompt: '', error: 'Script not found' };
    }

    const { data: scene } = await supabase
      .from('script_scenes')
      .select('*, script_acts!inner(act_number)')
      .eq('id', shot.scene_id)
      .single();

    const { data: characters } = await supabase
      .from('characters')
      .select('*')
      .eq('series_id', seriesId);

    const workspaceType = seriesId ? await getWorkspaceTypeFromSeries(seriesId) : null;
    const isPhotoreal = workspaceType === 'photoreal' || workspaceType === 'documentary';

    const sceneContext: SceneContext = {
      setting: scene?.setting || scene?.location || '',
      description: scene?.description || '',
      actNumber: scene?.script_acts?.act_number
    };

    const shotData: ShotData = {
      shot_type: shot.shot_type,
      camera_angle: shot.camera_angle,
      camera_movement: shot.camera_movement,
      shot_description: shot.shot_description,
      composition_notes: shot.composition_notes,
      character_positions: shot.character_positions,
      lighting_notes: shot.lighting_notes,
      props_needed: shot.props_needed,
      dialogue_text: shot.dialogue_text,
      stage_directions: shot.stage_directions
    };

    const newPrompt = buildComprehensiveImagePrompt(
      shotData,
      sceneContext,
      characters || [],
      !isPhotoreal,
      workspaceType
    );

    const { error: updateError } = await supabase
      .from('storyboard_shots')
      .update({ image_prompt: newPrompt })
      .eq('id', shotId);

    if (updateError) {
      return { success: false, newPrompt: '', error: updateError.message };
    }

    return { success: true, newPrompt };
  } catch (error) {
    return {
      success: false,
      newPrompt: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function regenerateAllPromptsForStoryboard(
  storyboardId: string,
  useClaymation: boolean = true,
  onProgress?: (progress: number, status: string) => void
): Promise<{ successCount: number; failCount: number }> {
  const { data: shots, error: shotsError } = await supabase
    .from('storyboard_shots')
    .select('id')
    .eq('storyboard_id', storyboardId)
    .order('shot_number', { ascending: true });

  if (shotsError || !shots) {
    throw new Error('Failed to fetch shots');
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const progress = ((i + 1) / shots.length) * 100;
    onProgress?.(progress, `Regenerating prompt for shot ${i + 1} of ${shots.length}...`);

    const result = await regenerateShotPrompt(shot.id, useClaymation);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  onProgress?.(100, `Complete: ${successCount} regenerated, ${failCount} failed`);
  return { successCount, failCount };
}

export function mergeUserEditsWithMetadata(
  userEditedPrompt: string,
  shotData: ShotData,
  sceneContext: SceneContext,
  characters: Character[],
  useClaymation: boolean = true,
  workspaceType?: WorkspaceType
): string {
  const freshPrompt = buildComprehensiveImagePrompt(shotData, sceneContext, characters, useClaymation, workspaceType);

  const sectionMap: Record<string, string> = {};
  const freshSections = freshPrompt.split('\n\n');
  for (const section of freshSections) {
    const colonIndex = section.indexOf(':');
    if (colonIndex > 0) {
      const key = section.substring(0, colonIndex).trim();
      sectionMap[key] = section;
    }
  }

  const userSections = userEditedPrompt.split('\n\n');
  const mergedSections: string[] = [];
  const preserveFromUser = new Set(['VISUAL', 'ACTION', 'CHARACTERS']);
  const updateFromMetadata = new Set(['STYLE', 'FRAMING', 'TECHNICAL', 'FORMAT', 'SCENE']);

  for (const section of userSections) {
    const colonIndex = section.indexOf(':');
    if (colonIndex > 0) {
      const key = section.substring(0, colonIndex).trim();

      if (updateFromMetadata.has(key) && sectionMap[key]) {
        mergedSections.push(sectionMap[key]);
        delete sectionMap[key];
      } else {
        mergedSections.push(section);
        delete sectionMap[key];
      }
    } else {
      mergedSections.push(section);
    }
  }

  for (const [key, section] of Object.entries(sectionMap)) {
    if (!preserveFromUser.has(key)) {
      mergedSections.push(section);
    }
  }

  return mergedSections.join('\n\n');
}

export async function getShotMetadata(shotId: string): Promise<{
  shot: ShotData | null;
  sceneContext: SceneContext | null;
  characters: Character[];
  error?: string;
}> {
  try {
    const { data: shot, error: shotError } = await supabase
      .from('storyboard_shots')
      .select(`
        *,
        storyboards!inner (
          script_id,
          scripts!inner (
            series_id
          )
        )
      `)
      .eq('id', shotId)
      .single();

    if (shotError || !shot) {
      return { shot: null, sceneContext: null, characters: [], error: 'Shot not found' };
    }

    const { data: scene } = await supabase
      .from('script_scenes')
      .select('*, script_acts!inner(act_number)')
      .eq('id', shot.scene_id)
      .single();

    const seriesId = shot.storyboards?.scripts?.series_id;
    const { data: characters } = await supabase
      .from('characters')
      .select('*')
      .eq('series_id', seriesId);

    return {
      shot: {
        shot_type: shot.shot_type,
        camera_angle: shot.camera_angle,
        camera_movement: shot.camera_movement,
        shot_description: shot.shot_description,
        composition_notes: shot.composition_notes,
        character_positions: shot.character_positions,
        lighting_notes: shot.lighting_notes,
        props_needed: shot.props_needed,
        dialogue_text: shot.dialogue_text,
        stage_directions: shot.stage_directions
      },
      sceneContext: {
        setting: scene?.setting || scene?.location || '',
        description: scene?.description || '',
        actNumber: scene?.script_acts?.act_number
      },
      characters: characters || []
    };
  } catch (error) {
    return {
      shot: null,
      sceneContext: null,
      characters: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export interface CharacterValidationResult {
  valid: boolean;
  totalCharacters: number;
  matchedCharacters: number;
  charactersWithReferences: number;
  charactersWithDescriptions: number;
  warnings: string[];
  errors: string[];
  characterDetails: {
    name: string;
    matched: boolean;
    hasReferenceImage: boolean;
    hasDescription: boolean;
    matchType?: string;
  }[];
}

export async function validateStoryboardCharacters(
  storyboardId: string
): Promise<CharacterValidationResult> {
  const { data: storyboard } = await supabase
    .from('storyboards')
    .select('*, scripts(*)')
    .eq('id', storyboardId)
    .single();

  if (!storyboard) {
    return {
      valid: false,
      totalCharacters: 0,
      matchedCharacters: 0,
      charactersWithReferences: 0,
      charactersWithDescriptions: 0,
      warnings: [],
      errors: ['Storyboard not found'],
      characterDetails: []
    };
  }

  const seriesId = (storyboard.scripts as any)?.series_id;
  if (!seriesId) {
    return {
      valid: false,
      totalCharacters: 0,
      matchedCharacters: 0,
      charactersWithReferences: 0,
      charactersWithDescriptions: 0,
      warnings: [],
      errors: ['No series associated with storyboard'],
      characterDetails: []
    };
  }

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('series_id', seriesId);

  const { data: shots } = await supabase
    .from('storyboard_shots')
    .select('character_positions')
    .eq('storyboard_id', storyboardId);

  const allCharacterNames = new Set<string>();
  for (const shot of shots || []) {
    const positions = shot.character_positions as any[] || [];
    for (const pos of positions) {
      const name = pos?.character || pos?.name;
      if (name) allCharacterNames.add(name);
    }
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  const characterDetails: CharacterValidationResult['characterDetails'] = [];
  let matchedCount = 0;
  let withReferences = 0;
  let withDescriptions = 0;

  for (const charName of allCharacterNames) {
    const matchResult = findCharacterInList(charName, characters || []);

    if (matchResult.found && matchResult.match) {
      const char = matchResult.match.character;
      matchedCount++;

      const hasRef = !!char.reference_image_url;
      const hasDesc = !!char.description;

      if (hasRef) withReferences++;
      if (hasDesc) withDescriptions++;

      characterDetails.push({
        name: char.name,
        matched: true,
        hasReferenceImage: hasRef,
        hasDescription: hasDesc,
        matchType: matchResult.match.matchType
      });

      if (!hasRef && !hasDesc) {
        errors.push(`${char.name}: No reference image or description - character may render incorrectly`);
      } else if (!hasRef) {
        warnings.push(`${char.name}: No reference image - using description only for consistency`);
      }

      if (matchResult.match.matchType === 'fuzzy' && matchResult.match.confidence < 0.85) {
        warnings.push(`"${charName}" matched to "${char.name}" with low confidence - verify this is correct`);
      }
    } else {
      characterDetails.push({
        name: charName,
        matched: false,
        hasReferenceImage: false,
        hasDescription: false
      });
      errors.push(`Character "${charName}" not found in database - add this character or check spelling`);
    }
  }

  return {
    valid: errors.length === 0,
    totalCharacters: allCharacterNames.size,
    matchedCharacters: matchedCount,
    charactersWithReferences: withReferences,
    charactersWithDescriptions: withDescriptions,
    warnings,
    errors,
    characterDetails
  };
}

export async function repairShotCharacterPositions(
  shotId: string
): Promise<{ success: boolean; message: string; updatedPositions: any[] }> {
  const { data: shot, error: shotError } = await supabase
    .from('storyboard_shots')
    .select(`
      *,
      storyboards!inner(
        id,
        scripts!inner(
          series_id
        )
      )
    `)
    .eq('id', shotId)
    .single();

  if (shotError || !shot) {
    return {
      success: false,
      message: 'Shot not found',
      updatedPositions: []
    };
  }

  const seriesId = shot.storyboards?.scripts?.series_id;
  if (!seriesId) {
    return {
      success: false,
      message: 'Could not determine series for this shot',
      updatedPositions: []
    };
  }

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('series_id', seriesId);

  if (!characters || characters.length === 0) {
    return {
      success: false,
      message: 'No characters found for this series',
      updatedPositions: []
    };
  }

  const shotDescription = shot.shot_description || '';
  const stageDirections = shot.stage_directions || '';
  const dialogueText = shot.dialogue_text || '';
  const textToAnalyze = `${shotDescription} ${stageDirections} ${dialogueText}`;

  const detectedCharacters = extractCharactersFromText(textToAnalyze, characters);

  if (detectedCharacters.length === 0) {
    return {
      success: true,
      message: 'No characters detected in shot description or stage directions',
      updatedPositions: []
    };
  }

  const seenCharacterNamesLower = new Set<string>();
  const updatedPositions = [];

  for (const char of detectedCharacters) {
    const nameLower = char.name.toLowerCase();
    if (!seenCharacterNamesLower.has(nameLower)) {
      updatedPositions.push({
        character: char.name,
        position: 'scene',
        expression: 'neutral'
      });
      seenCharacterNamesLower.add(nameLower);
    }
  }

  const { error: updateError } = await supabase
    .from('storyboard_shots')
    .update({
      character_positions: updatedPositions
    })
    .eq('id', shotId);

  if (updateError) {
    return {
      success: false,
      message: `Failed to update shot: ${updateError.message}`,
      updatedPositions: []
    };
  }

  return {
    success: true,
    message: `Successfully detected and added ${detectedCharacters.length} character(s): ${detectedCharacters.map(c => c.name).join(', ')}`,
    updatedPositions
  };
}

export async function repairStoryboardCharacterPositions(
  storyboardId: string
): Promise<{ success: boolean; message: string; repairedCount: number }> {
  const { data: storyboard, error: storyboardError } = await supabase
    .from('storyboards')
    .select(`
      id,
      scripts!inner(
        series_id
      )
    `)
    .eq('id', storyboardId)
    .single();

  if (storyboardError || !storyboard) {
    return {
      success: false,
      message: 'Storyboard not found',
      repairedCount: 0
    };
  }

  const seriesId = storyboard.scripts?.series_id;
  if (!seriesId) {
    return {
      success: false,
      message: 'Could not determine series for this storyboard',
      repairedCount: 0
    };
  }

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('series_id', seriesId);

  if (!characters || characters.length === 0) {
    return {
      success: false,
      message: 'No characters found for this series',
      repairedCount: 0
    };
  }

  const { data: shots } = await supabase
    .from('storyboard_shots')
    .select('*')
    .eq('storyboard_id', storyboardId);

  if (!shots || shots.length === 0) {
    return {
      success: false,
      message: 'No shots found for this storyboard',
      repairedCount: 0
    };
  }

  let repairedCount = 0;

  for (const shot of shots) {
    const positions = shot.character_positions as any[] || [];

    if (positions.length === 0) {
      const shotDescription = shot.shot_description || '';
      const stageDirections = shot.stage_directions || '';
      const textToAnalyze = `${shotDescription} ${stageDirections}`;

      const detectedCharacters = extractCharactersFromText(textToAnalyze, characters);

      if (detectedCharacters.length > 0) {
        const updatedPositions = detectedCharacters.map(char => ({
          character: char.name,
          position: 'scene',
          expression: 'neutral'
        }));

        await supabase
          .from('storyboard_shots')
          .update({
            character_positions: updatedPositions
          })
          .eq('id', shot.id);

        repairedCount++;
      }
    }
  }

  return {
    success: true,
    message: `Successfully repaired ${repairedCount} shot(s) in storyboard`,
    repairedCount
  };
}

export { isNanoBananaAvailable, calculateEstimatedCost };
