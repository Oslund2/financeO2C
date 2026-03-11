import type { ProgramFormatConfig } from '../types/formatConfig';
import { calculateTotalBreakTime, formatTimecode as formatTimecodeUtil } from '../types/formatConfig';

type WorkspaceType = 'claymation' | 'photoreal' | null;

interface Character {
  id: string;
  name: string;
  personality_traits: string[];
  role: string;
  aliases?: string[];
  tags?: string[];
  description?: string;
  voice_id?: string;
  image_url?: string;
}

interface PhotorealScriptOptions {
  historicalPeriod?: string;
  keyFigures?: string;
  documentaryStyle?: 'narrative' | 'biographical' | 'investigative' | 'archival';
  includeCitations?: boolean;
  tone?: string;
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
  maxTokens: 65536,
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

// After brace-repair, strip any trailing incomplete segments/scenes/dialogue lines
// so that a truncated response still yields a usable (shorter) script.
function cleanupIncompleteScript(data: any): any {
  if (!data || !Array.isArray(data.segments)) return data;

  data.segments = data.segments
    .map((seg: any) => {
      if (!seg || !Array.isArray(seg.scenes)) return null;

      seg.scenes = seg.scenes
        .map((scene: any) => {
          if (!scene || !Array.isArray(scene.dialogue)) return null;
          // Remove dialogue lines missing character or line text
          scene.dialogue = scene.dialogue.filter(
            (d: any) => d && typeof d.character === 'string' && d.character && typeof d.line === 'string' && d.line
          );
          return scene.dialogue.length > 0 ? scene : null;
        })
        .filter(Boolean);

      // Fill in sensible defaults for missing fields so validator won't reject
      seg.scenes.forEach((scene: any) => {
        if (!scene.duration_seconds || scene.duration_seconds < 30) {
          scene.duration_seconds = Math.max(30, scene.dialogue.length * 4);
        }
        if (!scene.location) scene.location = 'LOCATION';
        if (!scene.time_of_day) scene.time_of_day = 'MORNING';
        if (!scene.title) scene.title = 'Scene';
      });

      return seg.scenes.length > 0 ? seg : null;
    })
    .filter(Boolean);

  // Ensure every segment has required fields
  data.segments.forEach((seg: any, i: number) => {
    if (!seg.title) seg.title = `Segment ${i + 1}`;
    if (!seg.description) seg.description = '';
    if (!seg.start_timecode) seg.start_timecode = '00:00:00';
    if (!seg.end_timecode) seg.end_timecode = '00:00:00';
  });

  // Ensure top-level required fields exist
  if (!data.open_time) data.open_time = '00:01:00';
  if (!data.close_time) data.close_time = '00:29:30';
  if (!data.synopsis) data.synopsis = '';

  return data;
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

  // Build rich character profiles from everything we know about each character
  const characterDescriptions = characters
    .map(c => {
      const parts = [`- ${c.name} (${c.role})`];
      if (c.personality_traits && c.personality_traits.length > 0) parts.push(`Personality: ${c.personality_traits.join(', ')}`);
      if (c.description) parts.push(`Description: ${c.description}`);
      if (c.aliases && c.aliases.length > 0) parts.push(`Also known as: ${c.aliases.join(', ')}`);
      if (c.tags && c.tags.length > 0) parts.push(`Tags: ${c.tags.join(', ')}`);
      return parts.join(' | ');
    })
    .join('\n');

  // Derive naming rules from each character's aliases (e.g. "Mrs. Higginbottom" → "Mrs. H")
  const characterNamingRules = characters
    .filter(c => c.aliases && c.aliases.length > 0)
    .map(c => `- "${c.name}" may also be referred to as: ${c.aliases!.join(', ')} — use these names consistently and exactly as shown`)
    .join('\n');

  // Derive antagonist / role guidance from tags
  const antagonistChars = characters.filter(c =>
    c.tags?.some(t => ['antagonist', 'villain', 'rival', 'bully', 'opposition'].includes(t.toLowerCase())) ||
    c.role?.toLowerCase() === 'cameo'
  );
  const antagonistNote = antagonistChars.length > 0
    ? `- Characters tagged as antagonists or rivals (${antagonistChars.map(c => c.name).join(', ')}) may be portrayed as obstructors or foils to the main characters.`
    : '';

  const vocabularySection = episode.vocabulary_words && episode.vocabulary_words.length > 0
    ? `\nVocabulary words to naturally integrate:\n${episode.vocabulary_words.map(v => `- ${v.word}: ${v.definition}`).join('\n')}`
    : '';

  // Use actual character names for the example JSON snippet
  const exChars = characters.slice(0, 4).map(c => c.name);
  const exChar0 = exChars[0] || 'Character A';
  const exChar1 = exChars[1] || 'Character B';

  return `You are a professional children's animation scriptwriter specializing in claymation educational series.

Episode Information:
- Title: ${episode.title}
- Synopsis: ${episode.synopsis || 'To be determined'}
- Theme: ${episode.theme || 'General educational content'}
- Target Age: ${episode.target_age_group || '6-10 years'}
${vocabularySection}

================================================================================
AUTHORISED CAST — STRICT SERIES FIREWALL
================================================================================

ONLY the following ${characters.length} character${characters.length !== 1 ? 's' : ''} exist in this series. You MUST NOT introduce, reference, or name any character not in this list — not even as a background extra or unnamed role. Every speaking character and every name mentioned in dialogue MUST appear below:

${characterDescriptions}

${characterNamingRules ? `CHARACTER NAMING RULES (derived from official aliases):\n${characterNamingRules}\n` : ''}${antagonistNote ? `CHARACTER ROLE NOTES:\n${antagonistNote}\n` : ''}CHARACTER PORTRAYAL GUIDELINES:
- Portray each character according to their personality description above
- Keep personalities consistent with the tags and descriptions provided
- Do not invent personality traits not established in the character profiles above

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
- Include a specific "location" field describing the setting (e.g. a real place name, room, or environment appropriate to this episode's story — not limited to any predefined list)
- Include "time_of_day" field: MORNING, AFTERNOON, or EVENING
- List all "characters_present" in each scene — only names from the Authorised Cast above
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
          "title": "INT. [LOCATION] - MORNING",
          "location": "[LOCATION APPROPRIATE TO THIS EPISODE]",
          "time_of_day": "MORNING",
          "description": "Scene description and setting for table read",
          "start_timecode": "${seg.startTimecode}",
          "end_timecode": "...",
          "duration_seconds": 90,
          "characters_present": ${JSON.stringify(exChars)},
          "reusable_setup": true,
          "dialogue": [
            {
              "character": "${exChar0}",
              "line": "[Opening line appropriate to this character and episode]",
              "stage_direction": "[Stage direction for ${exChar0}]"
            },
            {
              "character": "${exChar1}",
              "line": "[Response line appropriate to this character]",
              "stage_direction": "[Stage direction for ${exChar1}]"
            }
          ],
          "claymation_notes": "Wide establishing shot, then medium shots for dialogue. Show clay texture on surfaces."
        }
      ` : ' /* Add scenes here */ '}]
    }${idx < segmentCount - 1 ? ',' : ''}`).join('\n')}
  ],
  "location_summary": [
    {
      "location": "[ACTUAL LOCATION USED IN YOUR SCRIPT]",
      "scene_count": 4,
      "total_duration_seconds": 320
    },
    {
      "location": "[SECOND LOCATION IF USED]",
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
4. SERIES FIREWALL — ABSOLUTE RULE: Only use characters from the Authorised Cast list. Zero exceptions. If the episode calls for a role not covered by the cast, give that function to an existing cast member.
5. Use each character's exact name (and aliases if listed) as shown in the Authorised Cast — never shorten, misspell, or pluralise a character's name in an unintended way
6. Portray characters consistent with their personality descriptions — do not invent traits
7. Each scene must have accurate timecodes that add up correctly
8. Location_summary must reflect actual locations used in the script
9. ${segmentCount > 1 ? 'End each segment (except the last) with a hook or mini-cliffhanger' : 'Maintain smooth pacing throughout the continuous segment'}

Generate the complete script now with ALL segments and scenes filled in:`;
}

function buildPhotorealScriptPrompt(
  episode: Episode,
  characters: Character[],
  options: GenerationOptions,
  formatConfig?: ProgramFormatConfig,
  photorealOptions?: PhotorealScriptOptions
): string {
  const { tone } = { ...DEFAULT_OPTIONS, ...options };

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
  const totalMinutes = config.total_episode_minutes;
  const segmentCount = config.break_structure.segment_count;

  const openingStingSeconds = 60;
  const closingStingSeconds = 30;

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
  const chapterTimings: Array<{
    chapterNumber: number;
    title: string;
    startTimecode: string;
    endTimecode: string;
    durationSeconds: number;
    breakAfter: boolean;
    breakDuration?: number;
  }> = [];

  const chapterTitles = [
    'Opening Hook',
    'Historical Context',
    'Key Events',
    'Analysis & Impact',
    'Legacy & Conclusion'
  ];

  for (let i = 0; i < segmentCount; i++) {
    const startTC = currentTimecode;
    currentTimecode += segmentDurations[i];
    const endTC = currentTimecode;

    const hasBreak = i < config.break_structure.break_durations.length;
    const breakDuration = hasBreak ? config.break_structure.break_durations[i] : 0;

    chapterTimings.push({
      chapterNumber: i + 1,
      title: chapterTitles[i] || `Chapter ${i + 1}`,
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

  const historicalFiguresSection = characters.length > 0
    ? `\nHistorical Figures/Interview Subjects:\n${characters.map(c => `- ${c.name}: ${c.personality_traits.join(', ')}`).join('\n')}`
    : '';

  const keyFiguresSection = photorealOptions?.keyFigures
    ? `\nKey Historical Figures to Feature: ${photorealOptions.keyFigures}`
    : '';

  const periodSection = photorealOptions?.historicalPeriod
    ? `\nHistorical Period: ${photorealOptions.historicalPeriod}`
    : '';

  const documentaryStyleMap: Record<string, string> = {
    narrative: 'Story-driven documentary with dramatic narrative arc, emotional beats, and engaging storytelling',
    biographical: 'Focus on the life and impact of key historical figures, personal stories and legacy',
    investigative: 'Uncovering hidden history, presenting multiple perspectives, evidence-based analysis',
    archival: 'Primary source centered, heavy use of historical records, documents, and artifacts'
  };

  const styleDescription = documentaryStyleMap[photorealOptions?.documentaryStyle || 'narrative'];

  const toneMap: Record<string, string> = {
    balanced: 'Objective and measured, presenting facts without sensationalism',
    somber: 'Respectful and contemplative, acknowledging the weight of historical events',
    triumphant: 'Inspiring and uplifting, celebrating achievements and progress',
    analytical: 'Academic and detailed, thorough examination of causes and effects'
  };

  const toneDescription = toneMap[photorealOptions?.tone || 'balanced'];

  return `You are a professional documentary scriptwriter specializing in historical documentaries for premium streaming platforms.

Episode Information:
- Title: ${episode.title}
- Synopsis: ${episode.synopsis || 'To be determined based on historical research'}
- Theme: ${episode.theme || 'Historical documentary'}
- Target Audience: Adult general audience interested in history
${periodSection}
${keyFiguresSection}
${historicalFiguresSection}

DOCUMENTARY STYLE: ${styleDescription}
TONE: ${toneDescription}

================================================================================
DOCUMENTARY SCRIPT STRUCTURE (CHAPTER-BASED FORMAT)
================================================================================

This is a HISTORICAL DOCUMENTARY, NOT animated children's content.
- Use [NARRATOR] as the primary voice throughout
- Historical figures speak through [ARCHIVAL] quotes or [DRAMATIZATION] recreations
- Include [B-ROLL] markers for visual cutaway suggestions
${photorealOptions?.includeCitations ? '- Include [CITATION: source] markers for factual claims that need verification' : ''}

Total Episode TRT: ${formatTimecodeUtil(totalMinutes * 60)} (${totalMinutes * 60} seconds)
- Opening Sting: ${formatTimecodeUtil(openingStingSeconds)} (${openingStingSeconds} seconds) - NOT part of script
- Closing Sting: ${formatTimecodeUtil(closingStingSeconds)} (${closingStingSeconds} seconds) - NOT part of script
- Content: ${formatTimecodeUtil(contentSeconds)} (${contentSeconds} seconds) - YOUR SCRIPT FILLS THIS

OPEN TIME: ${openTime} | CLOSE TIME: ${closeTime}

${segmentCount > 1 ? `The content includes ${config.break_structure.break_durations.length} BREAK${config.break_structure.break_durations.length > 1 ? 'S' : ''} (${Math.floor(totalBreakSeconds / 60)}:${(totalBreakSeconds % 60).toString().padStart(2, '0')} total).` : 'This is a CONTINUOUS format with NO commercial breaks.'}

CHAPTER STRUCTURE:
${chapterTimings.map((ch, idx) => `${idx + 1}. CHAPTER ${ch.chapterNumber}: "${ch.title}" - ${formatTimecodeUtil(ch.durationSeconds)} (${ch.durationSeconds} seconds)
   - Timecode: ${ch.startTimecode} to ${ch.endTimecode}${ch.breakAfter ? `\n   - [BREAK: ${Math.floor(ch.breakDuration! / 60)} minutes]` : ''}`).join('\n\n')}

================================================================================
DOCUMENTARY DIALOGUE FORMATTING
================================================================================

Use these dialogue markers:
- [NARRATOR]: Main documentary narrator voice - authoritative, engaging, professional
- [ARCHIVAL]: Direct quotes from historical figures (sourced from documents, speeches, letters)
- [DRAMATIZATION]: Recreated dialogue for dramatic scenes (clearly labeled as interpretation)
- [INTERVIEW]: Modern expert or witness interviews (if applicable)

Each dialogue entry should include:
- character: The speaker type (NARRATOR, ARCHIVAL, DRAMATIZATION, or character name)
- line: The spoken text
- stage_direction: Visual context or B-roll suggestions

================================================================================
SCENE REQUIREMENTS FOR PHOTOREAL VIDEO GENERATION
================================================================================

- Location descriptions should be historically accurate for the period
- Include specific visual references: real places, period-accurate settings, archival imagery
- Mark scenes with "reusable_setup": true for recurring locations
- Include "location" field with specific historical locations
- Include "time_of_day" and "period_date" for historical accuracy
- List any "historical_figures_present" in each scene
- Each scene needs substantial narration with supporting visuals

SCENE VISUAL STYLE NOTES:
- Describe scenes for PHOTOREAL video generation, not animation
- Reference cinematic documentary techniques: Ken Burns effect, slow pans, static interviews
- Include archival footage integration points
- Suggest period-appropriate color grading and film grain

================================================================================
JSON OUTPUT FORMAT
================================================================================

{
  "title": "Episode title",
  "synopsis": "Documentary episode summary (2-3 sentences)",
  "open_time": "${openTime}",
  "close_time": "${closeTime}",
  "total_scripted_duration_seconds": ${contentSeconds},
  "script_type": "documentary",
  "segments": [
${chapterTimings.map((ch, idx) => `    {
      "segment_number": ${ch.chapterNumber},
      "title": "Chapter ${ch.chapterNumber}: ${ch.title}",
      "description": "Chapter description",
      "start_timecode": "${ch.startTimecode}",
      "end_timecode": "${ch.endTimecode}",
      "duration_seconds": ${ch.durationSeconds},
      "break_after": ${ch.breakAfter},
      "scenes": [${idx === 0 ? `
        {
          "scene_number": 1,
          "title": "OPENING - ESTABLISHING",
          "location": "Historical Location Name",
          "time_of_day": "DAY",
          "period_date": "Specific date or era",
          "description": "Opening visual description for documentary",
          "start_timecode": "${ch.startTimecode}",
          "end_timecode": "...",
          "duration_seconds": 60,
          "historical_figures_present": [],
          "reusable_setup": true,
          "dialogue": [
            {
              "character": "NARRATOR",
              "line": "Opening narration that hooks the viewer and sets up the story...",
              "stage_direction": "Sweeping aerial shot of location, slow pan across historical site"
            },
            {
              "character": "ARCHIVAL",
              "line": "A powerful quote from a primary source...",
              "stage_direction": "Cut to archival photograph or document with Ken Burns effect"
            }
          ],
          "production_notes": "Photoreal documentary style. Cinematic establishing shots. Period-accurate color grading.",
          "b_roll_suggestions": ["aerial view of location", "archival photographs", "period artifacts"]${photorealOptions?.includeCitations ? `,
          "citations": ["Source reference for key facts"]` : ''}
        }
      ` : ' /* Add scenes here */ '}]
    }${idx < segmentCount - 1 ? ',' : ''}`).join('\n')}
  ],
  "location_summary": [
    {
      "location": "LOCATION_NAME",
      "scene_count": 4,
      "total_duration_seconds": 320
    }
  ]
}

================================================================================
CRITICAL REQUIREMENTS
================================================================================

1. TIMING IS NON-NEGOTIABLE: Total scripted content must be ${contentSeconds} seconds (${formatTimecodeUtil(contentSeconds)})
2. This is a HISTORICAL DOCUMENTARY - NO children's content, NO animation references
3. [NARRATOR] should carry 60-70% of the dialogue with supporting archival quotes
4. All historical claims should be accurate and attributable
${photorealOptions?.includeCitations ? '5. Include [CITATION: source] markers for factual claims' : '5. Maintain factual accuracy throughout'}
6. Each chapter must end with a compelling transition or hook (except the final chapter)
7. Use period-appropriate language and terminology
8. Production notes should reference PHOTOREAL techniques, not animation
9. Include specific B-roll suggestions for each scene
10. Location_summary must reflect actual historical locations used

Generate the complete documentary script now with ALL chapters and scenes filled in:`;
}

export async function generateScriptWithGemini(
  episode: Episode,
  characters: Character[],
  options: GenerationOptions = {},
  signal?: AbortSignal,
  formatConfig?: ProgramFormatConfig,
  workspaceType?: WorkspaceType,
  photorealOptions?: PhotorealScriptOptions
): Promise<GeneratedScript> {
  try {
    const apiKey = getGeminiAPIKey();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const prompt = workspaceType === 'photoreal'
      ? buildPhotorealScriptPrompt(episode, characters, mergedOptions, formatConfig, photorealOptions)
      : buildScriptGenerationPrompt(episode, characters, mergedOptions, formatConfig);

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
    const wasTruncated = finishReason === 'MAX_TOKENS';

    if (wasTruncated) {
      console.warn('Response was truncated at token limit — attempting to salvage partial script');
    }

    const textContent = candidate.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error('No text content in response');
      throw new Error('EMPTY_RESPONSE');
    }

    console.log('Response length:', textContent.length, 'characters');

    // Strip markdown fences if present, then find the outermost JSON object
    const stripped = textContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
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

    // Clean up any trailing incomplete segments/scenes left by truncation
    if (wasTruncated) {
      parsedScript = cleanupIncompleteScript(parsedScript);
      console.log('Salvaged segments after truncation:', parsedScript.segments?.length ?? 0);
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
  if (!script.title || !script.segments) {
    throw new Error('Invalid script structure: missing required fields');
  }

  // open_time / close_time are important but not worth hard-failing — cleaned up earlier
  if (!script.open_time || !script.close_time) {
    console.warn('Script missing open_time or close_time — using defaults');
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

  // Allow fewer segments if the response was salvaged from truncation
  if (script.segments.length === 0) {
    throw new Error('Script has no segments — generation failed to produce usable content');
  }
  if (script.segments.length !== expectedSegments) {
    console.warn(`Expected ${expectedSegments} segments, got ${script.segments.length} — script may be truncated`);
  }

  let totalScriptedDuration = 0;
  let totalDialogueLines = 0;

  script.segments.forEach((segment, index) => {
    if (!segment.scenes || segment.scenes.length === 0) {
      throw new Error(`Segment ${index + 1} has no scenes`);
    }

    let segmentDuration = 0;

    segment.scenes.forEach((scene, sceneIndex) => {
      if (!scene.dialogue || scene.dialogue.length === 0) {
        throw new Error(`Segment ${index + 1}, scene ${sceneIndex + 1} has no dialogue`);
      }

      // Warn instead of error for missing metadata fields
      if (!scene.location) console.warn(`Scene ${scene.scene_number || sceneIndex + 1} missing location`);
      if (!scene.time_of_day) console.warn(`Scene ${scene.scene_number || sceneIndex + 1} missing time_of_day`);

      // Use a computed default instead of failing
      const duration = scene.duration_seconds && scene.duration_seconds >= 10
        ? scene.duration_seconds
        : scene.dialogue.length * 4;

      segmentDuration += duration;
      totalDialogueLines += scene.dialogue.length;
    });

    totalScriptedDuration += segmentDuration;
  });

  // Only hard-fail if the script is essentially empty
  const absoluteMinimum = Math.max(30, targetSeconds * 0.5);
  if (totalScriptedDuration < absoluteMinimum) {
    throw new Error(`Script is too short: ${totalScriptedDuration} seconds (minimum ${Math.floor(absoluteMinimum)}s). Please try generating again.`);
  }

  // Over-length is always a hard error — it will break production timing
  const maxDuration = targetSeconds * 1.15;
  if (totalScriptedDuration > maxDuration) {
    throw new Error(`Script is too long: ${totalScriptedDuration} seconds. Maximum is ${Math.floor(maxDuration)} seconds (target: ${targetSeconds} seconds)`);
  }

  // Dialogue count: warn only
  const recommendedDialogueLines = Math.floor(targetSeconds / 15);
  if (totalDialogueLines < 5) {
    throw new Error(`Script has too few dialogue lines (${totalDialogueLines}) — generation failed to produce usable content`);
  }
  if (totalDialogueLines < recommendedDialogueLines) {
    console.warn(`Script has only ${totalDialogueLines} dialogue lines (recommended: ${recommendedDialogueLines}+)`);
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
      console.error('[Gemini API] Error response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      // Parse Gemini-specific error codes
      if (response.status === 429) {
        throw new Error('RESOURCE_EXHAUSTED: Gemini API rate limit exceeded. Please wait a few minutes and try again.');
      } else if (response.status === 400) {
        throw new Error(`INVALID_ARGUMENT: ${JSON.stringify(errorData)}`);
      } else if (response.status === 401 || response.status === 403) {
        throw new Error(`PERMISSION_DENIED: API key is invalid or lacks permissions`);
      } else if (response.status === 503) {
        throw new Error('SERVICE_UNAVAILABLE: Gemini service is temporarily unavailable. Please try again later.');
      }

      throw new Error(`Gemini API error (${response.status}): ${response.statusText}. ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      console.error('[Gemini API] No candidates in response:', data);
      throw new Error('No response generated from Gemini. The API may have blocked the content.');
    }

    const responseParts: Array<{ text?: string; thought?: boolean }> = data.candidates[0].content.parts ?? [];
    const textContent = responseParts.find(p => !p.thought && p.text)?.text ?? responseParts.at(-1)?.text;
    return textContent;

  } catch (error) {
    console.error('[Gemini API] Exception during text generation:', error);
    if (error instanceof Error) {
      // Don't wrap the error if it's already a Gemini error
      if (error.message.includes('RESOURCE_EXHAUSTED') ||
          error.message.includes('INVALID_ARGUMENT') ||
          error.message.includes('PERMISSION_DENIED') ||
          error.message.includes('SERVICE_UNAVAILABLE')) {
        throw error;
      }
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

// ─────────────────────────────────────────────────────────────────────────────
// COMMERCIAL & PROMO — Concept generation and spot script generation
// ─────────────────────────────────────────────────────────────────────────────

export interface CampaignBrief {
  clientName: string;
  agencyName?: string;
  productService: string;
  campaignName: string;
  objective: 'awareness' | 'consideration' | 'conversion' | 'retention' | 'event';
  targetAudience: string;
  keyMessage: string;
  callToAction: string;
  brandTone: string;
  mandatoryElements: string;
  competitiveRestrictions?: string;
  spotLengthSeconds: 10 | 15 | 30;
  visualStyle: string;
  legalDisclaimer?: string;
}

export interface SpotConcept {
  conceptNumber: 1 | 2 | 3;
  conceptName: string;
  logline: string;
  creativeDirection: string;
  emotionalHook: string;
  openingHook: string;
  keyVisualMoment: string;
  ctaExecution: string;
  musicMood: string;
  visualStyle: string;
}

export interface GeneratedSpotScript {
  title: string;
  spotLengthSeconds: number;
  synopsis: string;
  scenes: SpotScene[];
  voiceoverText?: string;
  superText: string[];
  musicDirection: string;
  totalScriptedSeconds: number;
}

export interface SpotScene {
  sceneNumber: number;
  description: string;
  action: string;
  dialogue?: Array<{ character: string; line: string; type: 'vo' | 'onscreen' }>;
  super?: string;
  durationSeconds: number;
  visualNotes: string;
  cameraDirection: string;
}

function buildCommercialConceptPrompt(brief: CampaignBrief): string {
  const objectiveMap: Record<string, string> = {
    awareness: 'build brand awareness and recognition',
    consideration: 'drive consideration and interest in the product/service',
    conversion: 'drive immediate purchase or sign-up',
    retention: 'reinforce loyalty and retention among existing customers',
    event: 'promote an upcoming event or limited-time offer',
  };

  return `You are a senior creative director and marketing expert at ${brief.agencyName || 'a top advertising agency'}.

Your task is to generate THREE distinct creative concepts for a :${brief.spotLengthSeconds} commercial spot.

CAMPAIGN BRIEF:
- Client: ${brief.clientName}
- Product/Service: ${brief.productService}
- Campaign: ${brief.campaignName}
- Objective: ${objectiveMap[brief.objective] || brief.objective}
- Target Audience: ${brief.targetAudience}
- Key Message (single): ${brief.keyMessage}
- Call to Action: ${brief.callToAction}
- Brand Tone: ${brief.brandTone}
- Mandatory Elements: ${brief.mandatoryElements || 'None specified'}
${brief.competitiveRestrictions ? `- Do NOT reference: ${brief.competitiveRestrictions}` : ''}
${brief.legalDisclaimer ? `- Legal Disclaimer (must appear): "${brief.legalDisclaimer}"` : ''}

SPOT CONSTRAINTS:
- Total runtime: EXACTLY ${brief.spotLengthSeconds} seconds
- Visual style preference: ${brief.visualStyle}

Generate exactly 3 distinct creative concepts. Each must be genuinely different in its creative approach, emotional angle, and narrative structure — not just variations of the same idea.

Return ONLY valid JSON in this exact structure:
{
  "concepts": [
    {
      "conceptNumber": 1,
      "conceptName": "Short memorable name for this concept",
      "logline": "One sentence describing the concept",
      "creativeDirection": "2-3 sentences describing the overall creative approach and why it will resonate",
      "emotionalHook": "The core emotion this concept triggers in the viewer",
      "openingHook": "Exact description of the first 3 seconds — what grabs attention immediately",
      "keyVisualMoment": "The most memorable visual moment in the spot",
      "ctaExecution": "How the call to action is delivered at the end",
      "musicMood": "Music direction: genre, tempo, feeling",
      "visualStyle": "Specific visual treatment for this concept"
    },
    { "conceptNumber": 2, ... },
    { "conceptNumber": 3, ... }
  ]
}`;
}

export async function generateCommercialConcepts(brief: CampaignBrief): Promise<SpotConcept[]> {
  const apiKey = getGeminiAPIKey();
  const prompt = buildCommercialConceptPrompt(brief);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error (${response.status}): ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
  if (!textContent) throw new Error('No response from concept generator.');

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse concept response as JSON.');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.concepts as SpotConcept[];
}

function buildCommercialScriptPrompt(brief: CampaignBrief, concept: SpotConcept): string {
  const sceneCount = brief.spotLengthSeconds === 10 ? 3 : brief.spotLengthSeconds === 15 ? 4 : 7;

  return `You are a senior advertising copywriter and director at ${brief.agencyName || 'a top advertising agency'}.

Write a complete, production-ready :${brief.spotLengthSeconds} commercial script based on the approved creative concept below.

CAMPAIGN BRIEF:
- Client: ${brief.clientName}
- Product/Service: ${brief.productService}
- Objective: ${brief.objective}
- Target Audience: ${brief.targetAudience}
- Key Message: ${brief.keyMessage}
- Call to Action: ${brief.callToAction}
- Brand Tone: ${brief.brandTone}
- Mandatory Elements: ${brief.mandatoryElements || 'None'}
${brief.legalDisclaimer ? `- Legal Disclaimer: "${brief.legalDisclaimer}"` : ''}

APPROVED CREATIVE CONCEPT: "${concept.conceptName}"
- Logline: ${concept.logline}
- Creative Direction: ${concept.creativeDirection}
- Opening Hook: ${concept.openingHook}
- Key Visual Moment: ${concept.keyVisualMoment}
- CTA Execution: ${concept.ctaExecution}
- Music Mood: ${concept.musicMood}
- Visual Style: ${concept.visualStyle}

CRITICAL CONSTRAINTS:
1. TOTAL RUNTIME: EXACTLY ${brief.spotLengthSeconds} seconds — every second must be accounted for
2. Number of scenes: approximately ${sceneCount} (scene durations should add to exactly ${brief.spotLengthSeconds}s)
3. Every scene must have a precise duration_seconds value
4. Include super text (on-screen text) for the CTA and any mandatory elements
5. Voiceover (VO) and on-screen dialogue must be timed to fit the scene duration — a :30 can fit roughly 75 spoken words total
6. The legal disclaimer (if any) must appear as a super in the final scene

Return ONLY valid JSON:
{
  "title": "Spot title",
  "spotLengthSeconds": ${brief.spotLengthSeconds},
  "synopsis": "One sentence describing the spot",
  "voiceoverText": "Complete VO script if used (or null)",
  "musicDirection": "Detailed music direction",
  "superText": ["list", "of", "all", "supers"],
  "totalScriptedSeconds": ${brief.spotLengthSeconds},
  "scenes": [
    {
      "sceneNumber": 1,
      "description": "Location and setting",
      "action": "What happens visually",
      "dialogue": [
        { "character": "VO", "line": "Voiceover text", "type": "vo" }
      ],
      "super": "On-screen text for this scene (or null)",
      "durationSeconds": 4,
      "visualNotes": "Specific visual/art direction notes",
      "cameraDirection": "Shot type and camera movement"
    }
  ]
}`;
}

export async function generateCommercialSpotScript(
  brief: CampaignBrief,
  concept: SpotConcept
): Promise<GeneratedSpotScript> {
  const apiKey = getGeminiAPIKey();
  const prompt = buildCommercialScriptPrompt(brief, concept);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error (${response.status}): ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
  if (!textContent) throw new Error('No response from script generator.');

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse spot script response as JSON.');

  return JSON.parse(jsonMatch[0]) as GeneratedSpotScript;
}

export function buildVariantBrief(
  originalBrief: CampaignBrief,
  targetLength: 10 | 15
): CampaignBrief {
  return { ...originalBrief, spotLengthSeconds: targetLength };
}

export async function generateVariantConcept(
  originalConcept: SpotConcept,
  targetLength: 10 | 15
): Promise<SpotConcept> {
  const apiKey = getGeminiAPIKey();

  const prompt = `You are a senior advertising copywriter. You have a :30 commercial concept that needs to be adapted into a :${targetLength} cutdown.

ORIGINAL :30 CONCEPT: "${originalConcept.conceptName}"
- Logline: ${originalConcept.logline}
- Opening Hook: ${originalConcept.openingHook}
- Key Visual Moment: ${originalConcept.keyVisualMoment}
- CTA Execution: ${originalConcept.ctaExecution}
- Music Mood: ${originalConcept.musicMood}

Create a :${targetLength} variant that:
${targetLength === 15
    ? '- Keeps the core message and CTA\n- Trims the setup/problem framing\n- Leads faster into the key visual moment'
    : '- Reduces to just the hook + CTA\n- One strong visual moment + product + CTA\n- Maximum impact, zero setup'}

Return ONLY valid JSON matching the SpotConcept structure:
{
  "conceptNumber": 1,
  "conceptName": "${originalConcept.conceptName} :${targetLength}",
  "logline": "Updated logline for the :${targetLength} version",
  "creativeDirection": "How this cutdown works and what was trimmed",
  "emotionalHook": "${originalConcept.emotionalHook}",
  "openingHook": "New opening for :${targetLength}",
  "keyVisualMoment": "Key moment preserved from the :30",
  "ctaExecution": "${originalConcept.ctaExecution}",
  "musicMood": "${originalConcept.musicMood}",
  "visualStyle": "${originalConcept.visualStyle}"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!response.ok) throw new Error('Variant concept generation failed.');
  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
  if (!textContent) throw new Error('No response for variant concept.');

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse variant concept as JSON.');

  return JSON.parse(jsonMatch[0]) as SpotConcept;
}
