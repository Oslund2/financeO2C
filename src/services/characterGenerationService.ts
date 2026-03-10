import type { Database } from '../lib/database.types';

type Character = Database['public']['Tables']['characters']['Row'];

export interface GeneratedCharacterDraft {
  name: string;
  age: number | null;
  role: 'Primary' | 'Ensemble' | 'Recurring' | 'Cameo';
  description: string;
  personality: string;
  required_visual_features: string[];
  voice_characteristics: string;
  tags: string[];
  aliases: string[];
  isExisting: boolean;
  existingCharacterId?: string;
  existingImageUrl?: string;
}

export interface GeneratedEpisodeMeta {
  title: string;
  description: string;
  theme: string;
}

export interface CharacterGenerationResult {
  characters: GeneratedCharacterDraft[];
  episodeMeta: GeneratedEpisodeMeta;
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function matchToExisting(
  generatedName: string,
  generatedAliases: string[],
  existingCharacters: Character[]
): Character | null {
  const normalizedGen = normalizeName(generatedName);
  const normalizedAliases = generatedAliases.map(normalizeName);

  for (const char of existingCharacters) {
    const charNames = [char.name, ...(char.aliases || [])].map(normalizeName);
    if (charNames.some(n => n === normalizedGen)) return char;
    if (normalizedAliases.some(a => charNames.includes(a))) return char;
  }

  return null;
}

export async function generateCharactersFromStory(
  storyText: string,
  seriesContext: { name: string; description?: string; visualStyle?: string },
  existingCharacters: Character[]
): Promise<CharacterGenerationResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY.');

  const isClaymation = seriesContext.visualStyle === 'claymation';

  const visualStyleNote = isClaymation
    ? 'CLAYMATION style — describe physical features in terms of clay textures, exaggerated proportions, rounded forms, and sculptural characteristics suitable for stop-motion animation.'
    : 'PHOTOREAL style — describe physical features with realistic, detailed human characteristics: exact hair color, eye color, skin tone, facial structure, era-appropriate clothing and accessories.';

  const existingList = existingCharacters.length > 0
    ? existingCharacters.map(c => `- ${c.name}${c.aliases?.length ? ` (also known as: ${c.aliases.join(', ')})` : ''}`).join('\n')
    : 'None';

  const prompt = `You are a professional character designer and story analyst for a production studio. Analyze the following story and extract every significant character, generating rich production-ready profiles.

SERIES CONTEXT:
- Series Name: ${seriesContext.name}
- Series Description: ${seriesContext.description || 'Not provided'}
- Visual Style Note: ${visualStyleNote}

EXISTING SERIES CHARACTERS (already in the database — match these by name/alias, do not create duplicates):
${existingList}

STORY / PLOT SUMMARY:
${storyText}

INSTRUCTIONS:
1. Identify ALL characters — named individuals AND significant unnamed roles (e.g. "The Sheriff", "The Ranch Hand").
2. For each character, fill every field with specific, production-usable detail based on the story context, era, and setting.
3. Assign roles by story prominence:
   - Primary: The story centers on these characters
   - Ensemble: Important supporting roles with meaningful story impact
   - Recurring: Minor but named/notable presences
   - Cameo: Briefly mentioned or background figures
4. required_visual_features should be 3-6 specific visual elements that MUST remain consistent across all shots (e.g. "silver pocket watch on chain", "distinctive red neckerchief", "salt-and-pepper beard").
5. For age, provide a reasonable estimate if not stated (use null only if truly unknowable).
6. voice_characteristics should describe tone, accent, tempo, and any distinctive speech patterns.

Return ONLY valid JSON — no markdown, no explanation, no code fences:

{
  "episodeMeta": {
    "title": "A compelling episode title, 4-7 words, specific to this story",
    "description": "2-3 sentence production brief describing the episode's events and dramatic arc",
    "theme": "The central moral, conflict, or thematic statement of this episode in one sentence"
  },
  "characters": [
    {
      "name": "Full character name or descriptive title",
      "age": 35,
      "role": "Primary",
      "description": "Detailed physical description covering: approximate height and build, hair (color, length, style), eyes, skin tone, notable facial features, typical outfit, key accessories — all specific to the era and setting",
      "personality": "3-5 key personality traits with a brief note on how each trait manifests in this story",
      "required_visual_features": ["distinctive feature 1", "key accessory 2", "characteristic element 3"],
      "voice_characteristics": "Tone (e.g. gravelly, high-pitched), accent/region, speaking pace, any distinctive patterns",
      "tags": ["homesteader", "1889", "wyoming", "female-lead"],
      "aliases": ["any known nicknames or alternate names"]
    }
  ]
}`;

  // gemini-2.0-flash: stable JSON mode support, no thinking-model conflicts
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,   // 4096 was too small for multi-character JSON
        topP: 0.95,
        topK: 40,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 429) throw new Error('Gemini API rate limit reached. Please wait a moment and try again.');
    throw new Error(`Gemini API error (${response.status}): ${JSON.stringify(err)}`);
  }

  const data = await response.json();

  // Log full response structure to console for diagnostics
  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    console.warn(`[CharacterGen] Gemini finishReason: ${finishReason}`, candidate?.safetyRatings ?? '');
  }

  const parts: Array<{ text?: string; thought?: boolean }> = candidate?.content?.parts ?? [];
  // Skip thought parts (thinking models emit these before the actual response)
  const text = parts.find(p => !p.thought && p.text)?.text ?? parts.at(-1)?.text;

  if (!text) {
    console.error('[CharacterGen] Empty response. Full API data:', JSON.stringify(data).slice(0, 800));
    throw new Error('No response received from Gemini. Please try again.');
  }

  let parsed: { episodeMeta: GeneratedEpisodeMeta; characters: any[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    // Strip markdown code fences if present
    const stripped = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    try {
      parsed = JSON.parse(stripped);
    } catch {
      // Last resort: extract the outermost { … } block
      const match = stripped.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error('[CharacterGen] No JSON block found. Raw text (first 800 chars):', text.slice(0, 800));
        console.error('[CharacterGen] finishReason:', finishReason, '| parts count:', parts.length);
        throw new Error('Could not parse character data from Gemini response. Please try again.');
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.error('[CharacterGen] JSON block found but unparseable (first 800 chars):', match[0].slice(0, 800));
        throw new Error('Could not parse character data from Gemini response. Please try again.');
      }
    }
  }

  const VALID_ROLES = ['Primary', 'Ensemble', 'Recurring', 'Cameo'] as const;

  const characters: GeneratedCharacterDraft[] = (parsed.characters || []).map((c: any) => {
    const existing = matchToExisting(c.name || '', c.aliases || [], existingCharacters);
    return {
      name: (c.name || 'Unknown Character').trim(),
      age: typeof c.age === 'number' && c.age > 0 ? Math.round(c.age) : null,
      role: VALID_ROLES.includes(c.role) ? c.role : 'Ensemble',
      description: (c.description || '').trim(),
      personality: (c.personality || '').trim(),
      required_visual_features: Array.isArray(c.required_visual_features)
        ? c.required_visual_features.filter((f: any) => typeof f === 'string')
        : [],
      voice_characteristics: (c.voice_characteristics || '').trim(),
      tags: Array.isArray(c.tags) ? c.tags.filter((t: any) => typeof t === 'string') : [],
      aliases: Array.isArray(c.aliases) ? c.aliases.filter((a: any) => typeof a === 'string') : [],
      isExisting: !!existing,
      existingCharacterId: existing?.id,
      existingImageUrl: existing?.reference_image_url || undefined,
    };
  });

  return {
    characters,
    episodeMeta: {
      title: (parsed.episodeMeta?.title || 'Untitled Episode').trim(),
      description: (parsed.episodeMeta?.description || '').trim(),
      theme: (parsed.episodeMeta?.theme || '').trim(),
    },
  };
}
