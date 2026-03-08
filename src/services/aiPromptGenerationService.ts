/**
 * AI Prompt Generation Service
 *
 * Uses Claude (claude-opus-4-6) to auto-generate workspace/series-aligned
 * system prompts when the Prompt Library is empty.  The generated prompts
 * are informed by whatever the user has filled in on Mission Control
 * (mission statement, target audience, brand voice, guardrails, etc.) plus
 * the series-level overrides when a specific series is selected.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { WorkspaceMission, SeriesMission } from '../types/mission';
import {
  createPromptTemplate,
  type PromptCategory,
} from './promptLibraryService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedPromptDef {
  key: string;
  name: string;
  category: PromptCategory;
  description: string;
  content: string;
}

export interface GenerationResult {
  generated: number;
  prompts: GeneratedPromptDef[];
  errors: string[];
}

export type GenerationProgressCallback = (
  phase: 'thinking' | 'saving' | 'done',
  message: string,
  progress?: number   // 0-100
) => void;

// ── Prompt scaffold (what Claude must fill in) ────────────────────────────────

const PROMPT_SLOTS: Array<{
  key: string;
  name: string;
  category: PromptCategory;
  description: string;
  purpose: string;
}> = [
  {
    key: 'script_main',
    name: 'Script Generation',
    category: 'script',
    description: 'Primary prompt for generating video scripts',
    purpose:
      'Direct the AI to write structured scripts (hook, body, CTA) that match the workspace brand voice and stay within content guardrails.',
  },
  {
    key: 'script_episode_outline',
    name: 'Episode Outline',
    category: 'script',
    description: 'Generates a multi-beat episode outline before full script',
    purpose:
      'Produce a concise beat-by-beat outline the writer can review before full script expansion.',
  },
  {
    key: 'video_scene_generation',
    name: 'Video Scene Generation',
    category: 'video',
    description: 'Prompt for generating individual video scenes / shots',
    purpose:
      'Describe each shot in cinematic terms aligned with the workspace visual style and workspace type rendering characteristics.',
  },
  {
    key: 'video_b_roll',
    name: 'B-Roll & Cutaway Suggestions',
    category: 'video',
    description: 'Generates b-roll and cutaway shot ideas',
    purpose:
      'Suggest relevant supplemental footage that reinforces the narrative without contradicting brand/style guidelines.',
  },
  {
    key: 'voice_narration',
    name: 'Narration Direction',
    category: 'voice',
    description: 'Guides AI narration tone and delivery style',
    purpose:
      'Set the narrator persona, pacing, and emotional register to match brand voice and target audience expectations.',
  },
  {
    key: 'voice_dialogue',
    name: 'Character Dialogue',
    category: 'voice',
    description: 'Prompt for generating in-scene character dialogue',
    purpose:
      'Generate age-appropriate, on-brand dialogue for characters in scenes.',
  },
  {
    key: 'storyboard_panel',
    name: 'Storyboard Panel Description',
    category: 'storyboard',
    description: 'Generates detailed storyboard panel descriptions',
    purpose:
      'Produce frame-by-frame visual descriptions including camera angle, subject position, and action notes.',
  },
  {
    key: 'storyboard_sequence',
    name: 'Scene Sequence Planning',
    category: 'storyboard',
    description: 'Plans the visual sequence / flow of a scene',
    purpose:
      'Define the visual rhythm and pacing for a sequence of shots to support narrative impact.',
  },
  {
    key: 'style_visual_identity',
    name: 'Visual Identity Prompt',
    category: 'style',
    description: 'Core style prompt used across all image / video generation',
    purpose:
      'Encode the workspace visual identity (palette, textures, rendering style, lighting) as a reusable prompt prefix.',
  },
  {
    key: 'style_character_design',
    name: 'Character Design Guide',
    category: 'style',
    description: 'Describes character design rules for consistency',
    purpose:
      'Ensure characters look consistent across episodes and align with the visual rendering style.',
  },
  {
    key: 'general_content_brief',
    name: 'Content Brief Generator',
    category: 'general',
    description: 'Produces a structured content brief for a new video',
    purpose:
      'Summarise the video purpose, audience, key messages, and success criteria in a concise brief.',
  },
  {
    key: 'general_feedback_review',
    name: 'AI Feedback & Review',
    category: 'general',
    description: 'Reviews drafts against workspace guidelines and mission',
    purpose:
      'Check draft content against brand voice, guardrails, and content goals; return structured feedback.',
  },
];

// ── Helper: build context string from mission data ────────────────────────────

function buildMissionContext(
  workspaceType: string,
  mission: WorkspaceMission | null,
  seriesMission: SeriesMission | null
): string {
  const ws = workspaceType.charAt(0).toUpperCase() + workspaceType.slice(1);

  const audienceStr = mission?.target_audience
    ? JSON.stringify(mission.target_audience, null, 2)
    : 'Not specified';

  const goalsStr =
    mission?.content_goals?.length
      ? mission.content_goals.join('\n  - ')
      : 'Not specified';

  let ctx = `WORKSPACE TYPE: ${ws}

MISSION STATEMENT:
${mission?.mission_statement || 'Not yet defined — use sensible defaults for a ${ws} video workspace.'}

TARGET AUDIENCE:
${audienceStr}

CONTENT GOALS:
  - ${goalsStr}

BRAND VOICE:
${mission?.brand_voice || 'Professional, engaging, and informative.'}

CONTENT GUARDRAILS:
${mission?.content_guardrails || 'Suitable for general audiences; avoid controversial topics.'}

VISUAL / RENDERING STYLE:
${mission?.visual_rendering_style || workspaceType}`;

  if (seriesMission) {
    ctx += `

──────────────────────────────────────
SERIES-LEVEL OVERRIDES (apply these on top of workspace defaults):

Sub-Mission: ${seriesMission.sub_mission || 'None'}
Tone Overrides: ${seriesMission.tone_overrides || 'None'}
Content Focus Areas: ${seriesMission.content_focus?.join(', ') || 'None'}
Series Rules: ${seriesMission.series_rules || 'None'}
Inherits Workspace Mission: ${seriesMission.inherits_workspace_mission ? 'Yes' : 'No'}`;
  }

  return ctx;
}

// ── Main generation function ──────────────────────────────────────────────────

export async function generatePromptsForWorkspace(
  organizationId: string,
  workspaceType: string,
  mission: WorkspaceMission | null,
  seriesMission: SeriesMission | null = null,
  onProgress?: GenerationProgressCallback
): Promise<GenerationResult> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  if (!apiKey) {
    throw new Error(
      'VITE_ANTHROPIC_API_KEY is not set. Add it to your .env file to enable AI prompt generation.'
    );
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const missionContext = buildMissionContext(workspaceType, mission, seriesMission);

  const promptSlotDescriptions = PROMPT_SLOTS.map(
    (s, i) =>
      `${i + 1}. key="${s.key}" | name="${s.name}" | category="${s.category}"\n   Purpose: ${s.purpose}`
  ).join('\n\n');

  const systemPrompt = `You are an expert AI prompt engineer specialising in video production workflows.
Your task is to write system prompts for each production category in BeeStudio, an AI-powered video creation platform.
Each generated prompt will be stored as a reusable "system prompt" that gets injected into AI calls for that production step.

Rules:
- Each prompt must be written in the second person, instructing the AI ("You are…", "When generating…")
- Prompts must be specific to the workspace context provided
- Prompts must enforce brand voice, guardrails, and visual style naturally within the instruction
- Prompts should be 150–400 words — detailed enough to be useful, concise enough to fit in a context window
- Use \${variable_name} placeholders where dynamic values will be injected (e.g. \${episode_title}, \${scene_description})
- Return ONLY valid JSON — no markdown fences, no commentary outside the JSON`;

  const userMessage = `Here is the workspace context:

${missionContext}

Generate a system prompt for each of the following ${PROMPT_SLOTS.length} production slots:

${promptSlotDescriptions}

Return a JSON array of objects with exactly this shape:
[
  {
    "key": "<slot key from above>",
    "name": "<slot name from above>",
    "category": "<slot category from above>",
    "description": "<one sentence description of what this prompt does>",
    "content": "<the full system prompt text>"
  },
  ...
]`;

  onProgress?.('thinking', 'Claude is reading your Mission Control guidelines…', 10);

  // Streaming call so the UI can show progress
  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  onProgress?.('thinking', 'Generating prompts aligned with your workspace…', 40);

  const finalMessage = await stream.finalMessage();

  onProgress?.('thinking', 'Parsing generated prompts…', 65);

  // Extract the JSON from the response
  const textBlock = finalMessage.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude did not return any text content.');
  }

  let defs: GeneratedPromptDef[];
  try {
    // Strip any accidental markdown fences
    const raw = textBlock.text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
    defs = JSON.parse(raw);
    if (!Array.isArray(defs)) throw new Error('Expected JSON array');
  } catch (e) {
    throw new Error(`Failed to parse Claude response as JSON: ${e instanceof Error ? e.message : e}`);
  }

  onProgress?.('saving', `Saving ${defs.length} prompts to your library…`, 70);

  const errors: string[] = [];
  const saved: GeneratedPromptDef[] = [];

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    const progress = 70 + Math.round(((i + 1) / defs.length) * 28);
    onProgress?.('saving', `Saving "${def.name}"…`, progress);

    try {
      await createPromptTemplate(organizationId, {
        prompt_key:     def.key,
        prompt_name:    def.name,
        category:       def.category,
        description:    def.description,
        initial_content: def.content,
      });
      saved.push(def);
    } catch (err) {
      // Skip duplicates silently; surface other errors
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('duplicate') && !msg.includes('unique')) {
        errors.push(`${def.name}: ${msg}`);
      }
    }
  }

  onProgress?.('done', `${saved.length} prompts generated and saved.`, 100);

  return { generated: saved.length, prompts: saved, errors };
}
