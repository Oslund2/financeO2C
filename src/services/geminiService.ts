import type { ProgramFormatConfig } from '../types/formatConfig';
import { calculateTotalBreakTime, formatTimecode as formatTimecodeUtil } from '../types/formatConfig';

interface Character {
  id: string;
  name: string;
  personality_traits: string[];
  role: string;
  voice_id?: string;
  image_url?: string;
}

interface VocabularyWord {
  word: string;
  definition: string;
  example_sentence?: string;
}

interface Episode {
  id: string;
  title: string;
  synopsis?: string;
  theme?: string;
  target_age_group?: string;
  vocabulary_words?: VocabularyWord[];
}

export interface GeneratedScene {
  scene_number: number;
  title: string;
  location: string;
  time_of_day: string;
  description: string;
  dialogue: Array<{
    character: string;
    line: string;
    stage_direction?: string;
  }>;
  duration_seconds: number;
  start_timecode: string;
  end_timecode: string;
  characters_present: string[];
  reusable_setup: boolean;
  claymation_notes?: string;
}

export interface GeneratedSegment {
  segment_number: number;
  title: string;
  description: string;
  start_timecode: string;
  end_timecode: string;
  duration_seconds: number;
  scenes: GeneratedScene[];
  break_after: boolean;
}

export interface GeneratedScript {
  title: string;
  synopsis: string;
  open_time: string;
  close_time: string;
  total_scripted_duration_seconds: number;
  segments: GeneratedSegment[];
  location_summary: Array<{
    location: string;
    scene_count: number;
    total_duration_seconds: number;
  }>;
}

export interface LocationSummary {
  location: string;
  scene_count: number;
  total_duration_seconds: number;
}

interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  tone?: string;
  pacing?: string;
}

const DEFAULT_OPTIONS: GenerationOptions = {
  temperature: 0.75,
  maxTokens: 32000,
  tone: 'educational and entertaining',
  pacing: 'moderate'
};

function isJsonComplete(jsonString: string): boolean {
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    else if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;
  }

  return braceCount === 0 && bracketCount === 0 && !inString;
}

function tryRepairTruncatedJson(jsonString: string): string | null {
  let repaired = jsonString.trim();

  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    else if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;
  }

  if (inString) {
    repaired += '"';
  }

  while (bracketCount > 0) {
    repaired += ']';
    bracketCount--;
  }

  while (braceCount > 0) {
    repaired += '}';
    braceCount--;
  }

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

function getGeminiAPIKey() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in environment variables.');
  }

  return apiKey;
}

function buildScriptGenerationPrompt(
  episode: Episode,
  characters: Character[],
  options: GenerationOptions,
  formatConfig?: ProgramFormatConfig
): string {
  const { tone, pacing } = { ...DEFAULT_OPTIONS, ...options };

  const config = formatConfig || {
    program_length_minutes: 22,
    total_episode_minutes: 30,
    break_structure: {
      segment_count: 4,
      break_positions: ['00:05:30', '00:11:00', '00:16:30'],
      break_durations: [120, 120, 120],
      break_types: ['commercial', 'commercial', 'commercial'],
      end_break_duration: 120,
    },
    format_type: 'broadcast',
    content_only_seconds: 22 * 60,
    total_seconds: 30 * 60,
  };

  const totalBreakSeconds = calculateTotalBreakTime(config.break_structure);
  const contentSeconds = config.content_only_seconds;
  const contentMinutes = config.program_length_minutes;
  const totalMinutes = config.total_episode_minutes;
  const segmentCount = config.break_structure.segment_count;

  const openingStingSeconds = 60;
  const closingStingSeconds = 30;
  const contentHoleSeconds = (totalMinutes * 60) - openingStingSeconds - closingStingSeconds;

  const openTime = formatTimecodeUtil(openingStingSeconds);
  const closeTime = formatTimecodeUtil((totalMinutes * 60) - closingStingSeconds);

  const segmentDurations: number[] = [];
  if (segmentCount === 1) {
    segmentDurations.push(contentSeconds);
  } else {
    const baseSegmentSeconds = Math.floor(contentSeconds / segmentCount);
    const lastSegmentExtra = contentSeconds - (baseSegmentSeconds * (segmentCount - 1));
    for (let i = 0; i < segmentCount - 1; i++) {
      segmentDurations.push(baseSegmentSeconds);
    }
    segmentDurations.push(lastSegmentExtra);
  }

  let currentTimecode = openingStingSeconds;
  const segmentTimings: Array<{
    segmentNumber: number;
    startTimecode: string;
    endTimecode: string;
    durationSeconds: number;
    breakAfter: boolean;
    breakDuration?: number;
  }> = [];

  for (let i = 0; i < segmentCount; i++) {
    const startTC = currentTimecode;
    currentTimecode += segmentDurations[i];
    const endTC = currentTimecode;

    const hasBreak = i < config.break_structure.break_durations.length;
    const breakDuration = hasBreak ? config.break_structure.break_durations[i] : 0;

    segmentTimings.push({
      segmentNumber: i + 1,
      startTimecode: formatTimecodeUtil(startTC),
      endTimecode: formatTimecodeUtil(endTC),
      durationSeconds: segmentDurations[i],
      breakAfter: hasBreak,
      breakDuration,
    });

    if (hasBreak) {
      currentTimecode += breakDuration;
    }
  }

  const characterDescriptions = characters
    .map(c => `- ${c.name} (${c.role}): ${c.personality_traits.join(', ')}`)
    .join('\n');

  const vocabularySection = episode.vocabulary_words && episode.vocabulary_words.length > 0
    ? `\nVocabulary words to naturally integrate:\n${episode.vocabulary_words.map(v => `- ${v.word}: ${v.definition}`).join('\n')}`
    : '';

  return `You are a professional children's animation scriptwriter specializing in claymation educational series.

Episode Information:
- Title: ${episode.title}
- Synopsis: ${episode.synopsis || 'To be determined'}
- Theme: ${episode.theme || 'General educational content'}
- Target Age: ${episode.target_age_group || '6-10 years'}
${vocabularySection}

Characters:
${characterDescriptions}

CRITICAL CHARACTER NAMING REQUIREMENTS:
- The teacher character's name is "Mrs. Higginbottom" (NO 'S' at the end - NOT "Mrs. Higginbottoms")
- She is lovingly referred to as "Mrs. H" by the students
- ALWAYS use "Mrs. Higginbottom" or "Mrs. H" - never add an 'S' to her last name

SHOW PREMISE & CHARACTER PORTRAYAL:
- The entire premise is that kids are SMART, COOL, and FUNNY
- Portray all student characters (except antagonists) as intelligent, witty, and genuinely likeable
- EXCEPTION: Chad and certain cameo characters may be antagonists and obstructors in the storylines
- Chad can be portrayed as smug, condescending, or a rival
- Other students should be clever, quick-witted, and demonstrate genuine intelligence and humor

================================================================================
EPISODE TIMING STRUCTURE (CRITICAL - MUST FOLLOW EXACTLY)
================================================================================

Total Episode TRT: ${formatTimecodeUtil(totalMinutes * 60)} (${totalMinutes * 60} seconds)
- Opening Sting: ${formatTimecodeUtil(openingStingSeconds)} (${openingStingSeconds} seconds) - NOT part of script
- Closing Sting: ${formatTimecodeUtil(closingStingSeconds)} (${closingStingSeconds} seconds) - NOT part of script
- Content Hole: ${formatTimecodeUtil(contentHoleSeconds)} (${contentHoleSeconds} seconds) - YOUR SCRIPT FILLS THIS

CONTENT HOLE BREAKDOWN:
- OPEN TIME: ${openTime} (script content begins after opening sting)
- CLOSE TIME: ${closeTime} (script content ends before closing sting)

${segmentCount > 1 ? `The content hole includes ${config.break_structure.break_durations.length} BREAK${config.break_structure.break_durations.length > 1 ? 'S' : ''} (${Math.floor(totalBreakSeconds / 60)}:${(totalBreakSeconds % 60).toString().padStart(2, '0')} total).` : 'This is a CONTINUOUS format with NO commercial breaks.'}
Your scripted content must be ${formatTimecodeUtil(contentSeconds)} (${contentSeconds} seconds) of actual dialogue and action.

${segmentCount === 1 ? 'SINGLE CONTINUOUS SEGMENT:' : `${segmentCount}-SEGMENT STRUCTURE:`}
${segmentTimings.map((seg, idx) => `${idx + 1}. SEGMENT ${seg.segmentNumber}: ~${formatTimecodeUtil(seg.durationSeconds)} (${seg.durationSeconds} seconds) - ${idx === 0 ? 'Setup/Introduction' : idx === segmentCount - 1 ? 'Resolution/Conclusion' : idx === 1 ? 'Rising Action' : 'Climax/Confrontation'}
   - Timecode: ${seg.startTimecode} to ${seg.endTimecode}${seg.breakAfter ? `\n   - [BREAK ${idx + 1}: ${Math.floor(seg.breakDuration! / 60)} minutes - ${seg.endTimecode} to ${formatTimecodeUtil(parseInt(seg.endTimecode.split(':')[0]) * 3600 + parseInt(seg.endTimecode.split(':')[1]) * 60 + parseInt(seg.endTimecode.split(':')[2]) + seg.breakDuration!)}]` : ''}`).join('\n\n')}

${segmentCount > 1 ? `BREAK POINT REQUIREMENTS:
- Each segment should end at a natural transition or mini-cliffhanger
- Segment 1 end: Hook the viewer - introduce the problem/mystery
${segmentCount > 2 ? '- Segment 2 end: Raise the stakes - complicate the situation' : ''}
${segmentCount > 3 ? '- Segment 3 end: Peak tension - just before resolution' : ''}
- Final Segment: Resolve everything satisfyingly` : 'CONTINUOUS FORMAT:\n- No break points needed\n- Tell the story in one smooth, continuous narrative\n- Maintain pacing without artificial cliffhangers'}

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

SCENE DURATION GUIDELINES:
- Short scene: 45-60 seconds (4-6 dialogue exchanges)
- Medium scene: 60-90 seconds (8-12 dialogue exchanges)
- Long scene: 90-150 seconds (12-20 dialogue exchanges)
- Each dialogue line averages 3-5 seconds when spoken

================================================================================
SCRIPT REQUIREMENTS
================================================================================

- Tone: ${tone}
- Pacing: ${pacing}
- Format: ${segmentCount}-segment structure ${segmentCount > 1 ? 'with breaks' : 'continuous'} in TABLE READ FORMAT
- Runtime: EXACTLY ${contentSeconds} SECONDS (${formatTimecodeUtil(contentSeconds)}) of scripted content
- Write in Table Read format suitable for printing and production use:
  * Use proper scene headings (INT./EXT., LOCATION, TIME OF DAY)
  * Character names should be clear and consistent
  * Include stage directions and parenthetical actions
  * Dialogue should be easy to read aloud at a table read
  * Include EXACT timecodes for each scene
- Each scene should include character dialogue with natural personality expression
- Integrate vocabulary words smoothly into conversations
- Include detailed stage directions for claymation production
- Keep dialogue age-appropriate but genuinely clever and engaging
- Students should demonstrate intelligence through their dialogue and problem-solving
- Make the kids witty and funny in natural, age-appropriate ways

================================================================================
JSON OUTPUT FORMAT
================================================================================

Generate a complete script in the following JSON format:

{
  "title": "Episode title",
  "synopsis": "Brief episode summary (2-3 sentences)",
  "open_time": "${openTime}",
  "close_time": "${closeTime}",
  "total_scripted_duration_seconds": ${contentSeconds},
  "segments": [
${segmentTimings.map((seg, idx) => `    {
      "segment_number": ${seg.segmentNumber},
      "title": "Segment ${seg.segmentNumber}: ${idx === 0 ? 'Setup' : idx === segmentCount - 1 ? 'Resolution' : idx === 1 ? 'Rising Action' : 'Climax'}",
      "description": "What happens in this segment",
      "start_timecode": "${seg.startTimecode}",
      "end_timecode": "${seg.endTimecode}",
      "duration_seconds": ${seg.durationSeconds},
      "break_after": ${seg.breakAfter},
      "scenes": [${idx === 0 ? `
        {
          "scene_number": 1,
          "title": "INT. CLASSROOM - MORNING",
          "location": "CLASSROOM",
          "time_of_day": "MORNING",
          "description": "Scene description and setting for table read",
          "start_timecode": "${seg.startTimecode}",
          "end_timecode": "...",
          "duration_seconds": 90,
          "characters_present": ["Mrs. Higginbottom", "Emma", "Marcus", "Lily"],
          "reusable_setup": true,
          "dialogue": [
            {
              "character": "Mrs. Higginbottom",
              "line": "Good morning, class! Today we have something exciting planned.",
              "stage_direction": "enters classroom, sets down colorful folder on desk"
            },
            {
              "character": "Emma",
              "line": "Is it about the science fair? I've been working on my hypothesis all week!",
              "stage_direction": "sits up eagerly, notebook ready"
            }
          ],
          "claymation_notes": "Wide establishing shot of classroom, then medium shots for dialogue. Show clay texture on desk surfaces."
        }
      ` : ' /* Add scenes here */ '}]
    }${idx < segmentCount - 1 ? ',' : ''}`).join('\n')}
  ],
  "location_summary": [
    {
      "location": "CLASSROOM",
      "scene_count": 4,
      "total_duration_seconds": 320
    },
    {
      "location": "HALLWAY",
      "scene_count": 2,
      "total_duration_seconds": 150
    }
  ]
}

================================================================================
CRITICAL REMINDERS
================================================================================

1. TIMING IS NON-NEGOTIABLE: Total scripted content must be ${contentSeconds} seconds (${formatTimecodeUtil(contentSeconds)})
2. Each segment must have multiple scenes with 8+ dialogue exchanges each
3. Include ALL ${segmentCount} segment${segmentCount > 1 ? 's' : ''} with scenes filled in (not empty arrays)
4. Use "Mrs. Higginbottom" (no S) or "Mrs. H" - this is critical
5. Make the kids genuinely smart, cool, and funny through their dialogue
6. Chad and antagonist characters are the exception - they can be portrayed differently
7. Each scene must have accurate timecodes that add up correctly
8. Location_summary must reflect actual locations used in the script
9. ${segmentCount > 1 ? 'End each segment (except the last) with a hook or mini-cliffhanger' : 'Maintain smooth pacing throughout the continuous segment'}

Generate the complete script now with ALL segments and scenes filled in:`;
}

export async function generateScriptWithGemini(
  episode: Episode,
  characters: Character[],
  options: GenerationOptions = {},
  signal?: AbortSignal,
  formatConfig?: ProgramFormatConfig
): Promise<GeneratedScript> {
  try {
    const apiKey = getGeminiAPIKey();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const prompt = buildScriptGenerationPrompt(episode, characters, mergedOptions, formatConfig);

    console.log('Starting script generation...');
    console.log('Prompt length:', prompt.length, 'characters');
    console.log('Characters:', characters.length);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: mergedOptions.temperature,
        maxOutputTokens: mergedOptions.maxTokens,
        topP: 0.95,
        topK: 40,
        responseMimeType: 'application/json'
      }
    };

    console.log('Sending request to Gemini API...');
    const requestStartTime = Date.now();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal
    });

    const requestDuration = Date.now() - requestStartTime;
    console.log('Request completed in', requestDuration, 'ms');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', response.status, response.statusText, errorData);

      if (response.status === 429) {
        throw new Error('QUOTA_EXCEEDED');
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('INVALID_API_KEY');
      }

      if (response.status >= 500) {
        throw new Error('SERVER_ERROR');
      }

      throw new Error(`API_ERROR: ${response.status} ${response.statusText}`);
    }

    console.log('Parsing response...');
    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('EMPTY_RESPONSE');
    }

    const candidate = data.candidates[0];
    const finishReason = candidate.finishReason;

    if (finishReason === 'MAX_TOKENS') {
      console.warn('Response was truncated due to max tokens limit');
      throw new Error('TRUNCATED_RESPONSE');
    }

    const textContent = candidate.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error('No text content in response');
      throw new Error('EMPTY_RESPONSE');
    }

    console.log('Response length:', textContent.length, 'characters');

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON object found in response');
      throw new Error('INVALID_JSON');
    }

    let jsonString = jsonMatch[0];

    if (!isJsonComplete(jsonString)) {
      console.warn('Detected incomplete JSON, attempting repair...');
      const repaired = tryRepairTruncatedJson(jsonString);
      if (repaired) {
        console.log('JSON repair successful');
        jsonString = repaired;
      } else {
        console.error('JSON repair failed - response appears truncated');
        throw new Error('TRUNCATED_RESPONSE');
      }
    }

    let parsedScript;
    try {
      parsedScript = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('TRUNCATED_RESPONSE');
    }

    const generatedScript: GeneratedScript = convertLegacyScript(parsedScript, formatConfig);

    console.log('Script generated successfully');
    console.log('Segments:', generatedScript.segments.length);
    console.log('Total duration:', generatedScript.total_scripted_duration_seconds, 'seconds');

    validateGeneratedScript(generatedScript, formatConfig);

    return generatedScript;

  } catch (error) {
    console.error('Script generation error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Request was aborted/timed out');
        throw new Error('TIMEOUT');
      }

      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        console.error('Network connectivity issue');
        throw new Error('NETWORK_ERROR');
      }

      throw error;
    }
    throw new Error('UNKNOWN_ERROR');
  }
}

function validateGeneratedScript(script: GeneratedScript, formatConfig?: ProgramFormatConfig): void {
  if (!script.title || !script.synopsis || !script.segments) {
    throw new Error('Invalid script structure: missing required fields');
  }

  if (!script.open_time || !script.close_time) {
    throw new Error('Script must include open_time and close_time');
  }

  const config = formatConfig || {
    program_length_minutes: 22,
    total_episode_minutes: 30,
    break_structure: {
      segment_count: 4,
      break_positions: ['00:05:30', '00:11:00', '00:16:30'],
      break_durations: [120, 120, 120],
      break_types: ['commercial', 'commercial', 'commercial'],
      end_break_duration: 120,
    },
    format_type: 'broadcast',
    content_only_seconds: 22 * 60,
    total_seconds: 30 * 60,
  };

  const expectedSegments = config.break_structure.segment_count;
  const targetSeconds = config.content_only_seconds;

  if (script.segments.length !== expectedSegments) {
    throw new Error(`Script must have exactly ${expectedSegments} segment${expectedSegments > 1 ? 's' : ''}`);
  }

  let totalScriptedDuration = 0;
  let totalDialogueLines = 0;

  script.segments.forEach((segment, index) => {
    if (!segment.title || !segment.description || !segment.scenes || segment.scenes.length === 0) {
      throw new Error(`Invalid structure in segment ${index + 1}: missing fields or empty scenes`);
    }

    if (!segment.start_timecode || !segment.end_timecode) {
      throw new Error(`Segment ${index + 1} missing timecodes`);
    }

    let segmentDuration = 0;

    segment.scenes.forEach((scene, sceneIndex) => {
      if (!scene.title || !scene.dialogue || scene.dialogue.length === 0) {
        throw new Error(`Invalid structure in segment ${index + 1}, scene ${sceneIndex + 1}`);
      }

      if (!scene.location || !scene.time_of_day) {
        throw new Error(`Scene ${scene.scene_number || sceneIndex + 1} missing location or time_of_day`);
      }

      if (!scene.duration_seconds || scene.duration_seconds < 30) {
        throw new Error(`Scene ${scene.scene_number || sceneIndex + 1} has invalid duration`);
      }

      segmentDuration += scene.duration_seconds;
      totalDialogueLines += scene.dialogue.length;
    });

    totalScriptedDuration += segmentDuration;

    if (index < expectedSegments - 1 && !segment.break_after && expectedSegments > 1) {
      console.warn(`Segment ${index + 1} should have break_after: true`);
    }
  });

  const minDuration = Math.max(30, targetSeconds * 0.8);
  const maxDuration = targetSeconds * 1.15;

  if (totalScriptedDuration < minDuration) {
    throw new Error(`Script is too short: ${totalScriptedDuration} seconds. Minimum is ${Math.floor(minDuration)} seconds (target: ${targetSeconds} seconds)`);
  }

  if (totalScriptedDuration > maxDuration) {
    throw new Error(`Script is too long: ${totalScriptedDuration} seconds. Maximum is ${Math.floor(maxDuration)} seconds (target: ${targetSeconds} seconds)`);
  }

  const minDialogueLines = Math.max(10, Math.floor(targetSeconds / 22));
  const recommendedDialogueLines = Math.floor(targetSeconds / 15);

  if (totalDialogueLines < minDialogueLines) {
    throw new Error(`Script has too few dialogue lines: ${totalDialogueLines}. Minimum is ${minDialogueLines} lines for proper pacing.`);
  }

  if (totalDialogueLines < recommendedDialogueLines) {
    console.warn(`Script has only ${totalDialogueLines} dialogue lines. Consider adding more for better pacing (recommended: ${recommendedDialogueLines}+)`);
  }

  if (Math.abs(totalScriptedDuration - targetSeconds) > 60) {
    console.warn(`Script duration (${totalScriptedDuration}s) differs from target (${targetSeconds}s) by more than 60 seconds`);
  }
}

function convertLegacyScript(legacyScript: any, formatConfig?: ProgramFormatConfig): GeneratedScript {
  if (legacyScript.segments) {
    return legacyScript as GeneratedScript;
  }

  if (!legacyScript.acts) {
    throw new Error('Invalid script format: no acts or segments found');
  }

  const config = formatConfig || {
    program_length_minutes: 22,
    total_episode_minutes: 30,
    break_structure: {
      segment_count: 4,
      break_positions: ['00:05:30', '00:11:00', '00:16:30'],
      break_durations: [120, 120, 120],
      break_types: ['commercial', 'commercial', 'commercial'],
      end_break_duration: 120,
    },
    format_type: 'broadcast',
    content_only_seconds: 22 * 60,
    total_seconds: 30 * 60,
  };

  const segmentCount = config.break_structure.segment_count;
  const contentSeconds = config.content_only_seconds;
  const segmentDuration = Math.floor(contentSeconds / segmentCount);

  let globalSceneNumber = 1;
  let currentTimecode = 60;

  const segments: GeneratedSegment[] = [];
  const locationMap = new Map<string, { scene_count: number; total_duration_seconds: number }>();

  const segmentTargets: number[] = [];
  for (let i = 0; i < segmentCount - 1; i++) {
    segmentTargets.push(segmentDuration);
  }
  segmentTargets.push(contentSeconds - (segmentDuration * (segmentCount - 1)));

  const segmentNames = ['Setup', 'Rising Action', 'Climax', 'Resolution'];

  legacyScript.acts.forEach((act: any, actIndex: number) => {
    const segmentDuration = segmentTargets[actIndex] || 210;
    const startTimecode = currentTimecode;

    const scenes: GeneratedScene[] = (act.scenes || []).map((scene: any, sceneIndex: number) => {
      const sceneDuration = scene.duration_estimate || scene.duration_seconds || 90;
      const sceneStartTimecode = currentTimecode;
      currentTimecode += sceneDuration;

      const location = extractLocation(scene.title || scene.location || 'UNKNOWN');
      const timeOfDay = extractTimeOfDay(scene.title || 'DAY');

      if (locationMap.has(location)) {
        const loc = locationMap.get(location)!;
        loc.scene_count++;
        loc.total_duration_seconds += sceneDuration;
      } else {
        locationMap.set(location, { scene_count: 1, total_duration_seconds: sceneDuration });
      }

      return {
        scene_number: globalSceneNumber++,
        title: scene.title || `Scene ${sceneIndex + 1}`,
        location,
        time_of_day: timeOfDay,
        description: scene.description || '',
        start_timecode: formatTimecode(sceneStartTimecode),
        end_timecode: formatTimecode(currentTimecode),
        duration_seconds: sceneDuration,
        characters_present: extractCharacters(scene),
        reusable_setup: sceneIndex === 0,
        dialogue: scene.dialogue || [],
        claymation_notes: scene.claymation_notes
      };
    });

    const hasBreak = actIndex < config.break_structure.break_durations.length;
    const breakDuration = hasBreak ? config.break_structure.break_durations[actIndex] : 0;

    if (hasBreak) {
      currentTimecode += breakDuration;
    }

    segments.push({
      segment_number: actIndex + 1,
      title: `Segment ${actIndex + 1}: ${segmentNames[actIndex] || 'Continuation'}`,
      description: act.description || '',
      start_timecode: formatTimecode(startTimecode),
      end_timecode: formatTimecode(startTimecode + segmentDuration),
      duration_seconds: segmentDuration,
      scenes,
      break_after: hasBreak
    });
  });

  if (segments.length < segmentCount) {
    for (let i = segments.length; i < segmentCount; i++) {
      const hasBreak = i < config.break_structure.break_durations.length;
      const breakDuration = hasBreak ? config.break_structure.break_durations[i] : 0;

      segments.push({
        segment_number: i + 1,
        title: `Segment ${i + 1}: ${segmentNames[i] || 'Continuation'}`,
        description: 'Additional segment',
        start_timecode: formatTimecode(currentTimecode),
        end_timecode: formatTimecode(currentTimecode + segmentTargets[i]),
        duration_seconds: segmentTargets[i],
        scenes: [],
        break_after: hasBreak
      });
      currentTimecode += segmentTargets[i] + (hasBreak ? breakDuration : 0);
    }
  }

  const locationSummary = Array.from(locationMap.entries()).map(([location, data]) => ({
    location,
    scene_count: data.scene_count,
    total_duration_seconds: data.total_duration_seconds
  }));

  return {
    title: legacyScript.title,
    synopsis: legacyScript.synopsis,
    open_time: '00:01:00',
    close_time: '00:21:30',
    total_scripted_duration_seconds: segments.reduce((sum, seg) => sum + seg.duration_seconds, 0),
    segments,
    location_summary: locationSummary
  };
}

function extractLocation(sceneTitle: string): string {
  const match = sceneTitle.match(/(?:INT\.|EXT\.)\s*([A-Z\s]+?)(?:\s*-|$)/i);
  if (match) {
    return match[1].trim().toUpperCase();
  }
  return 'UNKNOWN';
}

function extractTimeOfDay(sceneTitle: string): string {
  const title = sceneTitle.toUpperCase();
  if (title.includes('MORNING')) return 'MORNING';
  if (title.includes('AFTERNOON')) return 'AFTERNOON';
  if (title.includes('EVENING') || title.includes('NIGHT')) return 'EVENING';
  if (title.includes('DAY')) return 'AFTERNOON';
  return 'AFTERNOON';
}

function extractCharacters(scene: any): string[] {
  if (scene.characters_present) return scene.characters_present;
  if (scene.dialogue && Array.isArray(scene.dialogue)) {
    const characters = new Set<string>();
    scene.dialogue.forEach((d: any) => {
      if (d.character) characters.add(d.character);
    });
    return Array.from(characters);
  }
  return [];
}

function formatTimecode(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export interface GenerateTextOptions {
  maxTokens?: number;
  temperature?: number;
}

const PATENT_TOKEN_LIMITS: Record<string, number> = {
  'patent_specification_field': 1000,
  'patent_specification_background': 3000,
  'patent_specification_summary': 4000,
  'patent_specification_detailed': 8192,
  'patent_abstract_generation': 1000,
  'patent_section_regeneration': 8192,
  'patent_claims_generation': 6000,
  'patent_feature_extraction': 4000,
  'cpc_classification': 2000,
};

export async function generateText(
  prompt: string,
  featureArea?: string,
  options?: GenerateTextOptions
): Promise<string> {
  try {
    const apiKey = getGeminiAPIKey();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const defaultMaxTokens = featureArea && PATENT_TOKEN_LIMITS[featureArea]
      ? PATENT_TOKEN_LIMITS[featureArea]
      : 2000;

    const maxTokens = options?.maxTokens ?? defaultMaxTokens;
    const temperature = options?.temperature ?? 0.3;

    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini');
    }

    const textContent = data.candidates[0].content.parts[0].text;
    return textContent;

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Text generation failed: ${error.message}`);
    }
    throw new Error('Text generation failed with unknown error');
  }
}

export function checkGeminiConfiguration(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    missing.push('VITE_GEMINI_API_KEY');
  }

  return {
    configured: missing.length === 0,
    missing
  };
}

export const checkVertexAIConfiguration = checkGeminiConfiguration;
