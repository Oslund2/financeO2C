import { supabase } from '../lib/supabase';

export interface HumanCreativeDecisions {
  conceptDevelopment?: string;
  creativeDirection?: string;
  narrativeStructure?: string;
  dialogueRefinement?: string;
  visualDirection?: string;
  characterDevelopment?: string;
  plotDecisions?: string;
}

export interface ModificationRecord {
  date: string;
  description: string;
  elementModified: string;
  modificationLevel: 'minor' | 'moderate' | 'significant' | 'substantial';
}

export interface EvidenceFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  description: string;
  uploadedAt: string;
}

export interface AIContributionAnalysis {
  overallScore: number;
  breakdown: {
    category: string;
    aiContribution: number;
    humanContribution: number;
    copyrightableElements: string[];
  }[];
}

export interface CopyrightableElement {
  element: string;
  description: string;
  humanContribution: string;
  isProtectable: boolean;
}

export interface AIAuthorshipDocumentation {
  id: string;
  registration_id: string;
  organization_id: string;
  ai_tool_name: string;
  ai_tool_provider: string | null;
  ai_tool_version: string | null;
  ai_tool_url: string | null;
  generation_date: string | null;
  generation_session_id: string | null;
  prompt_used: string | null;
  prompt_iterations: number;
  total_generations: number;
  selected_output_number: number | null;
  modification_percentage: number;
  modifications_made: ModificationRecord[];
  modification_description: string | null;
  human_creative_decisions: HumanCreativeDecisions;
  concept_development: string | null;
  creative_direction: string | null;
  narrative_structure: string | null;
  dialogue_refinement: string | null;
  visual_direction: string | null;
  character_development: string | null;
  plot_decisions: string | null;
  evidence_files: EvidenceFile[];
  drafts_preserved: boolean;
  draft_file_urls: string[];
  certification_statement: string | null;
  certification_date: string | null;
  certifier_name: string | null;
  certifier_title: string | null;
  ai_contribution_analysis: AIContributionAnalysis | null;
  human_contribution_analysis: Record<string, unknown> | null;
  copyrightable_elements: CopyrightableElement[] | null;
  non_copyrightable_elements: string[] | null;
  disclosure_compliant: boolean;
  copyright_office_compliant: boolean;
  compliance_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AIToolInfo {
  id: string;
  tool_name: string;
  provider: string;
  tool_type: string;
  description: string | null;
  copyright_considerations: string | null;
  terms_of_service_url: string | null;
  output_ownership: string | null;
  attribution_requirements: string | null;
  is_active: boolean;
}

export interface AIAuthorshipFormData {
  registrationId: string;
  aiToolName: string;
  aiToolProvider?: string;
  aiToolVersion?: string;
  aiToolUrl?: string;
  generationDate?: string;
  generationSessionId?: string;
  promptUsed?: string;
  promptIterations?: number;
  totalGenerations?: number;
  selectedOutputNumber?: number;
  modificationPercentage?: number;
  modificationsMade?: ModificationRecord[];
  modificationDescription?: string;
  humanCreativeDecisions?: HumanCreativeDecisions;
  conceptDevelopment?: string;
  creativeDirection?: string;
  narrativeStructure?: string;
  dialogueRefinement?: string;
  visualDirection?: string;
  characterDevelopment?: string;
  plotDecisions?: string;
  evidenceFiles?: EvidenceFile[];
  draftsPreserved?: boolean;
  draftFileUrls?: string[];
}

export async function createAIAuthorshipDocumentation(
  organizationId: string,
  formData: AIAuthorshipFormData
): Promise<AIAuthorshipDocumentation> {
  const { data: userData } = await supabase.auth.getUser();

  const insertData = {
    registration_id: formData.registrationId,
    organization_id: organizationId,
    ai_tool_name: formData.aiToolName,
    ai_tool_provider: formData.aiToolProvider || null,
    ai_tool_version: formData.aiToolVersion || null,
    ai_tool_url: formData.aiToolUrl || null,
    generation_date: formData.generationDate || null,
    generation_session_id: formData.generationSessionId || null,
    prompt_used: formData.promptUsed || null,
    prompt_iterations: formData.promptIterations || 1,
    total_generations: formData.totalGenerations || 1,
    selected_output_number: formData.selectedOutputNumber || null,
    modification_percentage: formData.modificationPercentage || 0,
    modifications_made: formData.modificationsMade || [],
    modification_description: formData.modificationDescription || null,
    human_creative_decisions: formData.humanCreativeDecisions || {},
    concept_development: formData.conceptDevelopment || null,
    creative_direction: formData.creativeDirection || null,
    narrative_structure: formData.narrativeStructure || null,
    dialogue_refinement: formData.dialogueRefinement || null,
    visual_direction: formData.visualDirection || null,
    character_development: formData.characterDevelopment || null,
    plot_decisions: formData.plotDecisions || null,
    evidence_files: formData.evidenceFiles || [],
    drafts_preserved: formData.draftsPreserved || false,
    draft_file_urls: formData.draftFileUrls || [],
    disclosure_compliant: false,
    copyright_office_compliant: false,
    created_by: userData?.user?.id || null
  };

  const { data, error } = await supabase
    .from('ai_authorship_documentation')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAIAuthorshipDocumentation(
  registrationId: string
): Promise<AIAuthorshipDocumentation | null> {
  const { data, error } = await supabase
    .from('ai_authorship_documentation')
    .select('*')
    .eq('registration_id', registrationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAIAuthorshipDocumentations(
  organizationId: string
): Promise<AIAuthorshipDocumentation[]> {
  const { data, error } = await supabase
    .from('ai_authorship_documentation')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateAIAuthorshipDocumentation(
  documentationId: string,
  updates: Partial<AIAuthorshipFormData>
): Promise<AIAuthorshipDocumentation> {
  const updateData: Record<string, unknown> = {};

  if (updates.aiToolName !== undefined) updateData.ai_tool_name = updates.aiToolName;
  if (updates.aiToolProvider !== undefined) updateData.ai_tool_provider = updates.aiToolProvider;
  if (updates.aiToolVersion !== undefined) updateData.ai_tool_version = updates.aiToolVersion;
  if (updates.aiToolUrl !== undefined) updateData.ai_tool_url = updates.aiToolUrl;
  if (updates.generationDate !== undefined) updateData.generation_date = updates.generationDate;
  if (updates.generationSessionId !== undefined) updateData.generation_session_id = updates.generationSessionId;
  if (updates.promptUsed !== undefined) updateData.prompt_used = updates.promptUsed;
  if (updates.promptIterations !== undefined) updateData.prompt_iterations = updates.promptIterations;
  if (updates.totalGenerations !== undefined) updateData.total_generations = updates.totalGenerations;
  if (updates.selectedOutputNumber !== undefined) updateData.selected_output_number = updates.selectedOutputNumber;
  if (updates.modificationPercentage !== undefined) updateData.modification_percentage = updates.modificationPercentage;
  if (updates.modificationsMade !== undefined) updateData.modifications_made = updates.modificationsMade;
  if (updates.modificationDescription !== undefined) updateData.modification_description = updates.modificationDescription;
  if (updates.humanCreativeDecisions !== undefined) updateData.human_creative_decisions = updates.humanCreativeDecisions;
  if (updates.conceptDevelopment !== undefined) updateData.concept_development = updates.conceptDevelopment;
  if (updates.creativeDirection !== undefined) updateData.creative_direction = updates.creativeDirection;
  if (updates.narrativeStructure !== undefined) updateData.narrative_structure = updates.narrativeStructure;
  if (updates.dialogueRefinement !== undefined) updateData.dialogue_refinement = updates.dialogueRefinement;
  if (updates.visualDirection !== undefined) updateData.visual_direction = updates.visualDirection;
  if (updates.characterDevelopment !== undefined) updateData.character_development = updates.characterDevelopment;
  if (updates.plotDecisions !== undefined) updateData.plot_decisions = updates.plotDecisions;
  if (updates.evidenceFiles !== undefined) updateData.evidence_files = updates.evidenceFiles;
  if (updates.draftsPreserved !== undefined) updateData.drafts_preserved = updates.draftsPreserved;
  if (updates.draftFileUrls !== undefined) updateData.draft_file_urls = updates.draftFileUrls;

  const { data, error } = await supabase
    .from('ai_authorship_documentation')
    .update(updateData)
    .eq('id', documentationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setCertification(
  documentationId: string,
  certificationStatement: string,
  certifierName: string,
  certifierTitle?: string
): Promise<AIAuthorshipDocumentation> {
  const { data, error } = await supabase
    .from('ai_authorship_documentation')
    .update({
      certification_statement: certificationStatement,
      certification_date: new Date().toISOString().split('T')[0],
      certifier_name: certifierName,
      certifier_title: certifierTitle || null,
      disclosure_compliant: true
    })
    .eq('id', documentationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setAnalysisResults(
  documentationId: string,
  aiContributionAnalysis: AIContributionAnalysis,
  copyrightableElements: CopyrightableElement[],
  nonCopyrightableElements: string[]
): Promise<AIAuthorshipDocumentation> {
  const { data, error } = await supabase
    .from('ai_authorship_documentation')
    .update({
      ai_contribution_analysis: aiContributionAnalysis,
      copyrightable_elements: copyrightableElements,
      non_copyrightable_elements: nonCopyrightableElements
    })
    .eq('id', documentationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markCopyrightOfficeCompliant(
  documentationId: string,
  complianceNotes?: string
): Promise<AIAuthorshipDocumentation> {
  const { data, error } = await supabase
    .from('ai_authorship_documentation')
    .update({
      copyright_office_compliant: true,
      compliance_notes: complianceNotes || null
    })
    .eq('id', documentationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAIAuthorshipDocumentation(
  documentationId: string
): Promise<void> {
  const { error } = await supabase
    .from('ai_authorship_documentation')
    .delete()
    .eq('id', documentationId);

  if (error) throw error;
}

export async function getAIToolRegistry(): Promise<AIToolInfo[]> {
  const { data, error } = await supabase
    .from('ai_tool_registry')
    .select('*')
    .eq('is_active', true)
    .order('tool_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAIToolByName(
  toolName: string,
  provider: string
): Promise<AIToolInfo | null> {
  const { data, error } = await supabase
    .from('ai_tool_registry')
    .select('*')
    .eq('tool_name', toolName)
    .eq('provider', provider)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function analyzeAIContribution(
  documentation: AIAuthorshipDocumentation
): AIContributionAnalysis {
  const categories: AIContributionAnalysis['breakdown'] = [];

  if (documentation.concept_development) {
    categories.push({
      category: 'Concept Development',
      aiContribution: 20,
      humanContribution: 80,
      copyrightableElements: ['Original story concept', 'Thematic elements']
    });
  }

  if (documentation.character_development) {
    categories.push({
      category: 'Character Development',
      aiContribution: 30,
      humanContribution: 70,
      copyrightableElements: ['Character personalities', 'Character relationships', 'Character arcs']
    });
  }

  if (documentation.narrative_structure) {
    categories.push({
      category: 'Narrative Structure',
      aiContribution: 40,
      humanContribution: 60,
      copyrightableElements: ['Plot structure', 'Scene sequencing']
    });
  }

  if (documentation.dialogue_refinement) {
    categories.push({
      category: 'Dialogue',
      aiContribution: documentation.modification_percentage > 50 ? 30 : 60,
      humanContribution: documentation.modification_percentage > 50 ? 70 : 40,
      copyrightableElements: ['Unique dialogue', 'Character voice']
    });
  }

  if (documentation.visual_direction) {
    categories.push({
      category: 'Visual Direction',
      aiContribution: 25,
      humanContribution: 75,
      copyrightableElements: ['Visual style choices', 'Scene composition']
    });
  }

  const totalAI = categories.reduce((sum, c) => sum + c.aiContribution, 0);
  const totalHuman = categories.reduce((sum, c) => sum + c.humanContribution, 0);
  const overallScore = categories.length > 0 ? Math.round(totalHuman / categories.length) : 0;

  return {
    overallScore,
    breakdown: categories
  };
}

export function generateHumanAuthorshipStatement(
  documentation: AIAuthorshipDocumentation
): string {
  const elements: string[] = [];

  if (documentation.concept_development) {
    elements.push('the original concept and creative vision');
  }
  if (documentation.character_development) {
    elements.push('all character development, personalities, and relationships');
  }
  if (documentation.narrative_structure) {
    elements.push('the narrative structure and plot organization');
  }
  if (documentation.dialogue_refinement) {
    elements.push('dialogue refinement and character voice');
  }
  if (documentation.creative_direction) {
    elements.push('overall creative direction and artistic choices');
  }
  if (documentation.visual_direction) {
    elements.push('visual direction and scene composition');
  }

  if (elements.length === 0) {
    return 'The author made substantial creative contributions to this work.';
  }

  const lastElement = elements.pop();
  const elementList = elements.length > 0
    ? `${elements.join(', ')}, and ${lastElement}`
    : lastElement;

  return `The human author contributed ${elementList}. While AI tools were used to assist in the creation process, all creative decisions, artistic expression, and final selections were made by the human author. The copyrightable elements of this work represent the author's original creative expression.`;
}

export function generateAIDisclosureStatement(
  documentation: AIAuthorshipDocumentation
): string {
  const toolInfo = documentation.ai_tool_provider
    ? `${documentation.ai_tool_name} by ${documentation.ai_tool_provider}`
    : documentation.ai_tool_name;

  const versionInfo = documentation.ai_tool_version
    ? ` (version ${documentation.ai_tool_version})`
    : '';

  let statement = `This work was created with the assistance of ${toolInfo}${versionInfo}. `;

  if (documentation.prompt_iterations && documentation.prompt_iterations > 1) {
    statement += `The AI tool was used over ${documentation.prompt_iterations} iterations. `;
  }

  if (documentation.modification_percentage > 0) {
    statement += `Approximately ${documentation.modification_percentage}% of the AI-generated content was modified by the human author. `;
  }

  statement += 'The human author exercised creative control over all aspects of the final work, including concept development, selection, arrangement, and modification of AI-generated elements.';

  return statement;
}

export function validateDocumentationCompleteness(
  documentation: AIAuthorshipDocumentation
): { isComplete: boolean; missingFields: string[]; recommendations: string[] } {
  const missingFields: string[] = [];
  const recommendations: string[] = [];

  if (!documentation.ai_tool_name) missingFields.push('AI Tool Name');
  if (!documentation.generation_date) missingFields.push('Generation Date');

  const hasCreativeDocumentation =
    documentation.concept_development ||
    documentation.creative_direction ||
    documentation.character_development ||
    documentation.narrative_structure ||
    documentation.dialogue_refinement ||
    documentation.visual_direction ||
    documentation.plot_decisions;

  if (!hasCreativeDocumentation) {
    missingFields.push('Human Creative Contributions');
    recommendations.push('Document at least one area of human creative contribution');
  }

  if (!documentation.certification_statement) {
    missingFields.push('Certification Statement');
    recommendations.push('Add a certification statement affirming human authorship');
  }

  if (documentation.modification_percentage < 20) {
    recommendations.push('Consider documenting more substantial human modifications to strengthen copyright claim');
  }

  if (!documentation.drafts_preserved && documentation.modifications_made.length === 0) {
    recommendations.push('Preserve drafts or document specific modifications as evidence of human creative input');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    recommendations
  };
}

export function identifyCopyrightableElements(
  documentation: AIAuthorshipDocumentation
): CopyrightableElement[] {
  const elements: CopyrightableElement[] = [];

  if (documentation.concept_development) {
    elements.push({
      element: 'Original Concept',
      description: 'The underlying creative concept and premise',
      humanContribution: documentation.concept_development,
      isProtectable: true
    });
  }

  if (documentation.character_development) {
    elements.push({
      element: 'Character Expression',
      description: 'Distinctive character traits, personalities, and development',
      humanContribution: documentation.character_development,
      isProtectable: true
    });
  }

  if (documentation.narrative_structure) {
    elements.push({
      element: 'Narrative Structure',
      description: 'The specific arrangement and structure of the story',
      humanContribution: documentation.narrative_structure,
      isProtectable: true
    });
  }

  if (documentation.dialogue_refinement) {
    elements.push({
      element: 'Dialogue',
      description: 'Specific dialogue and character voice',
      humanContribution: documentation.dialogue_refinement,
      isProtectable: documentation.modification_percentage >= 30
    });
  }

  if (documentation.creative_direction) {
    elements.push({
      element: 'Creative Direction',
      description: 'Overall artistic vision and creative choices',
      humanContribution: documentation.creative_direction,
      isProtectable: true
    });
  }

  return elements;
}
