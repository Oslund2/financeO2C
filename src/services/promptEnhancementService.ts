import { supabase } from '../lib/supabase';

export type EnhancementType = 'clarity' | 'detail' | 'optimize' | 'custom';

export interface EnhancementResult {
  enhancedContent: string;
  originalContent: string;
  enhancementType: EnhancementType;
  suggestions: string[];
  analysis: PromptAnalysis;
}

export interface PromptAnalysis {
  clarity_score: number;
  specificity_score: number;
  potential_issues: string[];
  recommendations: string[];
  estimated_effectiveness: 'low' | 'medium' | 'high';
  suggested_variables: SuggestedVariable[];
}

export interface SuggestedVariable {
  name: string;
  description: string;
  example: string;
  reason: string;
}

export interface EnhancementHistory {
  id: string;
  prompt_version_id: string;
  organization_id: string | null;
  original_content: string;
  enhanced_content: string;
  enhancement_type: EnhancementType;
  custom_instruction: string | null;
  accepted: boolean | null;
  created_at: string;
}

function getGeminiAPIKey(): string {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  return apiKey;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = getGeminiAPIKey();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
        topP: 0.95
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function enhancePrompt(
  originalContent: string,
  enhancementType: EnhancementType,
  customInstruction?: string,
  context?: { category?: string; purpose?: string }
): Promise<EnhancementResult> {
  const instructions: Record<EnhancementType, string> = {
    clarity: `Improve the clarity and readability of this prompt. Make it more concise and easier to understand while preserving all important information. Remove redundancy and ambiguity.`,
    detail: `Expand this prompt with more specific details and context. Add clarifying examples, edge cases to consider, and more explicit instructions for better AI output quality.`,
    optimize: `Optimize this prompt for better AI performance. Restructure it for clearer instruction following, add formatting that helps AI parse the request, and include output format specifications if missing.`,
    custom: customInstruction || 'Improve this prompt based on best practices.'
  };

  const systemPrompt = `You are an expert prompt engineer. Your task is to improve AI prompts for better results.

Context:
- Category: ${context?.category || 'general'}
- Purpose: ${context?.purpose || 'AI content generation'}

Task: ${instructions[enhancementType]}

Important guidelines:
1. Preserve any template variables in the format \${variable_name}
2. Maintain the original intent and core instructions
3. Keep the enhanced prompt focused and actionable
4. If the prompt includes JSON output format requirements, preserve them exactly
5. Do not add emojis or informal language unless present in original

Original Prompt:
---
${originalContent}
---

Provide ONLY the enhanced prompt text, no explanations or meta-commentary.`;

  const enhancedContent = await callGemini(systemPrompt);
  const analysis = await analyzePrompt(enhancedContent);

  return {
    enhancedContent: enhancedContent.trim(),
    originalContent,
    enhancementType,
    suggestions: analysis.recommendations,
    analysis
  };
}

export async function analyzePrompt(promptContent: string): Promise<PromptAnalysis> {
  const analysisPrompt = `Analyze this AI prompt and provide a JSON assessment. Be objective and constructive.

Prompt to analyze:
---
${promptContent}
---

Provide analysis in this exact JSON format:
{
  "clarity_score": <number 1-10>,
  "specificity_score": <number 1-10>,
  "potential_issues": ["issue1", "issue2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "estimated_effectiveness": "<low|medium|high>",
  "suggested_variables": [
    {
      "name": "variable_name",
      "description": "what it represents",
      "example": "example value",
      "reason": "why it would be useful"
    }
  ]
}

Scoring guide:
- clarity_score: How clear and unambiguous are the instructions
- specificity_score: How specific vs vague is the prompt
- potential_issues: Problems that could cause poor AI output
- recommendations: Actionable improvements
- suggested_variables: Template variables that could make the prompt more flexible

Respond with only valid JSON, no markdown formatting.`;

  try {
    const response = await callGemini(analysisPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        clarity_score: Math.min(10, Math.max(1, parsed.clarity_score || 5)),
        specificity_score: Math.min(10, Math.max(1, parsed.specificity_score || 5)),
        potential_issues: Array.isArray(parsed.potential_issues) ? parsed.potential_issues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        estimated_effectiveness: parsed.estimated_effectiveness || 'medium',
        suggested_variables: Array.isArray(parsed.suggested_variables)
          ? parsed.suggested_variables
          : []
      };
    }
  } catch (error) {
    console.error('Failed to parse analysis response:', error);
  }

  return {
    clarity_score: 5,
    specificity_score: 5,
    potential_issues: [],
    recommendations: ['Unable to analyze prompt automatically'],
    estimated_effectiveness: 'medium',
    suggested_variables: []
  };
}

export async function suggestVariables(promptContent: string): Promise<SuggestedVariable[]> {
  const suggestionPrompt = `Analyze this prompt and suggest template variables that could make it more reusable and flexible.

Template variables use the format \${variable_name}.

Prompt:
---
${promptContent}
---

Look for:
1. Hardcoded values that could be parameterized
2. Context-specific information that varies between uses
3. Configuration options that users might want to adjust
4. Output format specifications
5. Tone or style settings

Provide suggestions in this JSON format:
[
  {
    "name": "variable_name_in_snake_case",
    "description": "Clear description of what this variable controls",
    "example": "Example value to demonstrate usage",
    "reason": "Why this would be useful as a variable"
  }
]

Respond with only valid JSON array, no markdown.`;

  try {
    const response = await callGemini(suggestionPrompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Failed to parse variable suggestions:', error);
  }

  return [];
}

export async function saveEnhancementHistory(
  promptVersionId: string,
  organizationId: string,
  originalContent: string,
  enhancedContent: string,
  enhancementType: EnhancementType,
  customInstruction?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('prompt_enhancement_history')
    .insert([{
      prompt_version_id: promptVersionId,
      organization_id: organizationId,
      original_content: originalContent,
      enhanced_content: enhancedContent,
      enhancement_type: enhancementType,
      custom_instruction: customInstruction || null,
      accepted: null
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function updateEnhancementAcceptance(
  enhancementId: string,
  accepted: boolean
): Promise<void> {
  const { error } = await supabase
    .from('prompt_enhancement_history')
    .update({ accepted })
    .eq('id', enhancementId);

  if (error) {
    throw error;
  }
}

export async function getEnhancementHistory(
  promptVersionId: string
): Promise<EnhancementHistory[]> {
  const { data, error } = await supabase
    .from('prompt_enhancement_history')
    .select('*')
    .eq('prompt_version_id', promptVersionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getOrganizationEnhancementStats(
  organizationId: string
): Promise<{
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  byType: Record<EnhancementType, number>;
}> {
  const { data, error } = await supabase
    .from('prompt_enhancement_history')
    .select('enhancement_type, accepted')
    .eq('organization_id', organizationId);

  if (error) {
    throw error;
  }

  const stats = {
    total: data?.length || 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
    byType: { clarity: 0, detail: 0, optimize: 0, custom: 0 } as Record<EnhancementType, number>
  };

  (data || []).forEach((item: { enhancement_type: string; accepted: boolean | null }) => {
    if (item.accepted === true) stats.accepted++;
    else if (item.accepted === false) stats.rejected++;
    else stats.pending++;

    const type = item.enhancement_type as EnhancementType;
    if (stats.byType[type] !== undefined) {
      stats.byType[type]++;
    }
  });

  return stats;
}

export function generateDiffHighlight(
  original: string,
  enhanced: string
): { type: 'added' | 'removed' | 'unchanged'; text: string }[] {
  const originalLines = original.split('\n');
  const enhancedLines = enhanced.split('\n');
  const result: { type: 'added' | 'removed' | 'unchanged'; text: string }[] = [];

  const originalSet = new Set(originalLines);
  const enhancedSet = new Set(enhancedLines);

  const allLines = new Set([...originalLines, ...enhancedLines]);

  allLines.forEach((line) => {
    if (originalSet.has(line) && enhancedSet.has(line)) {
      result.push({ type: 'unchanged', text: line });
    } else if (enhancedSet.has(line) && !originalSet.has(line)) {
      result.push({ type: 'added', text: line });
    } else if (originalSet.has(line) && !enhancedSet.has(line)) {
      result.push({ type: 'removed', text: line });
    }
  });

  return result;
}

export async function testPromptWithSampleData(
  promptContent: string,
  sampleData: Record<string, any>
): Promise<{
  renderedPrompt: string;
  testResponse: string;
  tokenUsage: { input: number; output: number };
  latencyMs: number;
}> {
  let renderedPrompt = promptContent;
  for (const [key, value] of Object.entries(sampleData)) {
    const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    renderedPrompt = renderedPrompt.replace(placeholder, stringValue);
  }

  const startTime = Date.now();
  const testResponse = await callGemini(renderedPrompt);
  const latencyMs = Date.now() - startTime;

  const inputTokens = Math.ceil(renderedPrompt.length / 4);
  const outputTokens = Math.ceil(testResponse.length / 4);

  return {
    renderedPrompt,
    testResponse,
    tokenUsage: { input: inputTokens, output: outputTokens },
    latencyMs
  };
}
