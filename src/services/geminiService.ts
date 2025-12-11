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

interface GeneratedScene {
  title: string;
  description: string;
  dialogue: Array<{
    character: string;
    line: string;
    stage_direction?: string;
  }>;
  duration_estimate: number;
  claymation_notes?: string;
}

interface GeneratedAct {
  act_number: number;
  title: string;
  description: string;
  scenes: GeneratedScene[];
}

interface GeneratedScript {
  title: string;
  synopsis: string;
  acts: GeneratedAct[];
}

interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  tone?: string;
  pacing?: string;
}

const DEFAULT_OPTIONS: GenerationOptions = {
  temperature: 0.7,
  maxTokens: 4000,
  tone: 'educational and entertaining',
  pacing: 'moderate'
};

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
  options: GenerationOptions
): string {
  const { tone, pacing } = { ...DEFAULT_OPTIONS, ...options };

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

Script Requirements:
- Tone: ${tone}
- Pacing: ${pacing}
- Format: 3-act structure (Setup, Confrontation, Resolution) in TABLE READ FORMAT
- Runtime: EXACTLY 22 MINUTES of scripted content (enough to fill the entire content hole)
- Each act should have 2-5 scenes to reach the 22-minute target
- Write in Table Read format suitable for printing and production use:
  * Use proper scene headings (INT./EXT., LOCATION, TIME OF DAY)
  * Character names should be clear and consistent
  * Include stage directions and parenthetical actions
  * Dialogue should be easy to read aloud at a table read
  * Include timing estimates for each scene
- Each scene should include character dialogue with natural personality expression
- Integrate vocabulary words smoothly into conversations
- Include detailed stage directions for claymation production
- Keep dialogue age-appropriate but genuinely clever and engaging
- Students should demonstrate intelligence through their dialogue and problem-solving
- Make the kids witty and funny in natural, age-appropriate ways

Please generate a complete script in the following JSON format:

{
  "title": "Episode title",
  "synopsis": "Brief episode summary",
  "acts": [
    {
      "act_number": 1,
      "title": "Act 1: Setup",
      "description": "Description of what happens in this act",
      "scenes": [
        {
          "title": "Scene title in proper format (e.g., INT. CLASSROOM - DAY)",
          "description": "Scene description and setting for table read",
          "dialogue": [
            {
              "character": "Character name (use 'Mrs. Higginbottom' or 'Mrs. H' - NEVER 'Mrs. Higginbottoms')",
              "line": "What they say - make kids sound smart, cool, and funny",
              "stage_direction": "Optional action or expression in parentheses"
            }
          ],
          "duration_estimate": 180,
          "claymation_notes": "Detailed production notes for animators"
        }
      ]
    }
  ]
}

IMPORTANT REMINDERS:
- Total script duration must be approximately 22 minutes (1,320 seconds total across all scenes)
- Use "Mrs. Higginbottom" (no S) or "Mrs. H" - this is critical
- Make the kids genuinely smart, cool, and funny through their dialogue
- Chad and antagonist characters are the exception - they can be portrayed differently

Generate the complete script now:`;
}

export async function generateScriptWithGemini(
  episode: Episode,
  characters: Character[],
  options: GenerationOptions = {}
): Promise<GeneratedScript> {
  try {
    const apiKey = getGeminiAPIKey();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const prompt = buildScriptGenerationPrompt(episode, characters, mergedOptions);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

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

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Gemini response');
    }

    const generatedScript: GeneratedScript = JSON.parse(jsonMatch[0]);

    validateGeneratedScript(generatedScript);

    return generatedScript;

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Script generation failed: ${error.message}`);
    }
    throw new Error('Script generation failed with unknown error');
  }
}

function validateGeneratedScript(script: GeneratedScript): void {
  if (!script.title || !script.synopsis || !script.acts) {
    throw new Error('Invalid script structure: missing required fields');
  }

  if (script.acts.length !== 3) {
    throw new Error('Script must have exactly 3 acts');
  }

  script.acts.forEach((act, index) => {
    if (!act.title || !act.description || !act.scenes || act.scenes.length === 0) {
      throw new Error(`Invalid structure in act ${index + 1}`);
    }

    act.scenes.forEach((scene, sceneIndex) => {
      if (!scene.title || !scene.dialogue || scene.dialogue.length === 0) {
        throw new Error(`Invalid structure in act ${index + 1}, scene ${sceneIndex + 1}`);
      }
    });
  });
}

export async function generateText(prompt: string): Promise<string> {
  try {
    const apiKey = getGeminiAPIKey();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
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
