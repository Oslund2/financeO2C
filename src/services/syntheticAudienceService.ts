import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Persona {
  name: string;
  age: number;
  location: string;
  viewing_habits: string;
  core_bias: string;
  why_click: string;
}

export interface PolarizingPoint {
  subject: string;
  why_polarizing: string;
}

export interface Phase1Analysis {
  core_premise: string;
  tone: string;
  target_demographic: string;
  polarizing_points: PolarizingPoint[];
}

export interface HookMoment {
  persona_name: string;
  moment: string;
  decision: 'continue' | 'quit';
  reason: string;
}

export interface DialogueCritique {
  persona_name: string;
  line: string;
  reaction: string;
  verdict: 'authentic' | 'cringe' | 'forced';
}

export interface TwistPrediction {
  persona_name: string;
  prediction: string;
  predictability_score: number; // 1 (unique) – 10 (obvious)
}

export interface Phase3Discussion {
  hook_moments: HookMoment[];
  dialogue_critique: DialogueCritique[];
  twist_predictions: TwistPrediction[];
}

export interface HeatmapRow {
  persona_name: string;
  pacing_score: number;         // 1-10
  character_relatability: number; // 1-10
  will_watch_ep2: boolean;
  retention_reason: string;
}

export interface HeadToHeadSummary {
  winner: 'A' | 'B' | 'tie';
  winner_title: string;
  margin: 'close' | 'moderate' | 'decisive';
  average_pacing_a: number;
  average_pacing_b: number;
  ep2_retention_a: number;
  ep2_retention_b: number;
  key_differentiators: string[];
  recommendation: string;
}

export type FocusGroupStatus =
  | 'pending'
  | 'analyzing'
  | 'awaiting_confirmation'
  | 'simulating'
  | 'comparing'
  | 'complete'
  | 'failed';

export interface FocusGroup {
  id: string;
  organizationId: string;
  scriptId: string;
  comparisonScriptId?: string;
  audiencePanelId?: string;
  title: string;
  status: FocusGroupStatus;
  phase1Analysis?: Phase1Analysis;
  phase2Personas?: Persona[];
  personasConfirmed: boolean;
  phase3Discussion?: Phase3Discussion;
  phase4Heatmap?: HeatmapRow[];
  comparisonPhase3?: Phase3Discussion;
  comparisonPhase4?: HeatmapRow[];
  headToHeadSummary?: HeadToHeadSummary;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudiencePanel {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  personas: Persona[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured (VITE_GEMINI_API_KEY)');
  return key;
}

async function callGemini(prompt: string, temperature = 0.75): Promise<string> {
  const apiKey = getGeminiApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: 8192 },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function parseJsonFromText<T>(text: string): T {
  // Strip markdown fences if present
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in Gemini response');
  return JSON.parse(stripped.slice(start, end + 1));
}

function extractScriptText(scriptContent: Record<string, unknown>): string {
  const title = scriptContent.title as string || 'Untitled';
  const acts = scriptContent.acts as Array<{
    act_number: number;
    content?: string;
    scenes: Array<{
      scene_number: number;
      setting?: string;
      description?: string;
      stage_directions?: string;
      dialogue?: Array<{ character?: string; line?: string; text?: string }>;
    }>;
  }> | undefined;

  if (!acts?.length) return `Script: ${title}\n\n${JSON.stringify(scriptContent)}`;

  let out = `SCRIPT TITLE: ${title}\n\n`;
  for (const act of acts) {
    out += `\n== ACT ${act.act_number} ==\n`;
    if (act.content) out += `${act.content}\n`;
    for (const scene of act.scenes ?? []) {
      out += `\n  -- Scene ${scene.scene_number}`;
      if (scene.setting) out += ` | ${scene.setting}`;
      out += ' --\n';
      if (scene.description) out += `  ${scene.description}\n`;
      if (scene.stage_directions) out += `  [${scene.stage_directions}]\n`;
      for (const d of scene.dialogue ?? []) {
        const speaker = d.character ?? 'NARRATOR';
        const line = d.line ?? d.text ?? '';
        out += `  ${speaker}: "${line}"\n`;
      }
    }
  }
  return out;
}

function rowToFocusGroup(row: Record<string, unknown>): FocusGroup {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    scriptId: row.script_id as string,
    comparisonScriptId: row.comparison_script_id as string | undefined,
    audiencePanelId: row.audience_panel_id as string | undefined,
    title: row.title as string ?? '',
    status: row.status as FocusGroupStatus,
    phase1Analysis: row.phase1_analysis as Phase1Analysis | undefined,
    phase2Personas: row.phase2_personas as Persona[] | undefined,
    personasConfirmed: row.personas_confirmed as boolean,
    phase3Discussion: row.phase3_discussion as Phase3Discussion | undefined,
    phase4Heatmap: row.phase4_heatmap as HeatmapRow[] | undefined,
    comparisonPhase3: row.comparison_phase3 as Phase3Discussion | undefined,
    comparisonPhase4: row.comparison_phase4 as HeatmapRow[] | undefined,
    headToHeadSummary: row.head_to_head_summary as HeadToHeadSummary | undefined,
    errorMessage: row.error_message as string | undefined,
    startedAt: row.started_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToPanel(row: Record<string, unknown>): AudiencePanel {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    personas: row.personas as Persona[],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────────────────

function buildPhase12Prompt(scriptText: string): string {
  return `You are a Lead Researcher for a TV Production Focus Group. Your job is rigorous, data-driven audience analysis.

SCRIPT TO ANALYZE:
${scriptText}

---

PHASE 1: SCRIPT ANALYSIS
Analyze this script and identify:
1. Core Premise: What is this show about in 2-3 sentences?
2. Tone: Be specific (e.g., "Darkly comedic procedural with emotional undercurrents")
3. Target Demographic: Who is the natural audience for this? Include age range, platform habits, genre affinities.
4. The 3 most polarizing characters or plot points — elements that will strongly attract some viewers and repel others. For each, explain WHY it's polarizing.

PHASE 2: AUDIENCE GENERATION
Generate exactly 5 synthetic focus group personas using data-driven psychographics. Do NOT use broad stereotypes. Each persona must feel like a real, specific person:
- name: first name only
- age: specific integer
- location: specific city, state
- viewing_habits: concrete specifics (streaming platforms, actual shows they watch, how many hours/week, viewing context — alone/with family/background noise)
- core_bias: one specific strong opinion about TV storytelling that will color how they react to this script
- why_click: the exact reason they'd select THIS show from a streaming menu (be specific to the script's actual content)

Return ONLY valid JSON, no other text:
{
  "phase1": {
    "core_premise": "string",
    "tone": "string",
    "target_demographic": "string",
    "polarizing_points": [
      { "subject": "string", "why_polarizing": "string" }
    ]
  },
  "phase2": [
    {
      "name": "string",
      "age": 0,
      "location": "string",
      "viewing_habits": "string",
      "core_bias": "string",
      "why_click": "string"
    }
  ]
}`;
}

function buildPhase34Prompt(scriptText: string, personas: Persona[]): string {
  const personasText = personas
    .map((p, i) => `${i + 1}. ${p.name}, ${p.age}, ${p.location}\n   Habits: ${p.viewing_habits}\n   Bias: ${p.core_bias}`)
    .join('\n');

  return `You are a Lead Researcher running a simulated TV focus group. Make each persona's voice distinct and true to their profile.

SCRIPT:
${scriptText}

FOCUS GROUP PERSONAS:
${personasText}

---

PHASE 3: THE SIMULATED TABLE READ
These 5 personas have just watched the pilot script. Simulate their post-screening discussion:

1. Hook Moments: For each persona, identify the EXACT moment in the script (quote a specific line or describe a specific scene) when they decided to keep watching or give up. Their decision must be consistent with their core_bias and viewing_habits.

2. Dialogue Authenticity: For each persona, pick 1-2 specific lines of dialogue from the script that they reacted to strongly. Quote the actual line. Explain their reaction. Verdict: authentic / cringe / forced.

3. Twist Predictions: Each persona guesses what the big season twist will be. Their guess should reflect what the script telegraphs. Score predictability 1-10 (1 = creative unique guess, 10 = completely obvious from the script itself). If all scores are above 7, the script is too telegraphic.

PHASE 4: SENTIMENT HEATMAP
Score each persona objectively:
- pacing_score: 1-10 (1 = painfully slow, 10 = perfect momentum)
- character_relatability: 1-10 (1 = no connection, 10 = deeply invested)
- will_watch_ep2: true or false
- retention_reason: one crisp sentence explaining will_watch_ep2

Return ONLY valid JSON:
{
  "phase3": {
    "hook_moments": [
      { "persona_name": "string", "moment": "string", "decision": "continue|quit", "reason": "string" }
    ],
    "dialogue_critique": [
      { "persona_name": "string", "line": "string", "reaction": "string", "verdict": "authentic|cringe|forced" }
    ],
    "twist_predictions": [
      { "persona_name": "string", "prediction": "string", "predictability_score": 0 }
    ]
  },
  "phase4": [
    {
      "persona_name": "string",
      "pacing_score": 0,
      "character_relatability": 0,
      "will_watch_ep2": true,
      "retention_reason": "string"
    }
  ]
}`;
}

function buildComparisonPrompt(
  titleA: string, phase1A: Phase1Analysis, heatmapA: HeatmapRow[],
  titleB: string, phase1B: Phase1Analysis, heatmapB: HeatmapRow[]
): string {
  const avgPacing = (h: HeatmapRow[]) => (h.reduce((s, r) => s + r.pacing_score, 0) / h.length).toFixed(1);
  const avgRelate = (h: HeatmapRow[]) => (h.reduce((s, r) => s + r.character_relatability, 0) / h.length).toFixed(1);
  const ep2Count = (h: HeatmapRow[]) => h.filter(r => r.will_watch_ep2).length;

  return `You are comparing two TV pilot scripts evaluated by the same synthetic focus group.

SCRIPT A: "${titleA}"
Premise: ${phase1A.core_premise}
Tone: ${phase1A.tone}
Target: ${phase1A.target_demographic}
Avg Pacing: ${avgPacing(heatmapA)}/10 | Avg Relatability: ${avgRelate(heatmapA)}/10 | EP2 Retention: ${ep2Count(heatmapA)}/5 personas
Heatmap: ${JSON.stringify(heatmapA)}

SCRIPT B: "${titleB}"
Premise: ${phase1B.core_premise}
Tone: ${phase1B.tone}
Target: ${phase1B.target_demographic}
Avg Pacing: ${avgPacing(heatmapB)}/10 | Avg Relatability: ${avgRelate(heatmapB)}/10 | EP2 Retention: ${ep2Count(heatmapB)}/5 personas
Heatmap: ${JSON.stringify(heatmapB)}

Provide an objective head-to-head analysis. Be specific about what drives the difference. The recommendation for the losing script should be actionable, not vague.

Return ONLY valid JSON:
{
  "winner": "A|B|tie",
  "winner_title": "string",
  "margin": "close|moderate|decisive",
  "average_pacing_a": 0.0,
  "average_pacing_b": 0.0,
  "ep2_retention_a": 0,
  "ep2_retention_b": 0,
  "key_differentiators": ["string"],
  "recommendation": "string"
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export const syntheticAudienceService = {

  // ── Audience Panels ────────────────────────────────────────────────────────

  async getPanels(organizationId: string): Promise<AudiencePanel[]> {
    const { data, error } = await supabase
      .from('audience_panels')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToPanel);
  },

  async savePanel(
    organizationId: string,
    name: string,
    personas: Persona[],
    description?: string
  ): Promise<AudiencePanel> {
    const { data, error } = await supabase
      .from('audience_panels')
      .insert({ organization_id: organizationId, name, description, personas })
      .select()
      .single();
    if (error) throw error;
    return rowToPanel(data);
  },

  async deletePanel(panelId: string): Promise<void> {
    const { error } = await supabase.from('audience_panels').delete().eq('id', panelId);
    if (error) throw error;
  },

  // ── Focus Groups ───────────────────────────────────────────────────────────

  async getFocusGroupsForScript(scriptId: string): Promise<FocusGroup[]> {
    const { data, error } = await supabase
      .from('synthetic_focus_groups')
      .select('*')
      .eq('script_id', scriptId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToFocusGroup);
  },

  async getFocusGroup(id: string): Promise<FocusGroup | null> {
    const { data, error } = await supabase
      .from('synthetic_focus_groups')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToFocusGroup(data) : null;
  },

  async deleteFocusGroup(id: string): Promise<void> {
    const { error } = await supabase.from('synthetic_focus_groups').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Phase 1+2: Analyze script → generate personas.
   * Accepts an optional panelId to skip generation and use saved personas.
   * Returns focus group with status = 'awaiting_confirmation'.
   */
  async startAnalysis(
    scriptId: string,
    organizationId: string,
    scriptContent: Record<string, unknown>,
    panelId?: string
  ): Promise<FocusGroup> {
    const scriptTitle = (scriptContent.title as string) || 'Untitled Script';
    const title = `${scriptTitle} — Focus Group ${new Date().toLocaleDateString()}`;

    // Create the row in 'analyzing' state
    const { data: created, error: createErr } = await supabase
      .from('synthetic_focus_groups')
      .insert({
        organization_id: organizationId,
        script_id: scriptId,
        audience_panel_id: panelId ?? null,
        title,
        status: 'analyzing',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (createErr) throw createErr;
    const focusGroupId = created.id;

    try {
      let phase1: Phase1Analysis;
      let phase2: Persona[];

      if (panelId) {
        // Using a saved panel — still run Phase 1 for script analysis, skip persona generation
        const { data: panel } = await supabase
          .from('audience_panels')
          .select('personas')
          .eq('id', panelId)
          .single();

        const scriptText = extractScriptText(scriptContent);
        const phase12Raw = await callGemini(buildPhase12Prompt(scriptText), 0.6);
        const phase12 = parseJsonFromText<{ phase1: Phase1Analysis; phase2: Persona[] }>(phase12Raw);
        phase1 = phase12.phase1;
        phase2 = (panel?.personas ?? phase12.phase2) as Persona[];
      } else {
        const scriptText = extractScriptText(scriptContent);
        const phase12Raw = await callGemini(buildPhase12Prompt(scriptText), 0.8);
        const phase12 = parseJsonFromText<{ phase1: Phase1Analysis; phase2: Persona[] }>(phase12Raw);
        phase1 = phase12.phase1;
        phase2 = phase12.phase2;
      }

      const { data: updated, error: updateErr } = await supabase
        .from('synthetic_focus_groups')
        .update({
          status: 'awaiting_confirmation',
          phase1_analysis: phase1,
          phase2_personas: phase2,
          updated_at: new Date().toISOString(),
        })
        .eq('id', focusGroupId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      return rowToFocusGroup(updated);
    } catch (err) {
      await supabase
        .from('synthetic_focus_groups')
        .update({ status: 'failed', error_message: String(err), updated_at: new Date().toISOString() })
        .eq('id', focusGroupId);
      throw err;
    }
  },

  /**
   * Confirm (and optionally edit) personas before simulation.
   * Pass editedPersonas to allow user modifications; pass saveAsPanel to persist.
   */
  async confirmPersonas(
    focusGroupId: string,
    editedPersonas: Persona[],
    saveAsPanel?: { organizationId: string; name: string; description?: string }
  ): Promise<FocusGroup> {
    let panelId: string | undefined;
    if (saveAsPanel) {
      const panel = await syntheticAudienceService.savePanel(
        saveAsPanel.organizationId,
        saveAsPanel.name,
        editedPersonas,
        saveAsPanel.description
      );
      panelId = panel.id;
    }

    const updates: Record<string, unknown> = {
      phase2_personas: editedPersonas,
      personas_confirmed: true,
      updated_at: new Date().toISOString(),
    };
    if (panelId) updates.audience_panel_id = panelId;

    const { data, error } = await supabase
      .from('synthetic_focus_groups')
      .update(updates)
      .eq('id', focusGroupId)
      .select()
      .single();
    if (error) throw error;
    return rowToFocusGroup(data);
  },

  /**
   * Phase 3+4: Run the simulated table read.
   * scriptContent must be the same script as scriptId.
   * Returns focus group with status = 'complete'.
   */
  async runSimulation(
    focusGroupId: string,
    scriptContent: Record<string, unknown>
  ): Promise<FocusGroup> {
    const { data: fg, error: fetchErr } = await supabase
      .from('synthetic_focus_groups')
      .select('phase2_personas')
      .eq('id', focusGroupId)
      .single();
    if (fetchErr) throw fetchErr;

    const personas = fg.phase2_personas as Persona[];
    if (!personas?.length) throw new Error('Personas not found — confirm them first');

    await supabase
      .from('synthetic_focus_groups')
      .update({ status: 'simulating', updated_at: new Date().toISOString() })
      .eq('id', focusGroupId);

    try {
      const scriptText = extractScriptText(scriptContent);
      const phase34Raw = await callGemini(buildPhase34Prompt(scriptText, personas), 0.7);
      const phase34 = parseJsonFromText<{ phase3: Phase3Discussion; phase4: HeatmapRow[] }>(phase34Raw);

      const { data: updated, error: updateErr } = await supabase
        .from('synthetic_focus_groups')
        .update({
          status: 'complete',
          phase3_discussion: phase34.phase3,
          phase4_heatmap: phase34.phase4,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', focusGroupId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      return rowToFocusGroup(updated);
    } catch (err) {
      await supabase
        .from('synthetic_focus_groups')
        .update({ status: 'failed', error_message: String(err), updated_at: new Date().toISOString() })
        .eq('id', focusGroupId);
      throw err;
    }
  },

  /**
   * Run Phase 3+4 for a second script using the same personas, then synthesize head-to-head.
   */
  async runComparison(
    focusGroupId: string,
    comparisonScriptId: string,
    comparisonContent: Record<string, unknown>
  ): Promise<FocusGroup> {
    const { data: fg, error: fetchErr } = await supabase
      .from('synthetic_focus_groups')
      .select('*')
      .eq('id', focusGroupId)
      .single();
    if (fetchErr) throw fetchErr;

    const personas = fg.phase2_personas as Persona[];
    const phase1A = fg.phase1_analysis as Phase1Analysis;
    const heatmapA = fg.phase4_heatmap as HeatmapRow[];

    if (!personas?.length || !heatmapA?.length)
      throw new Error('Complete the primary script simulation first');

    await supabase
      .from('synthetic_focus_groups')
      .update({
        status: 'comparing',
        comparison_script_id: comparisonScriptId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', focusGroupId);

    try {
      const scriptBText = extractScriptText(comparisonContent);
      const titleB = (comparisonContent.title as string) || 'Script B';

      // Phase 1 for script B (just for premise/tone for the comparison prompt)
      const phase12BRaw = await callGemini(buildPhase12Prompt(scriptBText), 0.6);
      const phase12B = parseJsonFromText<{ phase1: Phase1Analysis; phase2: Persona[] }>(phase12BRaw);
      const phase1B = phase12B.phase1;

      // Phase 3+4 for script B with same personas
      const phase34BRaw = await callGemini(buildPhase34Prompt(scriptBText, personas), 0.7);
      const phase34B = parseJsonFromText<{ phase3: Phase3Discussion; phase4: HeatmapRow[] }>(phase34BRaw);

      // Head-to-head synthesis
      const titleA = fg.title?.split(' — Focus Group')[0] || 'Script A';
      const headToHeadRaw = await callGemini(
        buildComparisonPrompt(titleA, phase1A, heatmapA, titleB, phase1B, phase34B.phase4),
        0.5
      );
      const headToHead = parseJsonFromText<HeadToHeadSummary>(headToHeadRaw);

      const { data: updated, error: updateErr } = await supabase
        .from('synthetic_focus_groups')
        .update({
          status: 'complete',
          comparison_phase3: phase34B.phase3,
          comparison_phase4: phase34B.phase4,
          head_to_head_summary: headToHead,
          updated_at: new Date().toISOString(),
        })
        .eq('id', focusGroupId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      return rowToFocusGroup(updated);
    } catch (err) {
      await supabase
        .from('synthetic_focus_groups')
        .update({ status: 'failed', error_message: String(err), updated_at: new Date().toISOString() })
        .eq('id', focusGroupId);
      throw err;
    }
  },

  /** Rename a focus group */
  async renameGroup(focusGroupId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('synthetic_focus_groups')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', focusGroupId);
    if (error) throw error;
  },
};
