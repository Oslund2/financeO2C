import { supabase } from '../lib/supabase';
import {
  createCopyrightRegistration,
  type CopyrightRegistrationFormData,
  type CopyrightRegistration,
  type AIToolDetail,
  type HumanCreativeElement
} from './copyrightApplicationService';

export interface CharacterForCopyright {
  id: string;
  name: string;
  description: string | null;
  personality: string | null;
  clay_features: string | null;
  reference_image_url: string | null;
  series_id: string | null;
  series_name?: string;
  created_at: string;
  ai_generated?: boolean;
  generation_prompt?: string | null;
}

export interface ScriptForCopyright {
  id: string;
  title: string;
  synopsis: string | null;
  theme: string | null;
  episode_number: number | null;
  season_number: number | null;
  series_id: string | null;
  series_name?: string;
  runtime_minutes: number | null;
  vocabulary_words: string[];
  created_at: string;
  ai_generated: boolean;
  generation_prompt: string | null;
}

export interface BulkRegistrationItem {
  type: 'character' | 'script';
  id: string;
  title: string;
  description: string;
  isAIGenerated: boolean;
  generationPrompt?: string | null;
  sourceId: string;
  seriesId?: string | null;
  seriesName?: string;
  createdAt: string;
}

export interface BulkRegistrationConfig {
  authorName: string;
  authorCitizenship?: string;
  authorDomicile?: string;
  authorBirthYear?: number;
  claimantName?: string;
  claimantAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  aiToolsUsed?: string[];
  aiToolDetails?: AIToolDetail[];
  humanAuthorshipStatement?: string;
  humanCreativeElements?: HumanCreativeElement[];
  defaultAiContributionPercentage?: number;
}

export interface BulkRegistrationProgress {
  total: number;
  completed: number;
  currentItem: string;
  registrations: CopyrightRegistration[];
  errors: { item: string; error: string }[];
}

export interface BulkRegistrationResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  registrations: CopyrightRegistration[];
  errors: { item: string; error: string }[];
  bulkRegistrationId?: string;
}

export async function scanCharactersForCopyright(
  organizationId: string,
  seriesId?: string | null
): Promise<CharacterForCopyright[]> {
  let query = supabase
    .from('characters')
    .select(`
      id,
      name,
      description,
      personality,
      clay_features,
      reference_image_url,
      series_id,
      created_at,
      series:series_id (name)
    `)
    .order('name');

  if (seriesId) {
    query = query.eq('series_id', seriesId);
  }

  const { data: orgSeries } = await supabase
    .from('series')
    .select('id')
    .eq('organization_id', organizationId);

  if (orgSeries && orgSeries.length > 0) {
    const seriesIds = orgSeries.map(s => s.id);
    query = query.in('series_id', seriesIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(char => ({
    ...char,
    series_name: (char.series as { name: string } | null)?.name
  }));
}

export async function scanScriptsForCopyright(
  organizationId: string,
  seriesId?: string | null
): Promise<ScriptForCopyright[]> {
  let query = supabase
    .from('scripts')
    .select(`
      id,
      title,
      synopsis,
      theme,
      episode_number,
      season_number,
      series_id,
      runtime_minutes,
      vocabulary_words,
      created_at,
      ai_generated,
      generation_prompt,
      series:series_id (name)
    `)
    .order('title');

  if (seriesId) {
    query = query.eq('series_id', seriesId);
  } else {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(script => ({
    ...script,
    series_name: (script.series as { name: string } | null)?.name
  }));
}

export function generateCharacterCopyrightData(
  character: CharacterForCopyright,
  config: BulkRegistrationConfig
): CopyrightRegistrationFormData {
  const description = [
    character.description,
    character.personality ? `Personality: ${character.personality}` : null,
    character.clay_features ? `Special Features: ${character.clay_features}` : null
  ].filter(Boolean).join('\n\n');

  const isAIGenerated = character.ai_generated || false;
  const creationYear = new Date(character.created_at).getFullYear();

  return {
    title: character.name,
    registrationType: 'character',
    workType: 'visual_art',
    description: description || `Visual character design for "${character.name}"`,
    yearOfCompletion: creationYear,
    creationDate: character.created_at.split('T')[0],
    publicationStatus: 'unpublished',
    authorName: config.authorName,
    authorCitizenship: config.authorCitizenship,
    authorDomicile: config.authorDomicile,
    authorBirthYear: config.authorBirthYear,
    authorType: isAIGenerated ? 'joint_work' : 'individual',
    natureOfAuthorship: 'Visual artwork including character design, visual appearance, and distinctive features',
    claimantName: config.claimantName,
    claimantAddress: config.claimantAddress,
    containsAIGeneratedContent: isAIGenerated,
    aiContributionPercentage: isAIGenerated ? (config.defaultAiContributionPercentage || 30) : 0,
    aiToolsUsed: isAIGenerated ? (config.aiToolsUsed || ['Google Gemini']) : [],
    aiToolDetails: isAIGenerated ? config.aiToolDetails : undefined,
    humanAuthorshipStatement: isAIGenerated
      ? (config.humanAuthorshipStatement || 'Human author provided creative direction, character concept, personality traits, and visual design specifications. AI tools were used to assist with visual rendering.')
      : undefined,
    humanCreativeElements: isAIGenerated ? (config.humanCreativeElements || [
      {
        element: 'Character Concept',
        description: 'Original character name, backstory, and personality development',
        contributionLevel: 'primary'
      },
      {
        element: 'Visual Design Direction',
        description: 'Specified visual attributes, style guidelines, and distinctive features',
        contributionLevel: 'significant'
      }
    ]) : undefined,
    sourceCharacterId: character.id,
    sourceSeriesId: character.series_id || undefined
  };
}

export function generateScriptCopyrightData(
  script: ScriptForCopyright,
  config: BulkRegistrationConfig
): CopyrightRegistrationFormData {
  const episodeInfo = script.episode_number
    ? `Episode ${script.episode_number}${script.season_number ? `, Season ${script.season_number}` : ''}`
    : null;

  const description = [
    script.synopsis,
    episodeInfo ? `Episode Information: ${episodeInfo}` : null,
    script.theme ? `Theme: ${script.theme}` : null,
    script.runtime_minutes ? `Runtime: ${script.runtime_minutes} minutes` : null,
    script.vocabulary_words?.length ? `Featured vocabulary: ${script.vocabulary_words.join(', ')}` : null
  ].filter(Boolean).join('\n\n');

  const creationYear = new Date(script.created_at).getFullYear();

  return {
    title: script.title,
    registrationType: 'script',
    workType: 'dramatic_work',
    description: description || `Script for "${script.title}"`,
    yearOfCompletion: creationYear,
    creationDate: script.created_at.split('T')[0],
    publicationStatus: 'unpublished',
    authorName: config.authorName,
    authorCitizenship: config.authorCitizenship,
    authorDomicile: config.authorDomicile,
    authorBirthYear: config.authorBirthYear,
    authorType: script.ai_generated ? 'joint_work' : 'individual',
    natureOfAuthorship: 'Script including dialogue, scene descriptions, story structure, and character interactions',
    claimantName: config.claimantName,
    claimantAddress: config.claimantAddress,
    containsAIGeneratedContent: script.ai_generated,
    aiContributionPercentage: script.ai_generated ? (config.defaultAiContributionPercentage || 40) : 0,
    aiToolsUsed: script.ai_generated ? (config.aiToolsUsed || ['Google Gemini']) : [],
    aiToolDetails: script.ai_generated ? config.aiToolDetails : undefined,
    humanAuthorshipStatement: script.ai_generated
      ? (config.humanAuthorshipStatement || 'Human author created the story concept, character arcs, thematic elements, and provided detailed prompts and editorial direction. AI tools assisted with dialogue generation and scene elaboration.')
      : undefined,
    humanCreativeElements: script.ai_generated ? (config.humanCreativeElements || [
      {
        element: 'Story Concept',
        description: 'Original story idea, plot structure, and narrative arc',
        contributionLevel: 'primary'
      },
      {
        element: 'Character Development',
        description: 'Character motivations, relationships, and dialogue direction',
        contributionLevel: 'primary'
      },
      {
        element: 'Editorial Review',
        description: 'Review, revision, and creative refinement of AI-generated content',
        contributionLevel: 'significant'
      }
    ]) : undefined,
    sourceScriptId: script.id,
    sourceSeriesId: script.series_id || undefined
  };
}

export function convertToBulkItem(
  item: CharacterForCopyright | ScriptForCopyright,
  type: 'character' | 'script'
): BulkRegistrationItem {
  if (type === 'character') {
    const char = item as CharacterForCopyright;
    return {
      type: 'character',
      id: char.id,
      title: char.name,
      description: char.description || '',
      isAIGenerated: char.ai_generated || false,
      generationPrompt: char.generation_prompt,
      sourceId: char.id,
      seriesId: char.series_id,
      seriesName: char.series_name,
      createdAt: char.created_at
    };
  } else {
    const script = item as ScriptForCopyright;
    return {
      type: 'script',
      id: script.id,
      title: script.title,
      description: script.synopsis || '',
      isAIGenerated: script.ai_generated,
      generationPrompt: script.generation_prompt,
      sourceId: script.id,
      seriesId: script.series_id,
      seriesName: script.series_name,
      createdAt: script.created_at
    };
  }
}

export async function checkExistingRegistrations(
  organizationId: string,
  items: BulkRegistrationItem[]
): Promise<Map<string, string>> {
  const characterIds = items.filter(i => i.type === 'character').map(i => i.sourceId);
  const scriptIds = items.filter(i => i.type === 'script').map(i => i.sourceId);

  const existingMap = new Map<string, string>();

  if (characterIds.length > 0) {
    const { data: charRegs } = await supabase
      .from('copyright_registrations')
      .select('id, source_character_id')
      .eq('organization_id', organizationId)
      .in('source_character_id', characterIds);

    charRegs?.forEach(reg => {
      if (reg.source_character_id) {
        existingMap.set(`character:${reg.source_character_id}`, reg.id);
      }
    });
  }

  if (scriptIds.length > 0) {
    const { data: scriptRegs } = await supabase
      .from('copyright_registrations')
      .select('id, source_script_id')
      .eq('organization_id', organizationId)
      .in('source_script_id', scriptIds);

    scriptRegs?.forEach(reg => {
      if (reg.source_script_id) {
        existingMap.set(`script:${reg.source_script_id}`, reg.id);
      }
    });
  }

  return existingMap;
}

export async function createBulkRegistration(
  organizationId: string
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('copyright_bulk_registrations')
    .insert({
      organization_id: organizationId,
      status: 'pending',
      total_items: 0,
      completed_items: 0,
      created_by: userData?.user?.id
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateBulkRegistrationProgress(
  bulkRegistrationId: string,
  totalItems: number,
  completedItems: number,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  const { error } = await supabase
    .from('copyright_bulk_registrations')
    .update({
      total_items: totalItems,
      completed_items: completedItems,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', bulkRegistrationId);

  if (error) throw error;
}

export async function executeBulkRegistration(
  organizationId: string,
  characters: CharacterForCopyright[],
  scripts: ScriptForCopyright[],
  config: BulkRegistrationConfig,
  onProgress?: (progress: BulkRegistrationProgress) => void
): Promise<BulkRegistrationResult> {
  const registrations: CopyrightRegistration[] = [];
  const errors: { item: string; error: string }[] = [];
  const totalItems = characters.length + scripts.length;
  let completedItems = 0;

  let bulkRegistrationId: string | undefined;

  try {
    bulkRegistrationId = await createBulkRegistration(organizationId);
    await updateBulkRegistrationProgress(bulkRegistrationId, totalItems, 0, 'processing');
  } catch (err) {
    console.warn('Could not create bulk registration record:', err);
  }

  for (const character of characters) {
    try {
      onProgress?.({
        total: totalItems,
        completed: completedItems,
        currentItem: `Registering character: ${character.name}`,
        registrations,
        errors
      });

      const formData = generateCharacterCopyrightData(character, config);
      const registration = await createCopyrightRegistration(organizationId, formData);
      registrations.push(registration);
      completedItems++;

      if (bulkRegistrationId) {
        await linkRegistrationToBulk(bulkRegistrationId, registration.id);
      }
    } catch (err) {
      errors.push({
        item: `Character: ${character.name}`,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      completedItems++;
    }
  }

  for (const script of scripts) {
    try {
      onProgress?.({
        total: totalItems,
        completed: completedItems,
        currentItem: `Registering script: ${script.title}`,
        registrations,
        errors
      });

      const formData = generateScriptCopyrightData(script, config);
      const registration = await createCopyrightRegistration(organizationId, formData);
      registrations.push(registration);
      completedItems++;

      if (bulkRegistrationId) {
        await linkRegistrationToBulk(bulkRegistrationId, registration.id);
      }
    } catch (err) {
      errors.push({
        item: `Script: ${script.title}`,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      completedItems++;
    }
  }

  if (bulkRegistrationId) {
    const finalStatus = errors.length === totalItems ? 'failed' : 'completed';
    await updateBulkRegistrationProgress(bulkRegistrationId, totalItems, completedItems, finalStatus);
  }

  onProgress?.({
    total: totalItems,
    completed: completedItems,
    currentItem: 'Complete',
    registrations,
    errors
  });

  return {
    success: errors.length < totalItems,
    totalProcessed: totalItems,
    successCount: registrations.length,
    failureCount: errors.length,
    registrations,
    errors,
    bulkRegistrationId
  };
}

async function linkRegistrationToBulk(
  bulkRegistrationId: string,
  registrationId: string
): Promise<void> {
  try {
    await supabase
      .from('copyright_bulk_registration_items')
      .insert({
        bulk_registration_id: bulkRegistrationId,
        registration_id: registrationId
      });
  } catch (err) {
    console.warn('Could not link registration to bulk:', err);
  }
}

export async function getBulkRegistrationHistory(
  organizationId: string
): Promise<{
  id: string;
  status: string;
  total_items: number;
  completed_items: number;
  created_at: string;
}[]> {
  const { data, error } = await supabase
    .from('copyright_bulk_registrations')
    .select('id, status, total_items, completed_items, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export function calculateBulkRegistrationFees(
  itemCount: number,
  useGroupRegistration: boolean = false
): {
  method: string;
  feePerItem: number;
  totalFee: number;
  savings: number;
} {
  const ONLINE_SINGLE = 45;
  const ONLINE_STANDARD = 65;
  const GROUP_REGISTRATION = 85;

  if (useGroupRegistration && itemCount > 1) {
    const groupCount = Math.ceil(itemCount / 10);
    const totalGroupFee = groupCount * GROUP_REGISTRATION;
    const standardTotal = itemCount * ONLINE_STANDARD;

    return {
      method: 'Group Registration',
      feePerItem: totalGroupFee / itemCount,
      totalFee: totalGroupFee,
      savings: standardTotal - totalGroupFee
    };
  }

  if (itemCount === 1) {
    return {
      method: 'Single Online',
      feePerItem: ONLINE_SINGLE,
      totalFee: ONLINE_SINGLE,
      savings: 0
    };
  }

  return {
    method: 'Standard Online',
    feePerItem: ONLINE_STANDARD,
    totalFee: itemCount * ONLINE_STANDARD,
    savings: 0
  };
}
