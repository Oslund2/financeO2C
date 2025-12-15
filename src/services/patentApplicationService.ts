import { supabase } from '../lib/supabase';

export interface PatentApplication {
  id: string;
  organization_id: string;
  title: string;
  filing_type: 'provisional' | 'non_provisional' | 'continuation' | 'cip' | 'divisional';
  status: 'draft' | 'in_review' | 'ready_to_file' | 'filed' | 'pending' | 'granted' | 'rejected' | 'abandoned';
  inventor_name: string | null;
  inventor_citizenship: string;
  specification: string | null;
  abstract: string | null;
  prior_art_patents: PriorArtReference[];
  prior_art_literature: PriorArtReference[];
  metadata: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PatentClaim {
  id: string;
  application_id: string;
  claim_number: number;
  claim_type: 'independent' | 'dependent';
  parent_claim_id: string | null;
  claim_text: string;
  status: 'draft' | 'reviewed' | 'finalized';
  category: 'method' | 'system' | 'apparatus' | 'composition';
  created_at: string;
  updated_at: string;
}

export interface PatentDrawing {
  id: string;
  application_id: string;
  figure_number: number;
  title: string;
  description: string | null;
  svg_content: string | null;
  image_url: string | null;
  drawing_type: 'block_diagram' | 'flowchart' | 'wireframe' | 'schematic' | 'sequence_diagram';
  callouts: DrawingCallout[];
  created_at: string;
  updated_at: string;
}

export interface DrawingCallout {
  number: number;
  label: string;
  description: string;
}

export interface PriorArtReference {
  id: string;
  type: 'patent' | 'application' | 'article' | 'book' | 'website';
  reference_number?: string;
  title: string;
  authors?: string;
  date?: string;
  relevance?: string;
}

export interface PatentApplicationWithDetails extends PatentApplication {
  claims: PatentClaim[];
  drawings: PatentDrawing[];
}

export async function getPatentApplications(organizationId: string): Promise<PatentApplication[]> {
  const { data, error } = await supabase
    .from('patent_applications')
    .select('*')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPatentApplication(applicationId: string): Promise<PatentApplicationWithDetails | null> {
  const { data: application, error: appError } = await supabase
    .from('patent_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();

  if (appError) throw appError;
  if (!application) return null;

  const { data: claims, error: claimsError } = await supabase
    .from('patent_claims')
    .select('*')
    .eq('application_id', applicationId)
    .order('claim_number', { ascending: true });

  if (claimsError) throw claimsError;

  const { data: drawings, error: drawingsError } = await supabase
    .from('patent_drawings')
    .select('*')
    .eq('application_id', applicationId)
    .order('figure_number', { ascending: true });

  if (drawingsError) throw drawingsError;

  return {
    ...application,
    claims: claims || [],
    drawings: drawings || []
  };
}

export async function createPatentApplication(
  organizationId: string,
  data: Partial<PatentApplication>
): Promise<PatentApplication> {
  const { data: application, error } = await supabase
    .from('patent_applications')
    .insert([{
      organization_id: organizationId,
      title: data.title || 'Untitled Patent Application',
      filing_type: data.filing_type || 'provisional',
      status: 'draft',
      inventor_name: data.inventor_name || null,
      inventor_citizenship: data.inventor_citizenship || 'US Citizen',
      specification: data.specification || null,
      abstract: data.abstract || null,
      prior_art_patents: data.prior_art_patents || [],
      prior_art_literature: data.prior_art_literature || [],
      metadata: data.metadata || {},
      version: 1
    }])
    .select()
    .single();

  if (error) throw error;
  return application;
}

export async function updatePatentApplication(
  applicationId: string,
  updates: Partial<PatentApplication>
): Promise<void> {
  const { error } = await supabase
    .from('patent_applications')
    .update({
      ...updates,
      version: supabase.rpc('increment_version', { row_id: applicationId })
    })
    .eq('id', applicationId);

  if (error) throw error;
}

export async function deletePatentApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('patent_applications')
    .delete()
    .eq('id', applicationId);

  if (error) throw error;
}

export async function createPatentClaim(
  applicationId: string,
  claim: Omit<PatentClaim, 'id' | 'application_id' | 'created_at' | 'updated_at'>
): Promise<PatentClaim> {
  const { data, error } = await supabase
    .from('patent_claims')
    .insert([{
      application_id: applicationId,
      ...claim
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePatentClaim(
  claimId: string,
  updates: Partial<PatentClaim>
): Promise<void> {
  const { error } = await supabase
    .from('patent_claims')
    .update(updates)
    .eq('id', claimId);

  if (error) throw error;
}

export async function deletePatentClaim(claimId: string): Promise<void> {
  const { error } = await supabase
    .from('patent_claims')
    .delete()
    .eq('id', claimId);

  if (error) throw error;
}

export async function createPatentDrawing(
  applicationId: string,
  drawing: Omit<PatentDrawing, 'id' | 'application_id' | 'created_at' | 'updated_at'>
): Promise<PatentDrawing> {
  const { data, error } = await supabase
    .from('patent_drawings')
    .insert([{
      application_id: applicationId,
      ...drawing
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePatentDrawing(
  drawingId: string,
  updates: Partial<PatentDrawing>
): Promise<void> {
  const { error } = await supabase
    .from('patent_drawings')
    .update(updates)
    .eq('id', drawingId);

  if (error) throw error;
}

export async function deletePatentDrawing(drawingId: string): Promise<void> {
  const { error } = await supabase
    .from('patent_drawings')
    .delete()
    .eq('id', drawingId);

  if (error) throw error;
}

export function generateDefaultSpecification(): string {
  return `FIELD OF THE INVENTION

The present invention relates generally to computer-implemented methods and systems for automated animation production, and more particularly to an integrated artificial intelligence pipeline for generating animated content from scripts with minimal human intervention.

BACKGROUND OF THE INVENTION

Traditional animation production requires extensive manual effort across multiple disciplines including character design, storyboard creation, voice recording, lip synchronization, and final video rendering. This process typically involves large teams of specialized artists and technicians working over extended periods, resulting in high costs and long production timelines.

Recent advances in artificial intelligence have enabled automation of individual tasks within the animation pipeline. However, existing solutions typically address isolated components without providing an integrated end-to-end workflow. Furthermore, maintaining visual consistency across generated content remains a significant challenge.

There exists a need for a comprehensive system that integrates multiple AI services into a cohesive animation production pipeline while maintaining character consistency, optimizing costs, and enabling rapid iteration.

SUMMARY OF THE INVENTION

The present invention provides a computer-implemented system and method for automated animation production comprising an integrated AI pipeline that orchestrates multiple specialized services to transform scripts into completed animated episodes.

In one aspect, the invention provides a method for automated animation production comprising: receiving a script input defining dialogue, scene descriptions, and stage directions; parsing the script into structured data including acts, scenes, and individual shots; generating visual storyboards using AI image generation with character consistency enforcement; synthesizing character voices using text-to-speech services with configurable voice profiles; generating lip-synchronized video sequences from still images and audio; and assembling the final animated episode with timing alignment.

In another aspect, the invention provides a system comprising: a prompt resolution engine with multi-level caching for optimizing AI service calls; a character consistency manager maintaining visual coherence across generated assets; a cost calculation engine with asset decay modeling for production budgeting; a multi-provider abstraction layer supporting multiple AI service backends; and a workflow orchestration engine coordinating the production pipeline.

DETAILED DESCRIPTION OF THE INVENTION

The following description sets forth specific embodiments of the invention. These embodiments are not intended to limit the scope of the invention but rather to provide examples of how the invention may be practiced.

System Architecture Overview

The system comprises a web-based application with a React frontend communicating with a Supabase backend database. The application orchestrates multiple external AI services through a unified abstraction layer.

[Reference to FIG. 1 - High-Level System Architecture]

The core components include:

1. Script Processing Module - Parses uploaded scripts in various formats (PDF, DOCX, plain text) into structured data representing acts, scenes, dialogue, and stage directions. The module extracts character names, identifies vocabulary words for educational content, and estimates runtime based on dialogue density.

2. Prompt Resolution Engine - Manages AI prompts through a versioned template system with organization-level customization. The engine implements multi-level caching with configurable TTL to minimize redundant API calls while ensuring prompt freshness.

[Reference to FIG. 6 - Prompt Resolution System]

3. Character Consistency Manager - Maintains reference images and detailed character profiles including physical descriptions, personality traits, and voice characteristics. The system enforces visual consistency across all generated assets by including reference data in generation prompts.

[Reference to FIG. 3 - Character Consistency Pipeline]

4. Storyboard Generation Module - Analyzes scenes to determine optimal shot composition including camera angles, shot types, and character positioning. The module generates image prompts incorporating style guides, character references, and scene-specific details.

[Reference to FIG. 2 - Script-to-Storyboard Workflow]

5. Voice Synthesis Integration - Supports multiple text-to-speech providers including ElevenLabs and Chatterbox. The system manages voice profiles, cloning capabilities, and emotion parameters to generate character-appropriate dialogue audio.

[Reference to FIG. 4 - Voice Synthesis and Lip Sync Flow]

6. Lip Synchronization Engine - Processes generated audio with still character images to produce lip-synchronized video sequences. The system supports multiple providers with automatic fallback capabilities.

7. Video Generation Pipeline - Coordinates the assembly of storyboard images, audio tracks, and lip-sync videos into completed scene renders. The system manages render jobs, tracks progress, and handles retry logic for failed operations.

[Reference to FIG. 5 - Video Generation and Assembly Workflow]

8. Cost Calculation Engine - Implements comprehensive cost modeling including AI service costs, human editing costs with asset decay curves, and comparison against traditional animation methods.

[Reference to FIG. 7 - Cost Calculation Flowchart]

Prompt Resolution with Caching

The prompt resolution system implements a hierarchical lookup strategy. When a prompt is requested, the system first checks the in-memory cache. If not found or expired, it queries the organization-specific prompt table. If no organization override exists, the system falls back to system default prompts.

The caching layer implements a configurable TTL (default 5 minutes) and supports selective cache invalidation when prompts are updated. This architecture balances prompt freshness with API efficiency.

Character Consistency Enforcement

Visual consistency is maintained through a multi-pronged approach. Each character has associated reference images stored in the asset management system. When generating new images, the system constructs prompts that include:
- Character physical descriptions from the consistency profile
- Style guide specifications for the series
- Reference image URLs for visual matching
- Scene-specific positioning and emotional state

Cost Modeling with Asset Decay

The cost calculation engine implements an asset decay model that accounts for efficiency gains over time. As more episodes are produced, reusable assets (character models, backgrounds, props) reduce the marginal cost of new content.

The decay function follows an exponential curve with a configurable floor:
multiplier = max(floor, decay_rate^(episode_number - 1))

This model reflects real-world observations that animation production becomes more efficient as asset libraries grow.

Multi-Provider Abstraction

The system implements provider abstraction layers for key services including:
- Image generation (supporting multiple AI image services)
- Voice synthesis (ElevenLabs, Chatterbox, extensible to others)
- Lip synchronization (SyncLabs, Veed.io, extensible)
- Video generation (Vertex AI Veo, extensible)

This architecture enables flexibility in service selection based on quality, cost, and availability considerations.

[Additional detailed descriptions would continue here for each subsystem]

CLAIMS

[See claims section]

ABSTRACT

[See abstract section]`;
}

export function generateDefaultAbstract(): string {
  return `A computer-implemented system and method for automated animation production using an integrated artificial intelligence pipeline. The system receives script inputs and automatically generates completed animated episodes through coordinated AI services including image generation, voice synthesis, and lip synchronization. Key innovations include a prompt resolution engine with multi-level caching, character consistency enforcement through reference image integration, cost modeling with asset decay curves, and multi-provider abstraction layers enabling flexible service selection. The system significantly reduces production time and cost compared to traditional animation methods while maintaining visual and audio quality suitable for broadcast distribution.`;
}

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function validateAbstract(abstract: string): { valid: boolean; wordCount: number; message: string } {
  const wordCount = countWords(abstract);
  if (wordCount === 0) {
    return { valid: false, wordCount, message: 'Abstract is required' };
  }
  if (wordCount > 150) {
    return { valid: false, wordCount, message: `Abstract exceeds 150 word limit (${wordCount} words)` };
  }
  return { valid: true, wordCount, message: `${wordCount}/150 words` };
}

export function getFilingTypeLabel(type: PatentApplication['filing_type']): string {
  const labels: Record<string, string> = {
    provisional: 'Provisional Application',
    non_provisional: 'Non-Provisional Application',
    continuation: 'Continuation Application',
    cip: 'Continuation-in-Part (CIP)',
    divisional: 'Divisional Application'
  };
  return labels[type] || type;
}

export function getStatusLabel(status: PatentApplication['status']): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    in_review: 'In Review',
    ready_to_file: 'Ready to File',
    filed: 'Filed',
    pending: 'Pending at USPTO',
    granted: 'Granted',
    rejected: 'Rejected',
    abandoned: 'Abandoned'
  };
  return labels[status] || status;
}

export function getStatusColor(status: PatentApplication['status']): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    in_review: 'bg-yellow-100 text-yellow-800',
    ready_to_file: 'bg-blue-100 text-blue-800',
    filed: 'bg-indigo-100 text-indigo-800',
    pending: 'bg-orange-100 text-orange-800',
    granted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    abandoned: 'bg-gray-200 text-gray-600'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
