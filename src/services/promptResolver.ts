import { getActivePrompt, renderPrompt, clearPromptCache } from './promptLibraryService';
import { PATENT_PROMPT_TEMPLATES, getPatentPromptContent } from './patentPromptDefaults';

const FALLBACK_PROMPTS: Record<string, string> = {
  claymation_style_base:
    'Claymation animation style, stop-motion aesthetic, clay texture visible on all surfaces, handmade appearance, physical clay models, tangible materials',

  claymation_style_full:
    'Claymation style animation with tactile clay textures, hand-crafted aesthetic, stop-motion feel, warm lighting, detailed clay surfaces. High-quality claymation animation style, handcrafted clay characters with visible fingerprint textures, stop-motion aesthetic, tangible 3D sets with miniature props, soft studio lighting, colorful and whimsical design.',

  video_negative_prompts:
    'CGI, digital rendering, 3D computer graphics, smooth surfaces, photorealistic, live action, blurry, low quality, distorted, watermark, background music, musical score, soundtrack, plastic appearance, digital artifacts, motion blur, lens flare',

  audio_directives:
    'NO MUSIC. Dialogue and natural sound effects only. Music will be added in post-production.'
};

export async function resolvePrompt(
  organizationId: string | null,
  promptKey: string,
  variables?: Record<string, any>,
  useDatabase: boolean = true
): Promise<string> {
  let promptContent: string | null = null;

  if (useDatabase && organizationId) {
    try {
      promptContent = await getActivePrompt(organizationId, promptKey);
    } catch (error) {
      console.warn(`Failed to fetch prompt from database: ${promptKey}`, error);
    }
  }

  if (!promptContent) {
    promptContent = FALLBACK_PROMPTS[promptKey] || null;
  }

  if (!promptContent) {
    throw new Error(`Prompt not found: ${promptKey}`);
  }

  if (variables && Object.keys(variables).length > 0) {
    return renderPrompt(promptContent, variables);
  }

  return promptContent;
}

export async function resolvePromptWithFallback(
  organizationId: string | null,
  promptKey: string,
  fallbackContent: string,
  variables?: Record<string, any>
): Promise<string> {
  let promptContent: string | null = null;

  if (organizationId) {
    try {
      promptContent = await getActivePrompt(organizationId, promptKey);
    } catch (error) {
      console.warn(`Failed to fetch prompt from database: ${promptKey}`, error);
    }
  }

  const finalContent = promptContent || fallbackContent;

  if (variables && Object.keys(variables).length > 0) {
    return renderPrompt(finalContent, variables);
  }

  return finalContent;
}

export function getClaymationStyleBase(): string {
  return FALLBACK_PROMPTS.claymation_style_base;
}

export function getClaymationStyleFull(): string {
  return FALLBACK_PROMPTS.claymation_style_full;
}

export function getVideoNegativePrompts(): string {
  return FALLBACK_PROMPTS.video_negative_prompts;
}

export function getAudioDirectives(): string {
  return FALLBACK_PROMPTS.audio_directives;
}

export async function getOrganizationClaymationStyle(
  organizationId: string
): Promise<string> {
  return resolvePromptWithFallback(
    organizationId,
    'claymation_style_base',
    FALLBACK_PROMPTS.claymation_style_base
  );
}

export async function getOrganizationNegativePrompts(
  organizationId: string
): Promise<string> {
  return resolvePromptWithFallback(
    organizationId,
    'video_negative_prompts',
    FALLBACK_PROMPTS.video_negative_prompts
  );
}

export async function getOrganizationAudioDirectives(
  organizationId: string
): Promise<string> {
  return resolvePromptWithFallback(
    organizationId,
    'audio_directives',
    FALLBACK_PROMPTS.audio_directives
  );
}

export async function resolvePatentPrompt(
  organizationId: string | null,
  promptKey: string,
  variables?: Record<string, any>
): Promise<string> {
  const fallbackContent = getPatentPromptContent(promptKey);

  if (!fallbackContent) {
    throw new Error(`Unknown patent prompt key: ${promptKey}`);
  }

  return resolvePromptWithFallback(organizationId, promptKey, fallbackContent, variables);
}

export async function getPatentClaimsIndependentPrompt(
  organizationId: string | null,
  variables: {
    title: string;
    features: string;
    noveltyAnalysis?: string;
    inventionDescription?: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_claims_independent', variables);
}

export async function getPatentClaimsDependentPrompt(
  organizationId: string | null,
  variables: {
    independentClaims: string;
    features: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_claims_dependent', variables);
}

export async function getPatentFieldOfInventionPrompt(
  organizationId: string | null,
  variables: {
    title: string;
    technicalField?: string;
    inventionDescription?: string;
    features: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_field_of_invention', variables);
}

export async function getPatentBackgroundPrompt(
  organizationId: string | null,
  variables: {
    inventionDescription?: string;
    problemSolved?: string;
    priorArt: string;
    differentiationPoints?: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_background_section', variables);
}

export async function getPatentSummaryPrompt(
  organizationId: string | null,
  variables: {
    title: string;
    features: string;
    differentiationPoints?: string;
    inventionDescription?: string;
    problemSolved?: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_summary_section', variables);
}

export async function getPatentDetailedDescriptionPrompt(
  organizationId: string | null,
  variables: {
    sectionType: string;
    title: string;
    features: string;
    inventionDescription?: string;
    technicalField?: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_details_description', variables);
}

export async function getPatentAbstractPrompt(
  organizationId: string | null,
  variables: {
    title: string;
    features: string;
    inventionDescription?: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_abstract_generation', variables);
}

export async function getPatentSectionRegenerationPrompt(
  organizationId: string | null,
  variables: {
    sectionType: string;
    currentContent: string;
    instructions: string;
    context?: string;
    inventionDescription?: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_section_regeneration', variables);
}

export async function getPatentDifferentiationPrompt(
  organizationId: string | null,
  variables: {
    features: string;
    priorArt: string;
    inventionDescription?: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_differentiation_analysis', variables);
}

export async function getPatentArtComparisonPrompt(
  organizationId: string | null,
  variables: {
    inventionTitle: string;
    inventionFeatures: string;
    inventionDescription?: string;
    priorArtNumber: string;
    priorArtTitle: string;
    priorArtAbstract: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_art_comparison', variables);
}

export async function getPriorArtSearchPrompt(
  organizationId: string | null,
  variables: {
    title: string;
    inventionDescription?: string;
    features: string;
    analysisTarget?: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'prior_art_search', variables);
}

export async function getPatentNoveltyAnalysisPrompt(
  organizationId: string | null,
  variables: {
    title: string;
    features: string;
    priorArt?: string;
    inventionDescription?: string;
  }
): Promise<string> {
  return resolvePatentPrompt(organizationId, 'patent_novelty_analysis', variables);
}

export function getPatentPromptKeys(): string[] {
  return Object.keys(PATENT_PROMPT_TEMPLATES);
}

export { clearPromptCache };
