import { createPatentClaim } from './patentApplicationService';
import type { PatentClaim } from './patentApplicationService';
import { generateText } from './geminiService';

export interface ClaimTemplate {
  category: PatentClaim['category'];
  type: PatentClaim['claim_type'];
  parentRef?: number;
  template: string;
  description: string;
}

const INDEPENDENT_METHOD_CLAIMS: ClaimTemplate[] = [
  {
    category: 'method',
    type: 'independent',
    template: `A computer-implemented method for automated animation production, comprising:
receiving, by one or more processors, a script input comprising dialogue text, scene descriptions, and stage directions;
parsing, by the one or more processors, the script input into structured data comprising a plurality of acts, each act comprising one or more scenes, and each scene comprising dialogue entries and visual descriptions;
generating, by the one or more processors using a storyboard generation module, a plurality of image prompts based on the structured data, wherein each image prompt incorporates character reference data to maintain visual consistency;
transmitting, by the one or more processors, the plurality of image prompts to an image generation service to generate storyboard images;
synthesizing, by the one or more processors using a voice synthesis module, audio files for dialogue entries using character-specific voice profiles;
generating, by the one or more processors using a lip synchronization module, lip-synchronized video sequences by combining the storyboard images with the synthesized audio files; and
assembling, by the one or more processors, the lip-synchronized video sequences into a completed animated episode with timing alignment.`,
    description: 'Core method claim covering the end-to-end animation production pipeline'
  },
  {
    category: 'system',
    type: 'independent',
    template: `A system for automated animation production, comprising:
one or more processors;
a non-transitory computer-readable storage medium storing instructions that, when executed by the one or more processors, cause the system to:
  receive a script input defining animated content including dialogue, scene settings, and character actions;
  maintain a character consistency database storing reference images and character profiles for a plurality of characters;
  generate visual content prompts incorporating data from the character consistency database to ensure visual coherence across generated assets;
  orchestrate a plurality of external artificial intelligence services through a unified abstraction layer, the services including image generation, voice synthesis, and lip synchronization;
  implement a prompt resolution engine with multi-level caching comprising in-memory cache and persistent storage lookup;
  track production costs using a cost calculation engine implementing asset decay modeling; and
  coordinate assembly of generated assets into completed animated episodes.`,
    description: 'System claim covering the integrated production system architecture'
  }
];

const DEPENDENT_CLAIMS: ClaimTemplate[] = [
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, wherein the prompt resolution engine implements a hierarchical lookup strategy comprising:
checking an in-memory cache for a requested prompt;
upon cache miss, querying an organization-specific prompt table;
upon organization prompt absence, retrieving a system default prompt; and
caching the retrieved prompt with a configurable time-to-live value.`,
    description: 'Prompt caching and resolution mechanism'
  },
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, wherein maintaining visual consistency comprises:
storing, in the character consistency database, a reference image URL for each character;
storing physical description attributes including clay features, personality traits, and visual characteristics;
constructing generation prompts that include the reference image URL and physical description; and
applying a series-specific style guide to all generated visual content.`,
    description: 'Character consistency enforcement'
  },
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, wherein the cost calculation engine implements an asset decay model comprising:
calculating a decay multiplier using the formula: multiplier = max(floor, decay_rate^(episode_number - 1));
applying the decay multiplier to human editing costs including scene setup, character quality control, and revision costs;
maintaining flat costs for render supervision and voice direction that do not decay; and
generating cost comparisons between AI-assisted production and traditional animation methods.`,
    description: 'Cost calculation with asset decay'
  },
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, further comprising:
receiving a total runtime target for the animated episode;
calculating actual runtime based on dialogue duration and scene pacing;
identifying runtime discrepancies between target and calculated values; and
generating recommendations for runtime adjustment including dialogue trimming or scene extension.`,
    description: 'Total Runtime (TRT) compliance'
  },
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, wherein the voice synthesis module comprises:
maintaining voice profiles associating characters with voice synthesis provider identifiers;
supporting multiple voice synthesis providers through a provider abstraction layer;
enabling voice cloning from sample audio to create character-specific voice models; and
applying emotion parameters to synthesized dialogue based on scene context.`,
    description: 'Multi-provider voice synthesis'
  },
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, wherein generating lip-synchronized video sequences comprises:
transmitting a character reference image and synthesized audio to a lip synchronization service;
receiving a video output with animated lip movements matching the audio;
supporting multiple lip synchronization providers with automatic fallback on failure; and
storing provider job identifiers for status tracking and result retrieval.`,
    description: 'Lip synchronization with provider fallback'
  },
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, further comprising:
extracting vocabulary words from the script input for educational content;
generating visual representations of vocabulary words for inclusion in storyboards;
tracking vocabulary word usage across episodes for curriculum alignment; and
generating vocabulary-focused scene breakdowns highlighting educational elements.`,
    description: 'Educational vocabulary integration'
  },
  {
    category: 'system',
    type: 'dependent',
    parentRef: 2,
    template: `The system of claim 2, wherein the unified abstraction layer comprises:
a provider interface defining common operations for each service category;
provider-specific adapters translating common operations to provider APIs;
configuration management for provider credentials and endpoint URLs; and
automatic provider selection based on availability, cost, and quality parameters.`,
    description: 'Multi-provider abstraction architecture'
  },
  {
    category: 'system',
    type: 'dependent',
    parentRef: 2,
    template: `The system of claim 2, further comprising:
a workflow orchestration engine managing production job dependencies;
a job queue tracking pending, in-progress, and completed production tasks;
retry logic for failed operations with configurable attempt limits; and
progress tracking providing real-time visibility into episode production status.`,
    description: 'Workflow orchestration and job management'
  },
  {
    category: 'system',
    type: 'dependent',
    parentRef: 2,
    template: `The system of claim 2, wherein the character consistency database further stores:
character role classifications including protagonist, antagonist, supporting, and background;
character relationship mappings defining interactions between characters;
voice characteristic descriptions for voice synthesis guidance; and
emotional range parameters defining expressiveness capabilities.`,
    description: 'Extended character profile management'
  },
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, further comprising:
generating a shot list from scene descriptions specifying camera angles, shot types, and character positioning;
supporting shot types including establishing shots, close-ups, medium shots, over-shoulder shots, and reaction shots;
calculating shot duration based on dialogue length and scene pacing requirements; and
enabling manual shot list editing with automatic prompt regeneration.`,
    description: 'Shot list generation and camera direction'
  },
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, wherein parsing the script input comprises:
accepting script files in multiple formats including PDF, DOCX, and plain text;
extracting text content using format-specific parsers;
identifying structural elements including act breaks, scene headings, character names, and dialogue;
repairing malformed JSON structures in parsed data using pattern matching and inference; and
validating parsed structure against expected schema requirements.`,
    description: 'Multi-format script parsing with JSON repair'
  },
  {
    category: 'system',
    type: 'dependent',
    parentRef: 2,
    template: `The system of claim 2, further comprising:
an approval workflow enabling review and approval of generated storyboards;
version tracking storing revision history for each storyboard shot;
annotation capabilities for reviewer feedback on generated content; and
selective regeneration allowing individual shot regeneration without affecting approved content.`,
    description: 'Storyboard approval and version control'
  },
  {
    category: 'method',
    type: 'dependent',
    parentRef: 1,
    template: `The method of claim 1, further comprising:
translating dialogue text to one or more target languages using machine translation;
maintaining translated script versions linked to the original script;
generating voice synthesis for translated dialogue using language-appropriate voice profiles; and
tracking translation status including pending, in-progress, completed, and failed states.`,
    description: 'Multi-language translation support'
  },
  {
    category: 'system',
    type: 'dependent',
    parentRef: 2,
    template: `The system of claim 2, wherein the prompt resolution engine further comprises:
a prompt template versioning system tracking changes over time;
organization-level prompt customization enabling per-tenant prompt modifications;
prompt variable interpolation replacing placeholders with runtime values; and
prompt enhancement suggestions using AI analysis to improve generation quality.`,
    description: 'Advanced prompt management and versioning'
  }
];

export function generateDefaultClaims(): ClaimTemplate[] {
  return [...INDEPENDENT_METHOD_CLAIMS, ...DEPENDENT_CLAIMS];
}

export async function generateClaimsForApplication(applicationId: string): Promise<PatentClaim[]> {
  const templates = generateDefaultClaims();
  const claims: PatentClaim[] = [];

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    const claimNumber = i + 1;

    let parentClaimId: string | null = null;
    if (template.parentRef && claims.length >= template.parentRef) {
      parentClaimId = claims[template.parentRef - 1].id;
    }

    const claim = await createPatentClaim(applicationId, {
      claim_number: claimNumber,
      claim_type: template.type,
      parent_claim_id: parentClaimId,
      claim_text: template.template,
      status: 'draft',
      category: template.category
    });

    claims.push(claim);
  }

  return claims;
}

export function formatClaimForDisplay(claim: PatentClaim): string {
  return `${claim.claim_number}. ${claim.claim_text}`;
}

export function formatClaimsSection(claims: PatentClaim[]): string {
  const sorted = [...claims].sort((a, b) => a.claim_number - b.claim_number);
  return sorted.map(claim => formatClaimForDisplay(claim)).join('\n\n');
}

export function getClaimTypeLabel(type: PatentClaim['claim_type']): string {
  return type === 'independent' ? 'Independent' : 'Dependent';
}

export function getCategoryLabel(category: PatentClaim['category']): string {
  const labels: Record<string, string> = {
    method: 'Method',
    system: 'System',
    apparatus: 'Apparatus',
    composition: 'Composition'
  };
  return labels[category] || category;
}

export function validateClaims(claims: PatentClaim[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const independentClaims = claims.filter(c => c.claim_type === 'independent');
  if (independentClaims.length === 0) {
    errors.push('At least one independent claim is required');
  }

  const dependentClaims = claims.filter(c => c.claim_type === 'dependent');
  for (const claim of dependentClaims) {
    if (!claim.parent_claim_id) {
      errors.push(`Dependent claim ${claim.claim_number} must reference a parent claim`);
    }
  }

  const claimNumbers = claims.map(c => c.claim_number);
  const uniqueNumbers = new Set(claimNumbers);
  if (claimNumbers.length !== uniqueNumbers.size) {
    errors.push('Duplicate claim numbers detected');
  }

  for (let i = 1; i <= claims.length; i++) {
    if (!claimNumbers.includes(i)) {
      errors.push(`Missing claim number ${i} in sequence`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function countClaimsByType(claims: PatentClaim[]): { independent: number; dependent: number; total: number } {
  const independent = claims.filter(c => c.claim_type === 'independent').length;
  const dependent = claims.filter(c => c.claim_type === 'dependent').length;
  return { independent, dependent, total: claims.length };
}

export async function generateAIEnhancedClaims(
  applicationId: string,
  features: any[],
  noveltyAnalysis: any
): Promise<PatentClaim[]> {
  const claims: PatentClaim[] = [];

  const independentClaims = await generateIndependentClaims(features, noveltyAnalysis);

  for (let i = 0; i < independentClaims.length; i++) {
    const claimText = independentClaims[i];
    const claim = await createPatentClaim(applicationId, {
      claim_number: i + 1,
      claim_type: 'independent',
      parent_claim_id: null,
      claim_text: claimText,
      status: 'draft',
      category: i === 0 ? 'method' : 'system'
    });
    claims.push(claim);
  }

  const dependentClaims = await generateDependentClaims(features, claims);

  for (let i = 0; i < dependentClaims.length; i++) {
    const { claimText, parentClaimNumber } = dependentClaims[i];
    const parentClaim = claims.find(c => c.claim_number === parentClaimNumber);

    const claim = await createPatentClaim(applicationId, {
      claim_number: claims.length + 1,
      claim_type: 'dependent',
      parent_claim_id: parentClaim?.id || null,
      claim_text: claimText,
      status: 'draft',
      category: parentClaim?.category || 'method'
    });
    claims.push(claim);
  }

  return claims;
}

async function generateIndependentClaims(
  features: any[],
  noveltyAnalysis: any
): Promise<string[]> {
  const coreFeatures = features.filter(f => f.is_core_innovation);

  const prompt = `Generate 2 independent patent claims for an AI animation production system.

Core Novel Features:
${coreFeatures.map((f, i) => `${i + 1}. ${f.feature_name}
   Type: ${f.feature_type}
   Description: ${f.technical_description}
   Novelty: ${f.novelty_strength}`).join('\n\n')}

Novelty Assessment:
${noveltyAnalysis.patentabilityAssessment || 'Strong innovation in AI-assisted animation production'}

Generate:
1. One METHOD claim (computer-implemented method)
2. One SYSTEM claim (system with processors and storage)

Requirements:
- Each claim should be ONE sentence with proper semicolon structure
- Include the strongest novel features
- Use proper patent claim language
- Start method claims with "A computer-implemented method..."
- Start system claims with "A system comprising..."
- Be specific about technical implementations
- Cover the end-to-end workflow

Format as JSON array:
["claim 1 text...", "claim 2 text..."]`;

  try {
    const response = await generateText(prompt, 'patent_claims_independent');
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('AI independent claims generation failed:', error);
  }

  return [
    `A computer-implemented method for automated animation production with cost optimization, comprising: receiving script input comprising dialogue and scene descriptions; parsing the script into structured data; generating image prompts using character consistency profiles with reference images; transmitting prompts to AI image generation services; synthesizing character dialogue using voice profiles; generating lip-synchronized videos; calculating production costs using hierarchical asset decay modeling; and assembling assets into completed episodes with progress tracking.`,
    `A system for AI-assisted animation production, comprising: one or more processors; a non-transitory computer-readable storage medium storing instructions that cause the system to: maintain character consistency database with reference images and prompt templates; implement multi-version prompt management with atomic deployment; orchestrate multiple AI service providers through unified abstraction layer; apply cost calculation engine with configurable decay rates and floor values; track episode production progress across multiple job types; and coordinate assembly of generated assets into completed animated content.`
  ];
}

async function generateDependentClaims(
  features: any[],
  independentClaims: PatentClaim[]
): Promise<Array<{ claimText: string; parentClaimNumber: number }>> {
  const prompt = `Generate 15-18 dependent patent claims based on these independent claims and features.

Independent Claims:
${independentClaims.map((c, i) => `Claim ${c.claim_number}: ${c.claim_text.substring(0, 200)}...`).join('\n\n')}

Available Features to Cover:
${features.map((f, i) => `${i + 1}. ${f.feature_name} (${f.feature_type}, ${f.novelty_strength} novelty)`).join('\n')}

Generate dependent claims that:
- Reference parent claims properly ("The method of claim X" or "The system of claim Y")
- Cover specific implementations of features
- Include algorithm details, data structures, and technical specifications
- Provide fallback positions if independent claims are challenged
- Cover variations and alternative embodiments

Distribute claims across both independent claims (roughly 60% depending on claim 1, 40% on claim 2).

Format as JSON array of objects:
[
  {"claimText": "The method of claim 1, wherein...", "parentClaimNumber": 1},
  {"claimText": "The system of claim 2, wherein...", "parentClaimNumber": 2}
]`;

  try {
    const response = await generateText(prompt, 'patent_claims_dependent');
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('AI dependent claims generation failed:', error);
  }

  return [
    { claimText: 'The method of claim 1, wherein the hierarchical asset decay modeling comprises: calculating decay multiplier as max(floor_value, decay_rate^(episode_number - 1)); applying decay to human editing costs; maintaining flat costs for supervision; and generating comparative cost analysis.', parentClaimNumber: 1 },
    { claimText: 'The method of claim 1, wherein maintaining character consistency comprises: storing reference image URLs in cloud storage; generating prompts incorporating reference URLs; tracking consistency scores; and updating profiles based on usage patterns.', parentClaimNumber: 1 },
    { claimText: 'The system of claim 2, wherein the multi-version prompt management comprises: storing multiple versions per prompt template; marking one version as deployed; enabling atomic deployment switching; and supporting organization-level overrides.', parentClaimNumber: 2 },
    { claimText: 'The system of claim 2, wherein the unified abstraction layer comprises: provider interface defining common operations; provider-specific adapters; automatic failover on service errors; and cost-based provider selection.', parentClaimNumber: 2 }
  ];
}
