import { supabase } from '../lib/supabase';

export type TreatyBasis = 'berne' | 'wipo_wct' | 'wipo_wppt' | 'trips' | 'bilateral' | 'none';
export type RegistrationStatus = 'not_required' | 'pending' | 'submitted' | 'registered' | 'rejected' | 'expired';
export type TranslationStatus = 'not_required' | 'pending' | 'in_progress' | 'completed' | 'submitted';
export type EnforcementStrength = 'weak' | 'moderate' | 'strong' | 'very_strong';
export type TermBasis = 'life_plus' | 'publication_date' | 'creation_date' | 'fixed_term';

export interface LocalAgentContact {
  name: string;
  firm?: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface EnforcementContact {
  type: 'attorney' | 'enforcement_agency' | 'customs' | 'other';
  name: string;
  contact: string;
  notes?: string;
}

export interface InternationalCopyrightRegistration {
  id: string;
  parent_registration_id: string;
  organization_id: string;
  country_code: string;
  country_name: string;
  treaty_basis: TreatyBasis;
  receives_automatic_protection: boolean;
  registration_required: boolean;
  registration_status: RegistrationStatus;
  registration_number: string | null;
  registration_date: string | null;
  registration_expiry_date: string | null;
  local_agent_required: boolean;
  local_agent_name: string | null;
  local_agent_contact: LocalAgentContact | null;
  translation_required: boolean;
  translation_status: TranslationStatus;
  translated_title: string | null;
  translation_date: string | null;
  enforcement_notes: string | null;
  enforcement_contacts: EnforcementContact[] | null;
  takedown_procedure: string | null;
  registration_fee: number | null;
  currency_code: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CopyrightTreaty {
  country_code: string;
  country_name: string;
  berne_member: boolean;
  berne_join_date: string | null;
  wipo_wct_member: boolean;
  wipo_wct_join_date: string | null;
  wipo_wppt_member: boolean;
  wipo_wppt_join_date: string | null;
  trips_member: boolean;
  trips_join_date: string | null;
  registration_required: boolean;
  formalities_required: boolean;
  deposit_required: boolean;
  term_of_protection_years: number;
  term_basis: TermBasis;
  moral_rights_protected: boolean;
  special_requirements: Record<string, unknown> | null;
  enforcement_strength: EnforcementStrength;
  copyright_office_name: string | null;
  copyright_office_url: string | null;
  registration_fee_usd: number | null;
  notes: string | null;
  last_updated: string;
}

export interface InternationalRegistrationFormData {
  parentRegistrationId: string;
  countryCode: string;
  countryName: string;
  treatyBasis?: TreatyBasis;
  receivesAutomaticProtection?: boolean;
  registrationRequired?: boolean;
  localAgentRequired?: boolean;
  localAgentName?: string;
  localAgentContact?: LocalAgentContact;
  translationRequired?: boolean;
  translatedTitle?: string;
  notes?: string;
}

export interface ProtectionAnalysis {
  countryCode: string;
  countryName: string;
  hasAutomaticProtection: boolean;
  treatyBasis: TreatyBasis;
  termOfProtection: number;
  termBasis: TermBasis;
  expirationDate: string;
  registrationRequired: boolean;
  formalities: string[];
  enforcementStrength: EnforcementStrength;
  recommendations: string[];
}

export async function createInternationalRegistration(
  organizationId: string,
  formData: InternationalRegistrationFormData
): Promise<InternationalCopyrightRegistration> {
  const insertData = {
    parent_registration_id: formData.parentRegistrationId,
    organization_id: organizationId,
    country_code: formData.countryCode,
    country_name: formData.countryName,
    treaty_basis: formData.treatyBasis || 'berne',
    receives_automatic_protection: formData.receivesAutomaticProtection ?? true,
    registration_required: formData.registrationRequired ?? false,
    registration_status: formData.registrationRequired ? 'pending' : 'not_required',
    local_agent_required: formData.localAgentRequired ?? false,
    local_agent_name: formData.localAgentName || null,
    local_agent_contact: formData.localAgentContact || null,
    translation_required: formData.translationRequired ?? false,
    translation_status: formData.translationRequired ? 'pending' : 'not_required',
    translated_title: formData.translatedTitle || null,
    notes: formData.notes || null
  };

  const { data, error } = await supabase
    .from('international_copyright_registrations')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getInternationalRegistrations(
  parentRegistrationId: string
): Promise<InternationalCopyrightRegistration[]> {
  const { data, error } = await supabase
    .from('international_copyright_registrations')
    .select('*')
    .eq('parent_registration_id', parentRegistrationId)
    .order('country_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getInternationalRegistrationsByOrg(
  organizationId: string
): Promise<InternationalCopyrightRegistration[]> {
  const { data, error } = await supabase
    .from('international_copyright_registrations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getInternationalRegistration(
  registrationId: string
): Promise<InternationalCopyrightRegistration | null> {
  const { data, error } = await supabase
    .from('international_copyright_registrations')
    .select('*')
    .eq('id', registrationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateInternationalRegistration(
  registrationId: string,
  updates: Partial<InternationalRegistrationFormData> & {
    registrationStatus?: RegistrationStatus;
    registrationNumber?: string;
    registrationDate?: string;
    registrationExpiryDate?: string;
    translationStatus?: TranslationStatus;
    translationDate?: string;
    enforcementNotes?: string;
    enforcementContacts?: EnforcementContact[];
    takedownProcedure?: string;
    registrationFee?: number;
    currencyCode?: string;
  }
): Promise<InternationalCopyrightRegistration> {
  const updateData: Record<string, unknown> = {};

  if (updates.treatyBasis !== undefined) updateData.treaty_basis = updates.treatyBasis;
  if (updates.receivesAutomaticProtection !== undefined) updateData.receives_automatic_protection = updates.receivesAutomaticProtection;
  if (updates.registrationRequired !== undefined) updateData.registration_required = updates.registrationRequired;
  if (updates.registrationStatus !== undefined) updateData.registration_status = updates.registrationStatus;
  if (updates.registrationNumber !== undefined) updateData.registration_number = updates.registrationNumber;
  if (updates.registrationDate !== undefined) updateData.registration_date = updates.registrationDate;
  if (updates.registrationExpiryDate !== undefined) updateData.registration_expiry_date = updates.registrationExpiryDate;
  if (updates.localAgentRequired !== undefined) updateData.local_agent_required = updates.localAgentRequired;
  if (updates.localAgentName !== undefined) updateData.local_agent_name = updates.localAgentName;
  if (updates.localAgentContact !== undefined) updateData.local_agent_contact = updates.localAgentContact;
  if (updates.translationRequired !== undefined) updateData.translation_required = updates.translationRequired;
  if (updates.translationStatus !== undefined) updateData.translation_status = updates.translationStatus;
  if (updates.translatedTitle !== undefined) updateData.translated_title = updates.translatedTitle;
  if (updates.translationDate !== undefined) updateData.translation_date = updates.translationDate;
  if (updates.enforcementNotes !== undefined) updateData.enforcement_notes = updates.enforcementNotes;
  if (updates.enforcementContacts !== undefined) updateData.enforcement_contacts = updates.enforcementContacts;
  if (updates.takedownProcedure !== undefined) updateData.takedown_procedure = updates.takedownProcedure;
  if (updates.registrationFee !== undefined) updateData.registration_fee = updates.registrationFee;
  if (updates.currencyCode !== undefined) updateData.currency_code = updates.currencyCode;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from('international_copyright_registrations')
    .update(updateData)
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInternationalRegistration(
  registrationId: string
): Promise<void> {
  const { error } = await supabase
    .from('international_copyright_registrations')
    .delete()
    .eq('id', registrationId);

  if (error) throw error;
}

export async function getCopyrightTreaties(): Promise<CopyrightTreaty[]> {
  const { data, error } = await supabase
    .from('copyright_treaties')
    .select('*')
    .order('country_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCopyrightTreaty(
  countryCode: string
): Promise<CopyrightTreaty | null> {
  const { data, error } = await supabase
    .from('copyright_treaties')
    .select('*')
    .eq('country_code', countryCode)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getBerneMembers(): Promise<CopyrightTreaty[]> {
  const { data, error } = await supabase
    .from('copyright_treaties')
    .select('*')
    .eq('berne_member', true)
    .order('country_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCountriesRequiringRegistration(): Promise<CopyrightTreaty[]> {
  const { data, error } = await supabase
    .from('copyright_treaties')
    .select('*')
    .eq('registration_required', true)
    .order('country_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function searchCopyrightTreaties(
  query: string
): Promise<CopyrightTreaty[]> {
  const { data, error } = await supabase
    .from('copyright_treaties')
    .select('*')
    .or(`country_name.ilike.%${query}%,country_code.ilike.%${query}%`)
    .order('country_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export function analyzeProtection(
  treaty: CopyrightTreaty,
  creationDate: string,
  authorDeathYear?: number
): ProtectionAnalysis {
  const formalities: string[] = [];
  const recommendations: string[] = [];

  if (treaty.registration_required) {
    formalities.push('Registration required');
  }
  if (treaty.formalities_required) {
    formalities.push('Formalities required');
  }
  if (treaty.deposit_required) {
    formalities.push('Deposit required');
  }

  let expirationDate: string;
  const creationYear = new Date(creationDate).getFullYear();

  switch (treaty.term_basis) {
    case 'life_plus':
      if (authorDeathYear) {
        expirationDate = `${authorDeathYear + treaty.term_of_protection_years}-12-31`;
      } else {
        expirationDate = 'Depends on author death date';
      }
      break;
    case 'publication_date':
      expirationDate = `${creationYear + treaty.term_of_protection_years}-12-31`;
      break;
    case 'creation_date':
      expirationDate = `${creationYear + treaty.term_of_protection_years}-12-31`;
      break;
    case 'fixed_term':
      expirationDate = `${creationYear + treaty.term_of_protection_years}-12-31`;
      break;
    default:
      expirationDate = 'Unknown';
  }

  if (treaty.enforcement_strength === 'weak') {
    recommendations.push('Consider additional enforcement measures due to weak local enforcement');
  }

  if (!treaty.berne_member && !treaty.wipo_wct_member) {
    recommendations.push('Limited treaty protection - consider local registration');
  }

  if (treaty.registration_required) {
    recommendations.push('Local registration required for full protection');
  }

  if (!treaty.moral_rights_protected) {
    recommendations.push('Moral rights may not be enforced in this jurisdiction');
  }

  let treatyBasis: TreatyBasis = 'none';
  if (treaty.berne_member) treatyBasis = 'berne';
  else if (treaty.wipo_wct_member) treatyBasis = 'wipo_wct';
  else if (treaty.trips_member) treatyBasis = 'trips';

  return {
    countryCode: treaty.country_code,
    countryName: treaty.country_name,
    hasAutomaticProtection: treaty.berne_member && !treaty.registration_required,
    treatyBasis,
    termOfProtection: treaty.term_of_protection_years,
    termBasis: treaty.term_basis,
    expirationDate,
    registrationRequired: treaty.registration_required,
    formalities,
    enforcementStrength: treaty.enforcement_strength,
    recommendations
  };
}

export function analyzeMultipleCountries(
  treaties: CopyrightTreaty[],
  creationDate: string,
  authorDeathYear?: number
): ProtectionAnalysis[] {
  return treaties.map(treaty => analyzeProtection(treaty, creationDate, authorDeathYear));
}

export function getProtectionSummary(
  analyses: ProtectionAnalysis[]
): {
  totalCountries: number;
  automaticProtection: number;
  requiresRegistration: number;
  strongEnforcement: number;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  const automaticProtection = analyses.filter(a => a.hasAutomaticProtection).length;
  const requiresRegistration = analyses.filter(a => a.registrationRequired).length;
  const strongEnforcement = analyses.filter(
    a => a.enforcementStrength === 'strong' || a.enforcementStrength === 'very_strong'
  ).length;

  if (requiresRegistration > 0) {
    recommendations.push(`${requiresRegistration} countries require local registration`);
  }

  const weakEnforcement = analyses.filter(a => a.enforcementStrength === 'weak');
  if (weakEnforcement.length > 0) {
    recommendations.push(
      `Consider additional protection in: ${weakEnforcement.map(a => a.countryName).join(', ')}`
    );
  }

  return {
    totalCountries: analyses.length,
    automaticProtection,
    requiresRegistration,
    strongEnforcement,
    recommendations
  };
}

export function calculateTermExpiration(
  termBasis: TermBasis,
  termYears: number,
  creationDate: string,
  publicationDate?: string,
  authorDeathYear?: number
): { expirationDate: string; calculationNote: string } {
  let baseYear: number;
  let calculationNote: string;

  switch (termBasis) {
    case 'life_plus':
      if (authorDeathYear) {
        baseYear = authorDeathYear;
        calculationNote = `Based on author death year (${authorDeathYear}) + ${termYears} years`;
      } else {
        return {
          expirationDate: 'TBD',
          calculationNote: 'Requires author death year to calculate'
        };
      }
      break;
    case 'publication_date':
      if (publicationDate) {
        baseYear = new Date(publicationDate).getFullYear();
        calculationNote = `Based on publication date + ${termYears} years`;
      } else {
        baseYear = new Date(creationDate).getFullYear();
        calculationNote = `Based on creation date (no publication) + ${termYears} years`;
      }
      break;
    case 'creation_date':
      baseYear = new Date(creationDate).getFullYear();
      calculationNote = `Based on creation date + ${termYears} years`;
      break;
    case 'fixed_term':
      baseYear = new Date(creationDate).getFullYear();
      calculationNote = `Fixed ${termYears} year term from creation`;
      break;
    default:
      return {
        expirationDate: 'Unknown',
        calculationNote: 'Unknown term basis'
      };
  }

  const expirationYear = baseYear + termYears;

  return {
    expirationDate: `${expirationYear}-12-31`,
    calculationNote
  };
}

export function getTakedownTemplates(countryCode: string): {
  dmcaTemplate?: string;
  localTemplate?: string;
  notes: string;
} {
  const templates: Record<string, { dmcaTemplate?: string; localTemplate?: string; notes: string }> = {
    US: {
      dmcaTemplate: 'DMCA takedown notice template for US-based platforms',
      notes: 'DMCA provides safe harbor provisions and standardized takedown procedures'
    },
    GB: {
      localTemplate: 'UK Copyright Notice template',
      notes: 'UK follows similar procedures to DMCA through Copyright, Designs and Patents Act'
    },
    DE: {
      localTemplate: 'German Abmahnung template',
      notes: 'Germany uses formal cease and desist letters (Abmahnung) as primary enforcement'
    },
    FR: {
      localTemplate: 'French mise en demeure template',
      notes: 'France uses formal notice (mise en demeure) before legal action'
    }
  };

  return templates[countryCode] || {
    notes: 'Contact local copyright office or legal counsel for jurisdiction-specific procedures'
  };
}
