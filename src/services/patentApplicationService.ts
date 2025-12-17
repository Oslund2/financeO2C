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
  // Structured specification fields
  field_of_invention: string | null;
  background_art: string | null;
  summary_invention: string | null;
  detailed_description: string | null;
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

export interface PriorArtSearchResult {
  id: string;
  patent_application_id: string;
  patent_number: string | null;
  patent_title: string | null;
  patent_abstract: string | null;
  relevance_score: number | null;
  similarity_explanation: string | null;
  is_blocking: boolean;
  created_at: string;
}

export interface PatentApplicationWithDetails extends PatentApplication {
  claims: PatentClaim[];
  drawings: PatentDrawing[];
  priorArt?: PriorArtSearchResult[];
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
    .select(`
      id,
      organization_id,
      title,
      filing_type,
      status,
      inventor_name,
      inventor_citizenship,
      specification,
      abstract,
      field_of_invention,
      background_art,
      summary_invention,
      detailed_description,
      prior_art_patents,
      prior_art_literature,
      metadata,
      version,
      created_at,
      updated_at,
      prior_art_search_status,
      prior_art_search_completed_at,
      novelty_score,
      novelty_analysis,
      differentiation_analysis,
      claims_generation_status,
      claims_generation_completed_at,
      drawings_generation_status,
      drawings_generation_completed_at,
      specification_generation_status,
      specification_generation_completed_at,
      full_application_status,
      full_application_completed_at
    `)
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

  const { data: priorArt, error: priorArtError } = await supabase
    .from('patent_prior_art_search_results')
    .select('*')
    .eq('patent_application_id', applicationId)
    .order('relevance_score', { ascending: false });

  if (priorArtError) console.error('Error loading prior art:', priorArtError);

  return {
    ...application,
    claims: claims || [],
    drawings: drawings || [],
    priorArt: priorArt || []
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
  console.log('createPatentDrawing called with:', {
    applicationId,
    figureNumber: drawing.figure_number,
    title: drawing.title,
    drawingType: drawing.drawing_type,
    calloutsCount: drawing.callouts?.length || 0,
    hasSvgContent: !!drawing.svg_content,
    svgLength: drawing.svg_content?.length || 0
  });

  const { data, error } = await supabase
    .from('patent_drawings')
    .insert([{
      application_id: applicationId,
      ...drawing
    }])
    .select()
    .single();

  if (error) {
    console.error('Patent drawing insert failed:', {
      error,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
      applicationId,
      figureNumber: drawing.figure_number
    });
    throw new Error(`Failed to create patent drawing: ${error.message} (Code: ${error.code})`);
  }

  console.log('Patent drawing created successfully:', {
    id: data.id,
    figureNumber: data.figure_number
  });

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

export async function deleteAllDrawingsForApplication(applicationId: string): Promise<void> {
  console.log(`Deleting all existing drawings for application ${applicationId}`);
  const { error } = await supabase
    .from('patent_drawings')
    .delete()
    .eq('application_id', applicationId);

  if (error) {
    console.error('Failed to delete existing drawings:', error);
    throw new Error(`Failed to delete existing drawings: ${error.message}`);
  }
  console.log('Existing drawings deleted successfully');
}

export function generateDefaultSpecification(): string {
  return `FIELD OF THE INVENTION

[To be completed. Describe the technical field and general area of the invention.]

BACKGROUND OF THE INVENTION

[To be completed. Describe existing solutions, their limitations, and the problems they fail to solve.]

SUMMARY OF THE INVENTION

[To be completed. Provide a concise overview of the invention and its key innovative aspects.]

DETAILED DESCRIPTION OF THE INVENTION

[To be completed. Provide comprehensive technical details, system architecture, embodiments, and operational descriptions. Reference patent drawings as appropriate.]

CLAIMS

[See Claims tab to generate and manage patent claims]

ABSTRACT

[See Abstract tab to generate the patent abstract]`;
}

export function generateDefaultAbstract(): string {
  return `[Abstract to be generated. Should concisely describe the invention in 92-150 words, including the technical problem, solution, and key advantages.]`;
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
