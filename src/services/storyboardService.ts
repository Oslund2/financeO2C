import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Scene = Database['public']['Tables']['script_scenes']['Row'];
type Act = Database['public']['Tables']['script_acts']['Row'];
type Script = Database['public']['Tables']['scripts']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

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

export function getVertexAICredentials() {
  const projectId = import.meta.env.VITE_VERTEX_AI_PROJECT_ID;
  const location = import.meta.env.VITE_VERTEX_AI_LOCATION || 'us-central1';
  const apiKey = import.meta.env.VITE_VERTEX_AI_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error('Vertex AI credentials not configured');
  }

  return { projectId, location, apiKey };
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

  shots.push({
    shotNumber: shotCounter++,
    sceneShotNumber: 1,
    shotType: 'establishing',
    cameraAngle: 'eye_level',
    cameraMovement: 'static',
    shotDescription: `Establishing shot of ${scene.setting || 'the scene location'}. ${scene.description || ''}`,
    compositionNotes: 'Wide frame showing the full environment and setting the scene context',
    characterPositions: [],
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

      shots.push({
        shotNumber: shotCounter++,
        sceneShotNumber: shots.length + 1,
        shotType,
        cameraAngle,
        cameraMovement: 'static',
        shotDescription: `${shotType} shot of ${speakingCharacter || 'characters'} during dialogue`,
        compositionNotes: `Frame focusing on ${speakingCharacter || 'the speakers'} with appropriate headroom`,
        characterPositions: dialogueChunk.map(d => ({
          character: d.character,
          position: 'center',
          expression: 'speaking'
        })),
        lightingNotes: 'Character key lighting with soft fill',
        propsNeeded: [],
        durationSeconds: Math.ceil(dialogueChunk.reduce((sum, d) => sum + (d.line?.length || 0) * 0.05, 0)),
        dialogueText: dialogueChunk.map(d => `${d.character}: ${d.line}`).join(' '),
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
  options: StoryboardGenerationOptions
): Promise<string> {
  const { projectId, location, apiKey } = getVertexAICredentials();

  const characterInfo = characters.map(c =>
    `${c.name}: ${c.description || ''} - ${c.clay_features || 'claymation character'}`
  ).join('\n');

  const prompt = `You are a professional storyboard artist for claymation animation. Create a detailed visual description for this shot.

Script: ${script.title}
Scene Setting: ${scene.setting || 'Unknown'}
Scene Description: ${scene.description || ''}

Shot Details:
- Type: ${shot.shotType} (${SHOT_TYPES[shot.shotType as keyof typeof SHOT_TYPES] || shot.shotType})
- Camera Angle: ${shot.cameraAngle} (${CAMERA_ANGLES[shot.cameraAngle as keyof typeof CAMERA_ANGLES] || shot.cameraAngle})
- Camera Movement: ${shot.cameraMovement}
- Dialogue: ${shot.dialogueText || 'None'}
- Stage Directions: ${shot.stageDirections || 'None'}

Characters in this Series:
${characterInfo}

Visual Style: Claymation animation with handcrafted clay characters, tactile textures, and whimsical design. ${options.visualStyle || 'Bright, colorful, educational tone suitable for children ages 6-10.'}

Create a detailed shot description (2-3 sentences) that includes:
1. What is visible in the frame
2. Character positions, expressions, and actions
3. Important props or background elements
4. Lighting mood and color palette
5. Any special claymation effects or vocabulary word visualizations

Shot description:`;

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
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

export async function generateStoryboardForScript(
  scriptId: string,
  options: StoryboardGenerationOptions = {},
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  try {
    onProgress?.(0, 'Loading script and characters...');

    const { script, acts, characters } = await loadScriptWithDetails(scriptId);

    const { data: existingStoryboard } = await supabase
      .from('storyboards')
      .select('id')
      .eq('script_id', scriptId)
      .eq('status', 'completed')
      .maybeSingle();

    if (existingStoryboard) {
      throw new Error('A completed storyboard already exists for this script');
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

    onProgress?.(20, `Generating descriptions for ${allShots.length} shots...`);

    const shotsToInsert = [];
    for (let i = 0; i < allShots.length; i++) {
      const shot = allShots[i];
      const progress = 20 + (i / allShots.length) * 60;

      onProgress?.(progress, `Generating shot ${i + 1} of ${allShots.length}...`);

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
          options
        );

        const imagePrompt = buildImageGenerationPrompt(
          shot,
          enhancedDescription,
          script,
          options
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
          character_positions: shot.characterPositions,
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
          shot_movement: shot.cameraMovement,
          shot_description: shot.shotDescription,
          composition_notes: shot.compositionNotes,
          character_positions: shot.characterPositions,
          duration_seconds: shot.durationSeconds,
          dialogue_text: shot.dialogueText,
          generation_status: 'failed'
        });
      }
    }

    onProgress?.(85, 'Saving storyboard shots...');

    if (shotsToInsert.length > 0) {
      const { error: shotsError } = await supabase
        .from('storyboard_shots')
        .insert(shotsToInsert);

      if (shotsError) throw shotsError;
    }

    onProgress?.(95, 'Finalizing storyboard...');

    await supabase
      .from('storyboards')
      .update({
        status: 'completed',
        completed_shots: shotsToInsert.length,
        completed_at: new Date().toISOString()
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

    onProgress?.(100, 'Storyboard generation complete!');

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
