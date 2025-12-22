import { supabase } from '../lib/supabase';

export type CopyrightRegistrationType = 'script' | 'character' | 'series' | 'collection' | 'episode';
export type CopyrightWorkType = 'dramatic_work' | 'visual_art' | 'literary_work' | 'audiovisual' | 'motion_picture' | 'sound_recording' | 'compilation';
export type CopyrightStatus = 'draft' | 'pending_review' | 'submitted' | 'under_examination' | 'registered' | 'rejected' | 'abandoned';
export type PublicationStatus = 'unpublished' | 'published' | 'published_with_notice' | 'published_without_notice';
export type AuthorType = 'individual' | 'work_for_hire' | 'joint_work' | 'collective_work' | 'anonymous' | 'pseudonymous';

export interface ClaimantAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface AIToolDetail {
  name: string;
  provider: string;
  version?: string;
  usageDescription: string;
}

export interface HumanCreativeElement {
  element: string;
  description: string;
  contributionLevel: 'primary' | 'significant' | 'moderate' | 'minor';
}

export interface CopyrightRegistration {
  id: string;
  organization_id: string;
  title: string;
  alternate_titles: string[];
  registration_type: CopyrightRegistrationType;
  work_type: CopyrightWorkType;
  status: CopyrightStatus;
  description: string | null;
  year_of_completion: number | null;
  creation_date: string | null;
  publication_status: PublicationStatus;
  publication_date: string | null;
  publication_country: string | null;
  publication_details: string | null;
  author_name: string;
  author_citizenship: string | null;
  author_domicile: string | null;
  author_birth_year: number | null;
  author_death_year: number | null;
  author_type: AuthorType;
  is_anonymous: boolean;
  is_pseudonymous: boolean;
  pseudonym: string | null;
  nature_of_authorship: string | null;
  claimant_name: string | null;
  claimant_address: ClaimantAddress | null;
  claimant_type: string;
  transfer_statement: string | null;
  contains_ai_generated_content: boolean;
  ai_contribution_percentage: number;
  ai_tools_used: string[];
  ai_tool_details: AIToolDetail[] | null;
  human_authorship_statement: string | null;
  human_creative_elements: HumanCreativeElement[] | null;
  ai_disclosure_statement: string | null;
  ai_documentation_complete: boolean;
  source_script_id: string | null;
  source_character_id: string | null;
  source_series_id: string | null;
  source_episode_id: string | null;
  application_data: Record<string, unknown> | null;
  application_fee: number | null;
  fee_paid: boolean;
  payment_date: string | null;
  payment_reference: string | null;
  submission_date: string | null;
  registration_number: string | null;
  registration_date: string | null;
  certificate_url: string | null;
  examiner_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CopyrightDeposit {
  id: string;
  registration_id: string;
  deposit_type: 'identifying_material' | 'complete_copy' | 'best_edition' | 'supplementary';
  deposit_category: string | null;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  file_hash: string | null;
  submission_status: 'pending' | 'uploaded' | 'submitted' | 'accepted' | 'rejected';
  submitted_at: string | null;
  accepted_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CopyrightSearchResult {
  id: string;
  organization_id: string;
  registration_id: string | null;
  search_query: string;
  search_type: 'title' | 'author' | 'keyword' | 'registration_number' | 'comprehensive';
  search_date: string;
  results: unknown[];
  total_results: number;
  relevance_scores: Record<string, number> | null;
  similarity_analysis: Record<string, unknown> | null;
  conflict_assessment: string | null;
  conflict_risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CopyrightRegistrationFormData {
  title: string;
  alternateTitles?: string[];
  registrationType: CopyrightRegistrationType;
  workType: CopyrightWorkType;
  description?: string;
  yearOfCompletion?: number;
  creationDate?: string;
  publicationStatus: PublicationStatus;
  publicationDate?: string;
  publicationCountry?: string;
  publicationDetails?: string;
  authorName: string;
  authorCitizenship?: string;
  authorDomicile?: string;
  authorBirthYear?: number;
  authorType: AuthorType;
  isAnonymous?: boolean;
  isPseudonymous?: boolean;
  pseudonym?: string;
  natureOfAuthorship?: string;
  claimantName?: string;
  claimantAddress?: ClaimantAddress;
  claimantType?: string;
  transferStatement?: string;
  containsAIGeneratedContent?: boolean;
  aiContributionPercentage?: number;
  aiToolsUsed?: string[];
  aiToolDetails?: AIToolDetail[];
  humanAuthorshipStatement?: string;
  humanCreativeElements?: HumanCreativeElement[];
  aiDisclosureStatement?: string;
  sourceScriptId?: string;
  sourceCharacterId?: string;
  sourceSeriesId?: string;
  sourceEpisodeId?: string;
}

export const WORK_TYPE_FORM_MAP: Record<CopyrightWorkType, string> = {
  dramatic_work: 'Form PA',
  visual_art: 'Form VA',
  literary_work: 'Form TX',
  audiovisual: 'Form PA',
  motion_picture: 'Form PA',
  sound_recording: 'Form SR',
  compilation: 'Form TX/VA'
};

export const REGISTRATION_FEES = {
  online_single: 45,
  online_standard: 65,
  paper_single: 125,
  paper_standard: 125,
  group_registration: 85
};

export async function createCopyrightRegistration(
  organizationId: string,
  formData: CopyrightRegistrationFormData
): Promise<CopyrightRegistration> {
  const { data: userData } = await supabase.auth.getUser();

  const insertData = {
    organization_id: organizationId,
    title: formData.title,
    alternate_titles: formData.alternateTitles || [],
    registration_type: formData.registrationType,
    work_type: formData.workType,
    status: 'draft' as CopyrightStatus,
    description: formData.description || null,
    year_of_completion: formData.yearOfCompletion || null,
    creation_date: formData.creationDate || null,
    publication_status: formData.publicationStatus,
    publication_date: formData.publicationDate || null,
    publication_country: formData.publicationCountry || null,
    publication_details: formData.publicationDetails || null,
    author_name: formData.authorName,
    author_citizenship: formData.authorCitizenship || null,
    author_domicile: formData.authorDomicile || null,
    author_birth_year: formData.authorBirthYear || null,
    author_type: formData.authorType,
    is_anonymous: formData.isAnonymous || false,
    is_pseudonymous: formData.isPseudonymous || false,
    pseudonym: formData.pseudonym || null,
    nature_of_authorship: formData.natureOfAuthorship || null,
    claimant_name: formData.claimantName || null,
    claimant_address: formData.claimantAddress || null,
    claimant_type: formData.claimantType || 'individual',
    transfer_statement: formData.transferStatement || null,
    contains_ai_generated_content: formData.containsAIGeneratedContent || false,
    ai_contribution_percentage: formData.aiContributionPercentage || 0,
    ai_tools_used: formData.aiToolsUsed || [],
    ai_tool_details: formData.aiToolDetails || null,
    human_authorship_statement: formData.humanAuthorshipStatement || null,
    human_creative_elements: formData.humanCreativeElements || null,
    ai_disclosure_statement: formData.aiDisclosureStatement || null,
    ai_documentation_complete: false,
    source_script_id: formData.sourceScriptId || null,
    source_character_id: formData.sourceCharacterId || null,
    source_series_id: formData.sourceSeriesId || null,
    source_episode_id: formData.sourceEpisodeId || null,
    created_by: userData?.user?.id || null
  };

  const { data, error } = await supabase
    .from('copyright_registrations')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCopyrightRegistrations(
  organizationId: string
): Promise<CopyrightRegistration[]> {
  const { data, error } = await supabase
    .from('copyright_registrations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCopyrightRegistration(
  registrationId: string
): Promise<CopyrightRegistration | null> {
  const { data, error } = await supabase
    .from('copyright_registrations')
    .select('*')
    .eq('id', registrationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateCopyrightRegistration(
  registrationId: string,
  updates: Partial<CopyrightRegistrationFormData>
): Promise<CopyrightRegistration> {
  const updateData: Record<string, unknown> = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.alternateTitles !== undefined) updateData.alternate_titles = updates.alternateTitles;
  if (updates.registrationType !== undefined) updateData.registration_type = updates.registrationType;
  if (updates.workType !== undefined) updateData.work_type = updates.workType;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.yearOfCompletion !== undefined) updateData.year_of_completion = updates.yearOfCompletion;
  if (updates.creationDate !== undefined) updateData.creation_date = updates.creationDate;
  if (updates.publicationStatus !== undefined) updateData.publication_status = updates.publicationStatus;
  if (updates.publicationDate !== undefined) updateData.publication_date = updates.publicationDate;
  if (updates.publicationCountry !== undefined) updateData.publication_country = updates.publicationCountry;
  if (updates.publicationDetails !== undefined) updateData.publication_details = updates.publicationDetails;
  if (updates.authorName !== undefined) updateData.author_name = updates.authorName;
  if (updates.authorCitizenship !== undefined) updateData.author_citizenship = updates.authorCitizenship;
  if (updates.authorDomicile !== undefined) updateData.author_domicile = updates.authorDomicile;
  if (updates.authorBirthYear !== undefined) updateData.author_birth_year = updates.authorBirthYear;
  if (updates.authorType !== undefined) updateData.author_type = updates.authorType;
  if (updates.isAnonymous !== undefined) updateData.is_anonymous = updates.isAnonymous;
  if (updates.isPseudonymous !== undefined) updateData.is_pseudonymous = updates.isPseudonymous;
  if (updates.pseudonym !== undefined) updateData.pseudonym = updates.pseudonym;
  if (updates.natureOfAuthorship !== undefined) updateData.nature_of_authorship = updates.natureOfAuthorship;
  if (updates.claimantName !== undefined) updateData.claimant_name = updates.claimantName;
  if (updates.claimantAddress !== undefined) updateData.claimant_address = updates.claimantAddress;
  if (updates.claimantType !== undefined) updateData.claimant_type = updates.claimantType;
  if (updates.transferStatement !== undefined) updateData.transfer_statement = updates.transferStatement;
  if (updates.containsAIGeneratedContent !== undefined) updateData.contains_ai_generated_content = updates.containsAIGeneratedContent;
  if (updates.aiContributionPercentage !== undefined) updateData.ai_contribution_percentage = updates.aiContributionPercentage;
  if (updates.aiToolsUsed !== undefined) updateData.ai_tools_used = updates.aiToolsUsed;
  if (updates.aiToolDetails !== undefined) updateData.ai_tool_details = updates.aiToolDetails;
  if (updates.humanAuthorshipStatement !== undefined) updateData.human_authorship_statement = updates.humanAuthorshipStatement;
  if (updates.humanCreativeElements !== undefined) updateData.human_creative_elements = updates.humanCreativeElements;
  if (updates.aiDisclosureStatement !== undefined) updateData.ai_disclosure_statement = updates.aiDisclosureStatement;
  if (updates.sourceScriptId !== undefined) updateData.source_script_id = updates.sourceScriptId;
  if (updates.sourceCharacterId !== undefined) updateData.source_character_id = updates.sourceCharacterId;
  if (updates.sourceSeriesId !== undefined) updateData.source_series_id = updates.sourceSeriesId;
  if (updates.sourceEpisodeId !== undefined) updateData.source_episode_id = updates.sourceEpisodeId;

  const { data, error } = await supabase
    .from('copyright_registrations')
    .update(updateData)
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCopyrightStatus(
  registrationId: string,
  status: CopyrightStatus
): Promise<CopyrightRegistration> {
  const { data, error } = await supabase
    .from('copyright_registrations')
    .update({ status })
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCopyrightRegistration(
  registrationId: string
): Promise<void> {
  const { error } = await supabase
    .from('copyright_registrations')
    .delete()
    .eq('id', registrationId);

  if (error) throw error;
}

export async function addCopyrightDeposit(
  registrationId: string,
  deposit: Omit<CopyrightDeposit, 'id' | 'registration_id' | 'created_at' | 'updated_at'>
): Promise<CopyrightDeposit> {
  const { data, error } = await supabase
    .from('copyright_deposits')
    .insert({
      registration_id: registrationId,
      ...deposit
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCopyrightDeposits(
  registrationId: string
): Promise<CopyrightDeposit[]> {
  const { data, error } = await supabase
    .from('copyright_deposits')
    .select('*')
    .eq('registration_id', registrationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteCopyrightDeposit(depositId: string): Promise<void> {
  const { error } = await supabase
    .from('copyright_deposits')
    .delete()
    .eq('id', depositId);

  if (error) throw error;
}

export async function saveCopyrightSearchResult(
  organizationId: string,
  registrationId: string | null,
  searchData: {
    searchQuery: string;
    searchType: CopyrightSearchResult['search_type'];
    results: unknown[];
    totalResults: number;
    relevanceScores?: Record<string, number>;
    similarityAnalysis?: Record<string, unknown>;
    conflictAssessment?: string;
    conflictRiskLevel?: CopyrightSearchResult['conflict_risk_level'];
    recommendation?: string;
  }
): Promise<CopyrightSearchResult> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('copyright_search_results')
    .insert({
      organization_id: organizationId,
      registration_id: registrationId,
      search_query: searchData.searchQuery,
      search_type: searchData.searchType,
      results: searchData.results,
      total_results: searchData.totalResults,
      relevance_scores: searchData.relevanceScores || null,
      similarity_analysis: searchData.similarityAnalysis || null,
      conflict_assessment: searchData.conflictAssessment || null,
      conflict_risk_level: searchData.conflictRiskLevel || 'low',
      recommendation: searchData.recommendation || null,
      created_by: userData?.user?.id || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCopyrightSearchResults(
  organizationId: string,
  registrationId?: string
): Promise<CopyrightSearchResult[]> {
  let query = supabase
    .from('copyright_search_results')
    .select('*')
    .eq('organization_id', organizationId);

  if (registrationId) {
    query = query.eq('registration_id', registrationId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export function calculateCopyrightFee(
  filingMethod: 'online' | 'paper',
  isSingleAuthor: boolean,
  isGroupRegistration: boolean
): number {
  if (isGroupRegistration) {
    return REGISTRATION_FEES.group_registration;
  }

  if (filingMethod === 'online') {
    return isSingleAuthor ? REGISTRATION_FEES.online_single : REGISTRATION_FEES.online_standard;
  }

  return isSingleAuthor ? REGISTRATION_FEES.paper_single : REGISTRATION_FEES.paper_standard;
}

export function getRequiredForm(workType: CopyrightWorkType): string {
  return WORK_TYPE_FORM_MAP[workType];
}

export function validateRegistrationCompleteness(
  registration: CopyrightRegistration
): { isComplete: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  if (!registration.title) missingFields.push('Title');
  if (!registration.author_name) missingFields.push('Author Name');
  if (!registration.work_type) missingFields.push('Work Type');

  if (registration.publication_status !== 'unpublished') {
    if (!registration.publication_date) missingFields.push('Publication Date');
    if (!registration.publication_country) missingFields.push('Publication Country');
  }

  if (registration.contains_ai_generated_content) {
    if (!registration.human_authorship_statement) missingFields.push('Human Authorship Statement');
    if (!registration.ai_disclosure_statement) missingFields.push('AI Disclosure Statement');
    if (!registration.ai_documentation_complete) missingFields.push('AI Documentation');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
}

export function generateCopyrightNotice(
  year: number,
  ownerName: string
): string {
  return `Copyright ${year} ${ownerName}. All rights reserved.`;
}

export function generatePoorMansNotice(
  title: string,
  year: number,
  ownerName: string
): string {
  return `This work, "${title}", was created by ${ownerName} in ${year}. ` +
    `All rights are reserved under applicable copyright laws.`;
}
