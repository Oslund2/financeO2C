import { supabase } from '../lib/supabase';

export interface DialogueLine {
  character_id: string;
  character_name: string;
  text: string;
  voice_provider: 'elevenlabs' | 'chatterbox';
  voice_id: string;
  estimated_duration_seconds: number;
  order: number;
}

export interface ExtractedDialogue {
  lines: DialogueLine[];
  total_duration_seconds: number;
  character_count: number;
}

const AVERAGE_WORDS_PER_MINUTE = 150;
const PAUSE_BETWEEN_LINES = 0.5;

export async function extractDialogueFromScript(
  scriptContent: string,
  seriesId: string
): Promise<ExtractedDialogue> {
  const characters = await getSeriesCharacters(seriesId);
  const characterMap = new Map(
    characters.map(c => [c.name.toLowerCase(), c])
  );

  const lines: DialogueLine[] = [];
  let orderCounter = 0;

  const dialoguePattern = /^([A-Z][A-Z\s]+):\s*(.+)$/gm;
  let match;

  while ((match = dialoguePattern.exec(scriptContent)) !== null) {
    const characterName = match[1].trim();
    const dialogueText = match[2].trim();

    const character = characterMap.get(characterName.toLowerCase());

    if (character) {
      const wordCount = dialogueText.split(/\s+/).length;
      const estimatedDuration = (wordCount / AVERAGE_WORDS_PER_MINUTE) * 60;

      lines.push({
        character_id: character.id,
        character_name: character.name,
        text: dialogueText,
        voice_provider: character.voice_provider || 'elevenlabs',
        voice_id: character.voice_provider === 'chatterbox'
          ? character.chatterbox_voice_id || ''
          : character.eleven_labs_voice_id || '',
        estimated_duration_seconds: estimatedDuration,
        order: orderCounter++
      });
    }
  }

  const totalDuration = lines.reduce(
    (sum, line) => sum + line.estimated_duration_seconds + PAUSE_BETWEEN_LINES,
    0
  );

  const uniqueCharacters = new Set(lines.map(l => l.character_id));

  return {
    lines,
    total_duration_seconds: totalDuration,
    character_count: uniqueCharacters.size
  };
}

export async function extractDialogueFromScene(
  sceneDialogue: any,
  seriesId: string
): Promise<ExtractedDialogue> {
  if (typeof sceneDialogue === 'string') {
    return extractDialogueFromScript(sceneDialogue, seriesId);
  }

  if (Array.isArray(sceneDialogue)) {
    const characters = await getSeriesCharacters(seriesId);
    const characterMap = new Map(
      characters.map(c => [c.id, c])
    );

    const lines: DialogueLine[] = sceneDialogue.map((line: any, index: number) => {
      const character = characterMap.get(line.character_id);

      if (!character) {
        return null;
      }

      const wordCount = line.text.split(/\s+/).length;
      const estimatedDuration = (wordCount / AVERAGE_WORDS_PER_MINUTE) * 60;

      return {
        character_id: character.id,
        character_name: character.name,
        text: line.text,
        voice_provider: character.voice_provider || 'elevenlabs',
        voice_id: character.voice_provider === 'chatterbox'
          ? character.chatterbox_voice_id || ''
          : character.eleven_labs_voice_id || '',
        estimated_duration_seconds: estimatedDuration,
        order: index
      };
    }).filter(Boolean) as DialogueLine[];

    const totalDuration = lines.reduce(
      (sum, line) => sum + line.estimated_duration_seconds + PAUSE_BETWEEN_LINES,
      0
    );

    const uniqueCharacters = new Set(lines.map(l => l.character_id));

    return {
      lines,
      total_duration_seconds: totalDuration,
      character_count: uniqueCharacters.size
    };
  }

  return {
    lines: [],
    total_duration_seconds: 0,
    character_count: 0
  };
}

async function getSeriesCharacters(seriesId: string) {
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, voice_provider, eleven_labs_voice_id, chatterbox_voice_id')
    .eq('series_id', seriesId);

  if (error) {
    console.error('Error fetching characters:', error);
    return [];
  }

  return data || [];
}

export function formatDialogueForPrompt(dialogue: ExtractedDialogue): string {
  if (dialogue.lines.length === 0) {
    return '';
  }

  const formatted = dialogue.lines.map(line => {
    const voiceInfo = `[${line.voice_provider}: ${line.voice_id}]`;
    return `${line.character_name} ${voiceInfo}: "${line.text}"`;
  }).join('\n');

  return `\n\nDialogue:\n${formatted}`;
}

export function calculateTotalShotDuration(
  baseDuration: number,
  dialogueDuration: number,
  natSoundDuration: number = 0
): number {
  return Math.max(baseDuration, dialogueDuration + natSoundDuration);
}

export async function assignDialogueToShot(
  shotId: string,
  scriptContent: string,
  seriesId: string
): Promise<void> {
  const dialogue = await extractDialogueFromScript(scriptContent, seriesId);

  const { error } = await supabase
    .from('production_shot_plans')
    .update({
      dialogue_content: dialogue.lines
    })
    .eq('id', shotId);

  if (error) {
    throw new Error(`Failed to assign dialogue to shot: ${error.message}`);
  }
}

export async function bulkAssignDialogue(
  episodeId: string,
  seriesId: string
): Promise<{ success: number; failed: number }> {
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('script_id')
    .eq('id', episodeId)
    .maybeSingle();

  if (episodeError || !episode?.script_id) {
    throw new Error('Episode or script not found');
  }

  const { data: script, error: scriptError } = await supabase
    .from('scripts')
    .select('content')
    .eq('id', episode.script_id)
    .maybeSingle();

  if (scriptError || !script?.content) {
    throw new Error('Script content not found');
  }

  const { data: shots, error: shotsError } = await supabase
    .from('production_shot_plans')
    .select('id, narrative_description')
    .eq('episode_id', episodeId);

  if (shotsError || !shots) {
    throw new Error('Failed to fetch shots');
  }

  let success = 0;
  let failed = 0;

  for (const shot of shots) {
    try {
      const relevantContent = shot.narrative_description || script.content;
      const dialogue = await extractDialogueFromScript(relevantContent, seriesId);

      await supabase
        .from('production_shot_plans')
        .update({
          dialogue_content: dialogue.lines
        })
        .eq('id', shot.id);

      success++;
    } catch (err) {
      console.error(`Failed to assign dialogue to shot ${shot.id}:`, err);
      failed++;
    }
  }

  return { success, failed };
}
