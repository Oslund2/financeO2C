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

function getVertexAICredentials() {
  const projectId = import.meta.env.VITE_VERTEX_AI_PROJECT_ID;
  const location = import.meta.env.VITE_VERTEX_AI_LOCATION || 'us-central1';
  const apiKey = import.meta.env.VITE_VERTEX_AI_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error('Vertex AI credentials not configured. Please set VITE_VERTEX_AI_PROJECT_ID and VITE_VERTEX_AI_API_KEY in Bolt Secrets.');
  }

  return { projectId, location, apiKey };
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

Script Requirements:
- Tone: ${tone}
- Pacing: ${pacing}
- Format: 3-act structure (Setup, Confrontation, Resolution)
- Each act should have 2-4 scenes
- Each scene should include character dialogue with natural personality expression
- Integrate vocabulary words smoothly into conversations
- Include brief stage directions for claymation production
- Keep dialogue age-appropriate and engaging
- Total estimated duration: 10-15 minutes

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
          "title": "Scene title",
          "description": "Scene description and setting",
          "dialogue": [
            {
              "character": "Character name",
              "line": "What they say",
              "stage_direction": "Optional action or expression"
            }
          ],
          "duration_estimate": 120,
          "claymation_notes": "Production notes for animators"
        }
      ]
    }
  ]
}

Generate the complete script now:`;
}

export async function generateScriptWithGemini(
  episode: Episode,
  characters: Character[],
  options: GenerationOptions = {}
): Promise<GeneratedScript> {
  try {
    const { projectId, location, apiKey } = getVertexAICredentials();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const prompt = buildScriptGenerationPrompt(episode, characters, mergedOptions);

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-flash:generateContent`;

    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: mergedOptions.temperature,
        maxOutputTokens: mergedOptions.maxTokens,
        topP: 0.95,
        topK: 40
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Vertex AI API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Vertex AI');
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

export function checkVertexAIConfiguration(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!import.meta.env.VITE_VERTEX_AI_PROJECT_ID) {
    missing.push('VITE_VERTEX_AI_PROJECT_ID');
  }
  if (!import.meta.env.VITE_VERTEX_AI_API_KEY) {
    missing.push('VITE_VERTEX_AI_API_KEY');
  }

  return {
    configured: missing.length === 0,
    missing
  };
}
