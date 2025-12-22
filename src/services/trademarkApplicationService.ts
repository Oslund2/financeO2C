import { supabase } from '../lib/supabase';

export type MarkType = 'word_mark' | 'design_mark' | 'combined_mark' | 'sound_mark' | 'motion_mark';
export type FilingBasis = 'use_in_commerce' | 'intent_to_use' | 'foreign_registration' | 'foreign_application';
export type OwnerType = 'individual' | 'corporation' | 'llc' | 'partnership' | 'trust' | 'joint_venture' | 'other';
export type TrademarkStatus = 'draft' | 'pending_review' | 'filed' | 'published' | 'opposed' | 'registered' | 'abandoned' | 'cancelled' | 'expired';
export type SpecimenType = 'product_label' | 'product_tag' | 'product_packaging' | 'product_display' | 'website_screenshot' | 'advertisement' | 'brochure' | 'promotional_material' | 'store_signage' | 'other';

export interface OwnerAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface AttorneyInfo {
  name: string;
  barMembership: string;
  email: string;
  address?: OwnerAddress;
}

export interface TrademarkApplication {
  id: string;
  organization_id: string;
  mark_type: MarkType;
  mark_text: string | null;
  mark_description: string | null;
  mark_image_url: string | null;
  design_search_codes: string[];
  mark_colors: string[];
  color_claim: string | null;
  is_stylized: boolean;
  translation: string | null;
  transliteration: string | null;
  international_class: number;
  additional_classes: number[];
  goods_services_description: string;
  filing_basis: FilingBasis;
  first_use_date: string | null;
  first_use_commerce_date: string | null;
  foreign_registration_country: string | null;
  foreign_registration_number: string | null;
  foreign_registration_date: string | null;
  foreign_application_country: string | null;
  foreign_application_number: string | null;
  foreign_application_date: string | null;
  owner_name: string;
  owner_type: OwnerType;
  owner_citizenship: string | null;
  owner_state_of_organization: string | null;
  owner_address: OwnerAddress | null;
  attorney_name: string | null;
  attorney_bar_membership: string | null;
  attorney_email: string | null;
  attorney_address: OwnerAddress | null;
  source_character_id: string | null;
  source_series_id: string | null;
  status: TrademarkStatus;
  status_date: string;
  serial_number: string | null;
  filing_date: string | null;
  publication_date: string | null;
  registration_number: string | null;
  registration_date: string | null;
  office_action_date: string | null;
  office_action_response_due: string | null;
  office_action_details: Record<string, unknown> | null;
  examiner_name: string | null;
  examiner_notes: string | null;
  application_fee: number | null;
  fee_paid: boolean;
  payment_date: string | null;
  payment_reference: string | null;
  declaration_of_use_due: string | null;
  renewal_due: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TrademarkSpecimen {
  id: string;
  application_id: string;
  specimen_type: SpecimenType;
  class_number: number;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  use_date: string | null;
  use_location: string | null;
  submission_status: 'pending' | 'uploaded' | 'submitted' | 'accepted' | 'rejected';
  submitted_at: string | null;
  accepted_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrademarkSearchResult {
  id: string;
  organization_id: string;
  application_id: string | null;
  search_query: string;
  search_type: 'knockout' | 'comprehensive' | 'design_code' | 'phonetic' | 'goods_services';
  search_date: string;
  results: unknown[];
  total_results: number;
  phonetic_matches: unknown[] | null;
  visual_matches: unknown[] | null;
  conceptual_matches: unknown[] | null;
  likelihood_of_confusion_score: number | null;
  conflict_analysis: string | null;
  conflict_risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NiceClassification {
  class_number: number;
  class_heading: string;
  class_description: string;
  example_goods_services: string[];
  common_terms: string[];
  notes: string | null;
}

export interface TrademarkApplicationFormData {
  markType: MarkType;
  markText?: string;
  markDescription?: string;
  markImageUrl?: string;
  designSearchCodes?: string[];
  markColors?: string[];
  colorClaim?: string;
  isStylized?: boolean;
  translation?: string;
  transliteration?: string;
  internationalClass: number;
  additionalClasses?: number[];
  goodsServicesDescription: string;
  filingBasis: FilingBasis;
  firstUseDate?: string;
  firstUseCommerceDate?: string;
  foreignRegistrationCountry?: string;
  foreignRegistrationNumber?: string;
  foreignRegistrationDate?: string;
  foreignApplicationCountry?: string;
  foreignApplicationNumber?: string;
  foreignApplicationDate?: string;
  ownerName: string;
  ownerType: OwnerType;
  ownerCitizenship?: string;
  ownerStateOfOrganization?: string;
  ownerAddress?: OwnerAddress;
  attorneyName?: string;
  attorneyBarMembership?: string;
  attorneyEmail?: string;
  attorneyAddress?: OwnerAddress;
  sourceCharacterId?: string;
  sourceSeriesId?: string;
}

export const TEAS_FILING_FEES = {
  teas_plus: 250,
  teas_standard: 350,
  teas_rf: 350,
  additional_class: 250
};

export async function createTrademarkApplication(
  organizationId: string,
  formData: TrademarkApplicationFormData
): Promise<TrademarkApplication> {
  const { data: userData } = await supabase.auth.getUser();

  const insertData = {
    organization_id: organizationId,
    mark_type: formData.markType,
    mark_text: formData.markText || null,
    mark_description: formData.markDescription || null,
    mark_image_url: formData.markImageUrl || null,
    design_search_codes: formData.designSearchCodes || [],
    mark_colors: formData.markColors || [],
    color_claim: formData.colorClaim || null,
    is_stylized: formData.isStylized || false,
    translation: formData.translation || null,
    transliteration: formData.transliteration || null,
    international_class: formData.internationalClass,
    additional_classes: formData.additionalClasses || [],
    goods_services_description: formData.goodsServicesDescription,
    filing_basis: formData.filingBasis,
    first_use_date: formData.firstUseDate || null,
    first_use_commerce_date: formData.firstUseCommerceDate || null,
    foreign_registration_country: formData.foreignRegistrationCountry || null,
    foreign_registration_number: formData.foreignRegistrationNumber || null,
    foreign_registration_date: formData.foreignRegistrationDate || null,
    foreign_application_country: formData.foreignApplicationCountry || null,
    foreign_application_number: formData.foreignApplicationNumber || null,
    foreign_application_date: formData.foreignApplicationDate || null,
    owner_name: formData.ownerName,
    owner_type: formData.ownerType,
    owner_citizenship: formData.ownerCitizenship || null,
    owner_state_of_organization: formData.ownerStateOfOrganization || null,
    owner_address: formData.ownerAddress || null,
    attorney_name: formData.attorneyName || null,
    attorney_bar_membership: formData.attorneyBarMembership || null,
    attorney_email: formData.attorneyEmail || null,
    attorney_address: formData.attorneyAddress || null,
    source_character_id: formData.sourceCharacterId || null,
    source_series_id: formData.sourceSeriesId || null,
    status: 'draft' as TrademarkStatus,
    created_by: userData?.user?.id || null
  };

  const { data, error } = await supabase
    .from('trademark_applications')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTrademarkApplications(
  organizationId: string
): Promise<TrademarkApplication[]> {
  const { data, error } = await supabase
    .from('trademark_applications')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTrademarkApplication(
  applicationId: string
): Promise<TrademarkApplication | null> {
  const { data, error } = await supabase
    .from('trademark_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateTrademarkApplication(
  applicationId: string,
  updates: Partial<TrademarkApplicationFormData>
): Promise<TrademarkApplication> {
  const updateData: Record<string, unknown> = {};

  if (updates.markType !== undefined) updateData.mark_type = updates.markType;
  if (updates.markText !== undefined) updateData.mark_text = updates.markText;
  if (updates.markDescription !== undefined) updateData.mark_description = updates.markDescription;
  if (updates.markImageUrl !== undefined) updateData.mark_image_url = updates.markImageUrl;
  if (updates.designSearchCodes !== undefined) updateData.design_search_codes = updates.designSearchCodes;
  if (updates.markColors !== undefined) updateData.mark_colors = updates.markColors;
  if (updates.colorClaim !== undefined) updateData.color_claim = updates.colorClaim;
  if (updates.isStylized !== undefined) updateData.is_stylized = updates.isStylized;
  if (updates.translation !== undefined) updateData.translation = updates.translation;
  if (updates.transliteration !== undefined) updateData.transliteration = updates.transliteration;
  if (updates.internationalClass !== undefined) updateData.international_class = updates.internationalClass;
  if (updates.additionalClasses !== undefined) updateData.additional_classes = updates.additionalClasses;
  if (updates.goodsServicesDescription !== undefined) updateData.goods_services_description = updates.goodsServicesDescription;
  if (updates.filingBasis !== undefined) updateData.filing_basis = updates.filingBasis;
  if (updates.firstUseDate !== undefined) updateData.first_use_date = updates.firstUseDate;
  if (updates.firstUseCommerceDate !== undefined) updateData.first_use_commerce_date = updates.firstUseCommerceDate;
  if (updates.foreignRegistrationCountry !== undefined) updateData.foreign_registration_country = updates.foreignRegistrationCountry;
  if (updates.foreignRegistrationNumber !== undefined) updateData.foreign_registration_number = updates.foreignRegistrationNumber;
  if (updates.foreignRegistrationDate !== undefined) updateData.foreign_registration_date = updates.foreignRegistrationDate;
  if (updates.foreignApplicationCountry !== undefined) updateData.foreign_application_country = updates.foreignApplicationCountry;
  if (updates.foreignApplicationNumber !== undefined) updateData.foreign_application_number = updates.foreignApplicationNumber;
  if (updates.foreignApplicationDate !== undefined) updateData.foreign_application_date = updates.foreignApplicationDate;
  if (updates.ownerName !== undefined) updateData.owner_name = updates.ownerName;
  if (updates.ownerType !== undefined) updateData.owner_type = updates.ownerType;
  if (updates.ownerCitizenship !== undefined) updateData.owner_citizenship = updates.ownerCitizenship;
  if (updates.ownerStateOfOrganization !== undefined) updateData.owner_state_of_organization = updates.ownerStateOfOrganization;
  if (updates.ownerAddress !== undefined) updateData.owner_address = updates.ownerAddress;
  if (updates.attorneyName !== undefined) updateData.attorney_name = updates.attorneyName;
  if (updates.attorneyBarMembership !== undefined) updateData.attorney_bar_membership = updates.attorneyBarMembership;
  if (updates.attorneyEmail !== undefined) updateData.attorney_email = updates.attorneyEmail;
  if (updates.attorneyAddress !== undefined) updateData.attorney_address = updates.attorneyAddress;
  if (updates.sourceCharacterId !== undefined) updateData.source_character_id = updates.sourceCharacterId;
  if (updates.sourceSeriesId !== undefined) updateData.source_series_id = updates.sourceSeriesId;

  const { data, error } = await supabase
    .from('trademark_applications')
    .update(updateData)
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrademarkStatus(
  applicationId: string,
  status: TrademarkStatus
): Promise<TrademarkApplication> {
  const { data, error } = await supabase
    .from('trademark_applications')
    .update({ status, status_date: new Date().toISOString() })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTrademarkApplication(
  applicationId: string
): Promise<void> {
  const { error } = await supabase
    .from('trademark_applications')
    .delete()
    .eq('id', applicationId);

  if (error) throw error;
}

export async function addTrademarkSpecimen(
  applicationId: string,
  specimen: Omit<TrademarkSpecimen, 'id' | 'application_id' | 'created_at' | 'updated_at'>
): Promise<TrademarkSpecimen> {
  const { data, error } = await supabase
    .from('trademark_specimens')
    .insert({
      application_id: applicationId,
      ...specimen
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTrademarkSpecimens(
  applicationId: string
): Promise<TrademarkSpecimen[]> {
  const { data, error } = await supabase
    .from('trademark_specimens')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteTrademarkSpecimen(specimenId: string): Promise<void> {
  const { error } = await supabase
    .from('trademark_specimens')
    .delete()
    .eq('id', specimenId);

  if (error) throw error;
}

export async function getNiceClassifications(): Promise<NiceClassification[]> {
  const { data, error } = await supabase
    .from('nice_classifications')
    .select('*')
    .order('class_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getNiceClassification(
  classNumber: number
): Promise<NiceClassification | null> {
  const { data, error } = await supabase
    .from('nice_classifications')
    .select('*')
    .eq('class_number', classNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function searchNiceClassifications(
  query: string
): Promise<NiceClassification[]> {
  const { data, error } = await supabase
    .from('nice_classifications')
    .select('*')
    .or(`class_heading.ilike.%${query}%,class_description.ilike.%${query}%`)
    .order('class_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function saveTrademarkSearchResult(
  organizationId: string,
  applicationId: string | null,
  searchData: {
    searchQuery: string;
    searchType: TrademarkSearchResult['search_type'];
    results: unknown[];
    totalResults: number;
    phoneticMatches?: unknown[];
    visualMatches?: unknown[];
    conceptualMatches?: unknown[];
    likelihoodOfConfusionScore?: number;
    conflictAnalysis?: string;
    conflictRiskLevel?: TrademarkSearchResult['conflict_risk_level'];
    recommendation?: string;
  }
): Promise<TrademarkSearchResult> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('trademark_search_results')
    .insert({
      organization_id: organizationId,
      application_id: applicationId,
      search_query: searchData.searchQuery,
      search_type: searchData.searchType,
      results: searchData.results,
      total_results: searchData.totalResults,
      phonetic_matches: searchData.phoneticMatches || null,
      visual_matches: searchData.visualMatches || null,
      conceptual_matches: searchData.conceptualMatches || null,
      likelihood_of_confusion_score: searchData.likelihoodOfConfusionScore || null,
      conflict_analysis: searchData.conflictAnalysis || null,
      conflict_risk_level: searchData.conflictRiskLevel || 'low',
      recommendation: searchData.recommendation || null,
      created_by: userData?.user?.id || null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTrademarkSearchResults(
  organizationId: string,
  applicationId?: string
): Promise<TrademarkSearchResult[]> {
  let query = supabase
    .from('trademark_search_results')
    .select('*')
    .eq('organization_id', organizationId);

  if (applicationId) {
    query = query.eq('application_id', applicationId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export function calculateTrademarkFee(
  filingType: 'teas_plus' | 'teas_standard' | 'teas_rf',
  numberOfClasses: number
): number {
  const baseFee = TEAS_FILING_FEES[filingType];
  const additionalClassFee = TEAS_FILING_FEES.additional_class;

  return baseFee + (Math.max(0, numberOfClasses - 1) * additionalClassFee);
}

export function validateTrademarkCompleteness(
  application: TrademarkApplication
): { isComplete: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  if (!application.mark_text && !application.mark_image_url) {
    missingFields.push('Mark (text or image)');
  }
  if (!application.goods_services_description) missingFields.push('Goods/Services Description');
  if (!application.owner_name) missingFields.push('Owner Name');
  if (!application.owner_address) missingFields.push('Owner Address');

  if (application.filing_basis === 'use_in_commerce') {
    if (!application.first_use_date) missingFields.push('First Use Date');
    if (!application.first_use_commerce_date) missingFields.push('First Use in Commerce Date');
  }

  if (application.filing_basis === 'foreign_registration') {
    if (!application.foreign_registration_country) missingFields.push('Foreign Registration Country');
    if (!application.foreign_registration_number) missingFields.push('Foreign Registration Number');
    if (!application.foreign_registration_date) missingFields.push('Foreign Registration Date');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
}

export function getRecommendedClasses(description: string): number[] {
  const keywords = description.toLowerCase();
  const recommended: number[] = [];

  if (keywords.includes('software') || keywords.includes('app') || keywords.includes('computer')) {
    recommended.push(9);
  }
  if (keywords.includes('entertainment') || keywords.includes('film') || keywords.includes('television') || keywords.includes('animation')) {
    recommended.push(41);
  }
  if (keywords.includes('technology') || keywords.includes('saas') || keywords.includes('cloud')) {
    recommended.push(42);
  }
  if (keywords.includes('character') || keywords.includes('merchandise') || keywords.includes('toy')) {
    recommended.push(28);
  }
  if (keywords.includes('clothing') || keywords.includes('apparel')) {
    recommended.push(25);
  }
  if (keywords.includes('advertising') || keywords.includes('retail')) {
    recommended.push(35);
  }

  return [...new Set(recommended)];
}
