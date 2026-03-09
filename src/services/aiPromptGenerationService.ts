/**
 * AI Prompt Generation Service
 *
 * Uses Gemini (gemini-2.5-flash via VITE_GEMINI_API_KEY) to auto-generate
 * workspace/series-aligned system prompts when the Prompt Library is empty.
 * The generated prompts are informed by whatever the user has filled in on
 * Mission Control (mission statement, target audience, brand voice,
 * guardrails, etc.) plus series-level overrides when a series is selected.
 */

import type { WorkspaceMission, SeriesMission } from '../types/mission';
import { createPromptTemplate, type PromptCategory } from './promptLibraryService';

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
  progress?: number   // 0–100
) => void;

// ── Prompt scaffold ───────────────────────────────────────────────────────────

const PROMPT_SLOTS: Array<{
  key: string;
  name: string;
  category: PromptCategory;
  purpose: string;
}> = [
  { key: 'script_main',            name: 'Script Generation',          category: 'script',     purpose: 'Write structured scripts (hook, body, CTA) matching the workspace brand voice and guardrails.' },
  { key: 'script_episode_outline', name: 'Episode Outline',            category: 'script',     purpose: 'Produce a concise beat-by-beat outline the writer can review before full script expansion.' },
  { key: 'video_scene_generation', name: 'Video Scene Generation',     category: 'video',      purpose: 'Describe each shot in cinematic terms aligned with the workspace visual style and rendering type.' },
  { key: 'video_b_roll',           name: 'B-Roll & Cutaway Suggestions',category: 'video',     purpose: 'Suggest relevant supplemental footage that reinforces the narrative without breaking brand/style rules.' },
  { key: 'voice_narration',        name: 'Narration Direction',        category: 'voice',      purpose: 'Set narrator persona, pacing, and emotional register to match brand voice and audience expectations.' },
  { key: 'voice_dialogue',         name: 'Character Dialogue',         category: 'voice',      purpose: 'Generate age-appropriate, on-brand dialogue for characters in scenes.' },
  { key: 'storyboard_panel',       name: 'Storyboard Panel Description',category: 'storyboard',purpose: 'Produce frame-by-frame visual descriptions: camera angle, subject position, action notes.' },
  { key: 'storyboard_sequence',    name: 'Scene Sequence Planning',    category: 'storyboard', purpose: 'Define the visual rhythm and pacing for a shot sequence to support narrative impact.' },
  { key: 'style_visual_identity',  name: 'Visual Identity Prompt',     category: 'style',      purpose: 'Encode workspace visual identity (palette, textures, rendering style, lighting) as a reusable prompt prefix.' },
  { key: 'style_character_design', name: 'Character Design Guide',     category: 'style',      purpose: 'Ensure characters look consistent across episodes and align with the visual rendering style.' },
  { key: 'general_content_brief',  name: 'Content Brief Generator',    category: 'general',    purpose: 'Summarise video purpose, audience, key messages, and success criteria in a concise brief.' },
  { key: 'general_feedback_review',name: 'AI Feedback & Review',       category: 'general',    purpose: 'Check draft content against brand voice, guardrails, and content goals; return structured feedback.' },
];

// ── Build mission context string ──────────────────────────────────────────────

function buildMissionContext(
  workspaceType: string,
  mission: WorkspaceMission | null,
  seriesMission: SeriesMission | null
): string {
  const ws = workspaceType.charAt(0).toUpperCase() + workspaceType.slice(1);
  const audienceStr = mission?.target_audience ? JSON.stringify(mission.target_audience, null, 2) : 'Not specified';
  const goalsStr = mission?.content_goals?.length ? mission.content_goals.join('\n  - ') : 'Not specified';

  let ctx = `WORKSPACE TYPE: ${ws}

MISSION STATEMENT:
${mission?.mission_statement || `Not yet defined — use sensible defaults for a ${ws} video workspace.`}

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
SERIES-LEVEL OVERRIDES (apply on top of workspace defaults):
Sub-Mission: ${seriesMission.sub_mission || 'None'}
Tone Overrides: ${seriesMission.tone_overrides || 'None'}
Content Focus Areas: ${seriesMission.content_focus?.join(', ') || 'None'}
Series Rules: ${seriesMission.series_rules || 'None'}
Inherits Workspace Mission: ${seriesMission.inherits_workspace_mission ? 'Yes' : 'No'}`;
  }

  return ctx;
}

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY.');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16000,
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    if (response.status === 429) throw new Error('Gemini API rate limit reached. Please wait a moment and try again.');
    if (response.status === 401 || response.status === 403) throw new Error('Gemini API key is invalid or missing permissions.');
    throw new Error(`Gemini API error (${response.status}): ${JSON.stringify(errBody)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty response. Please try again.');
  return text;
}

function parseJsonArray(raw: string): GeneratedPromptDef[] {
  // Stage 1: direct parse
  try {
    const result = JSON.parse(raw);
    if (Array.isArray(result)) return result;
    // Sometimes Gemini wraps the array in an object
    const firstArray = Object.values(result).find(v => Array.isArray(v));
    if (firstArray) return firstArray as GeneratedPromptDef[];
  } catch { /* fall through */ }

  // Stage 2: strip markdown code fences then parse
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  try {
    const result = JSON.parse(stripped);
    if (Array.isArray(result)) return result;
  } catch { /* fall through */ }

  // Stage 3: extract the outermost [ … ] array block
  const match = stripped.match(/\[[\s\S]*\]/);
  if (!match) {
    console.error('No JSON array found in Gemini response:', raw.slice(0, 400));
    throw new Error('Could not parse prompt definitions from Gemini response. Please try again.');
  }
  try {
    const result = JSON.parse(match[0]);
    if (!Array.isArray(result)) throw new Error('Extracted value is not an array');
    return result;
  } catch (e) {
    console.error('Failed to parse extracted JSON array:', match[0].slice(0, 400));
    throw new Error(`Could not parse prompt definitions from Gemini response: ${e instanceof Error ? e.message : e}`);
  }
}

// ── Main generation function ──────────────────────────────────────────────────

export async function generatePromptsForWorkspace(
  organizationId: string,
  workspaceType: string | null | undefined,
  mission: WorkspaceMission | null,
  seriesMission: SeriesMission | null = null,
  onProgress?: GenerationProgressCallback
): Promise<GenerationResult> {
  const safeWorkspaceType = workspaceType || 'general';
  const missionContext = buildMissionContext(safeWorkspaceType, mission, seriesMission);

  const slotDescriptions = PROMPT_SLOTS.map(
    (s, i) => `${i + 1}. key="${s.key}" | name="${s.name}" | category="${s.category}"\n   Purpose: ${s.purpose}`
  ).join('\n\n');

  const fullPrompt = `You are an expert AI prompt engineer specialising in video production workflows.
Your task is to write system prompts for each production category in BeeStudio, an AI-powered video creation platform.
Each generated prompt will be stored as a reusable "system prompt" injected into AI calls for that production step.

Rules:
- Write each prompt in the second person, instructing the AI ("You are…", "When generating…")
- Prompts must be specific to the workspace context below
- Naturally enforce brand voice, guardrails, and visual style within the instruction
- Length: 150–400 words per prompt — detailed but concise
- Use \${variable_name} placeholders where dynamic values will be injected (e.g. \${episode_title})
- Return ONLY valid JSON — no markdown fences, no commentary outside the JSON array

WORKSPACE CONTEXT:
${missionContext}

Generate a system prompt for each of the following ${PROMPT_SLOTS.length} production slots:

${slotDescriptions}

Return a JSON array of objects with exactly this shape:
[
  {
    "key": "<slot key>",
    "name": "<slot name>",
    "category": "<slot category>",
    "description": "<one sentence description>",
    "content": "<the full system prompt text>"
  }
]`;

  onProgress?.('thinking', 'Gemini is reading your Mission Control guidelines…', 15);

  const raw = await callGemini(fullPrompt);

  onProgress?.('thinking', 'Parsing generated prompts…', 60);

  const defs = parseJsonArray(raw);

  onProgress?.('saving', `Saving ${defs.length} prompts to your library…`, 65);

  const errors: string[] = [];
  const saved: GeneratedPromptDef[] = [];

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    const progress = 65 + Math.round(((i + 1) / defs.length) * 33);
    onProgress?.('saving', `Saving "${def.name}"…`, progress);

    try {
      await createPromptTemplate(organizationId, {
        prompt_key:      def.key,
        prompt_name:     def.name,
        category:        def.category,
        description:     def.description,
        initial_content: def.content,
      });
      saved.push(def);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('duplicate') && !msg.includes('unique')) {
        errors.push(`${def.name}: ${msg}`);
      }
    }
  }

  onProgress?.('done', `${saved.length} prompts generated and saved.`, 100);

  return { generated: saved.length, prompts: saved, errors };
}
