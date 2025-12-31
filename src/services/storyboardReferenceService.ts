import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Character = Database['public']['Tables']['characters']['Row'];
type Asset = Database['public']['Tables']['assets']['Row'];

export interface StoryboardCharacterReference {
  id: string;
  storyboard_id: string;
  character_name: string;
  linked_character_id: string | null;
  linked_asset_id: string | null;
  custom_reference_url: string | null;
  reference_source: 'character_library' | 'asset_library' | 'custom_upload' | 'auto';
  shot_count: number;
  match_confidence: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  linked_character?: Character;
  linked_asset?: Asset;
}

export interface CharacterReferenceWithDetails extends StoryboardCharacterReference {
  reference_image_url: string | null;
  display_name: string;
  has_reference: boolean;
}

export async function initializeStoryboardReferences(storyboardId: string): Promise<void> {
  const { error } = await supabase.rpc('initialize_storyboard_references', {
    p_storyboard_id: storyboardId
  });

  if (error) {
    console.error('Error initializing storyboard references:', error);
    throw new Error('Failed to initialize character references');
  }
}

export async function getStoryboardReferences(
  storyboardId: string
): Promise<CharacterReferenceWithDetails[]> {
  const { data: refs, error } = await supabase
    .from('storyboard_character_references')
    .select(`
      *,
      linked_character:characters(*),
      linked_asset:assets(*)
    `)
    .eq('storyboard_id', storyboardId)
    .order('shot_count', { ascending: false });

  if (error) {
    console.error('Error fetching storyboard references:', error);
    throw new Error('Failed to load character references');
  }

  return (refs || []).map(ref => {
    const linkedChar = ref.linked_character as Character | null;
    const linkedAsset = ref.linked_asset as Asset | null;

    let referenceImageUrl: string | null = null;
    let displayName = ref.character_name;

    if (ref.custom_reference_url) {
      referenceImageUrl = ref.custom_reference_url;
    } else if (linkedChar?.reference_image_url) {
      referenceImageUrl = linkedChar.reference_image_url;
      displayName = linkedChar.name;
    } else if (linkedAsset?.file_url) {
      referenceImageUrl = linkedAsset.file_url;
      displayName = linkedAsset.name;
    }

    return {
      ...ref,
      linked_character: linkedChar || undefined,
      linked_asset: linkedAsset || undefined,
      reference_image_url: referenceImageUrl,
      display_name: displayName,
      has_reference: !!referenceImageUrl
    } as CharacterReferenceWithDetails;
  });
}

export async function updateCharacterReference(
  referenceId: string,
  updates: {
    linked_character_id?: string | null;
    linked_asset_id?: string | null;
    custom_reference_url?: string | null;
    reference_source?: 'character_library' | 'asset_library' | 'custom_upload';
    is_verified?: boolean;
  }
): Promise<void> {
  const { error } = await supabase
    .from('storyboard_character_references')
    .update({
      ...updates,
      is_verified: updates.is_verified ?? true,
      updated_at: new Date().toISOString()
    })
    .eq('id', referenceId);

  if (error) {
    console.error('Error updating character reference:', error);
    throw new Error('Failed to update character reference');
  }
}

export async function linkCharacterToReference(
  referenceId: string,
  characterId: string
): Promise<void> {
  const { data: character } = await supabase
    .from('characters')
    .select('reference_image_url')
    .eq('id', characterId)
    .maybeSingle();

  await updateCharacterReference(referenceId, {
    linked_character_id: characterId,
    linked_asset_id: null,
    custom_reference_url: character?.reference_image_url || null,
    reference_source: 'character_library'
  });
}

export async function linkAssetToReference(
  referenceId: string,
  assetId: string
): Promise<void> {
  const { data: asset } = await supabase
    .from('assets')
    .select('file_url')
    .eq('id', assetId)
    .maybeSingle();

  await updateCharacterReference(referenceId, {
    linked_character_id: null,
    linked_asset_id: assetId,
    custom_reference_url: asset?.file_url || null,
    reference_source: 'asset_library'
  });
}

export async function clearCharacterReference(referenceId: string): Promise<void> {
  await updateCharacterReference(referenceId, {
    linked_character_id: null,
    linked_asset_id: null,
    custom_reference_url: null,
    reference_source: 'auto' as any,
    is_verified: false
  });
}

export async function getReferencesForGeneration(
  storyboardId: string
): Promise<Map<string, { name: string; imageUrl: string; description?: string }>> {
  const references = await getStoryboardReferences(storyboardId);
  const referenceMap = new Map<string, { name: string; imageUrl: string; description?: string }>();

  for (const ref of references) {
    if (ref.reference_image_url) {
      referenceMap.set(ref.character_name.toLowerCase(), {
        name: ref.display_name,
        imageUrl: ref.reference_image_url,
        description: ref.linked_character?.description || undefined
      });
    }
  }

  return referenceMap;
}

export async function getCharacterReferenceForShot(
  storyboardId: string,
  characterNames: string[]
): Promise<Array<{ name: string; imageUrl: string; description?: string }>> {
  const referenceMap = await getReferencesForGeneration(storyboardId);
  const results: Array<{ name: string; imageUrl: string; description?: string }> = [];

  for (const name of characterNames) {
    const ref = referenceMap.get(name.toLowerCase());
    if (ref) {
      results.push(ref);
    }
  }

  return results;
}

export interface StoryboardCharacterSummary {
  totalCharacters: number;
  linkedCharacters: number;
  unlinkedCharacters: number;
  characters: CharacterReferenceWithDetails[];
}

export async function getStoryboardReferenceSummary(
  storyboardId: string
): Promise<StoryboardCharacterSummary> {
  await initializeStoryboardReferences(storyboardId);
  const characters = await getStoryboardReferences(storyboardId);

  const linkedCharacters = characters.filter(c => c.has_reference).length;

  return {
    totalCharacters: characters.length,
    linkedCharacters,
    unlinkedCharacters: characters.length - linkedCharacters,
    characters
  };
}

export async function refreshStoryboardReferences(storyboardId: string): Promise<CharacterReferenceWithDetails[]> {
  await initializeStoryboardReferences(storyboardId);
  return getStoryboardReferences(storyboardId);
}
