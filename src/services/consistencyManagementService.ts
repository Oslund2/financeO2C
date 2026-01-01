import { supabase } from '../lib/supabase';

type WorkspaceType = 'claymation' | 'photoreal' | null;

export interface CharacterProfile {
  id?: string;
  character_id: string;
  series_id: string;
  organization_id: string;
  canonical_description: string;
  reference_image_cloud_storage_uris: string[];
  veo3_character_prompt_template: string;
  consistency_score: number;
  usage_count: number;
}

export interface LocationProfile {
  id?: string;
  series_id: string;
  organization_id: string;
  location_name: string;
  canonical_description: string;
  reference_image_cloud_storage_uris: string[];
  time_of_day_variants: {
    morning: string;
    afternoon: string;
    evening: string;
    night: string;
  };
  veo3_location_prompt_template: string;
  usage_count: number;
}

async function getOrganizationWorkspaceType(organizationId: string): Promise<WorkspaceType> {
  const { data } = await supabase
    .from('organizations')
    .select('workspace_type')
    .eq('id', organizationId)
    .maybeSingle();
  return data?.workspace_type || 'claymation';
}

export async function createCharacterProfile(
  characterId: string,
  seriesId: string,
  organizationId: string
): Promise<string> {
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .maybeSingle();

  if (charError || !character) {
    throw new Error('Character not found');
  }

  const workspaceType = await getOrganizationWorkspaceType(organizationId);
  const isPhotoreal = workspaceType === 'photoreal';

  let canonicalDescription: string;
  let promptTemplate: string;

  if (isPhotoreal) {
    canonicalDescription = `${character.name}${character.age ? `, ${character.age} years old` : ''}. ${character.description || ''}. Personality: ${character.personality || 'Professional demeanor'}.`;
    promptTemplate = `${character.name} (documentary subject): ${character.description || ''}. ${character.personality || ''}. Photorealistic, period-accurate appearance.`;
  } else {
    canonicalDescription = `${character.name}, ${character.age} years old. ${character.description}. Physical appearance: ${character.clay_features}. Personality: ${character.personality}.`;
    promptTemplate = `${character.name} (claymation character): ${character.clay_features}. ${character.personality}. Clay texture visible, stop-motion aesthetic.`;
  }

  const { data, error } = await supabase
    .from('character_consistency_profiles')
    .insert([{
      character_id: characterId,
      series_id: seriesId,
      organization_id: organizationId,
      canonical_description: canonicalDescription,
      veo3_character_prompt_template: promptTemplate,
      reference_image_cloud_storage_uris: character.reference_image_url ? [character.reference_image_url] : [],
      consistency_score: 0,
      usage_count: 0
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function getOrCreateCharacterProfile(
  characterId: string,
  seriesId: string,
  organizationId: string
): Promise<CharacterProfile> {
  const { data: existing, error: fetchError } = await supabase
    .from('character_consistency_profiles')
    .select('*')
    .eq('character_id', characterId)
    .maybeSingle();

  if (!fetchError && existing) {
    return existing;
  }

  const profileId = await createCharacterProfile(characterId, seriesId, organizationId);

  const { data: profile, error } = await supabase
    .from('character_consistency_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error || !profile) {
    throw error || new Error('Failed to create profile');
  }

  return profile;
}

export async function updateCharacterProfile(
  profileId: string,
  updates: Partial<CharacterProfile>
): Promise<void> {
  const { error } = await supabase
    .from('character_consistency_profiles')
    .update(updates)
    .eq('id', profileId);

  if (error) {
    throw error;
  }
}

export async function addCharacterReferenceImage(
  profileId: string,
  cloudStorageUri: string
): Promise<void> {
  const { data: profile, error: fetchError } = await supabase
    .from('character_consistency_profiles')
    .select('reference_image_cloud_storage_uris')
    .eq('id', profileId)
    .single();

  if (fetchError || !profile) {
    throw fetchError || new Error('Profile not found');
  }

  const updatedUris = [...(profile.reference_image_cloud_storage_uris || []), cloudStorageUri];

  const { error } = await supabase
    .from('character_consistency_profiles')
    .update({ reference_image_cloud_storage_uris: updatedUris })
    .eq('id', profileId);

  if (error) {
    throw error;
  }
}

export async function createLocationProfile(
  seriesId: string,
  organizationId: string,
  locationName: string,
  description: string
): Promise<string> {
  const workspaceType = await getOrganizationWorkspaceType(organizationId);
  const isPhotoreal = workspaceType === 'photoreal';

  let canonicalDescription: string;
  let promptTemplate: string;
  let timeVariants: { morning: string; afternoon: string; evening: string; night: string };

  if (isPhotoreal) {
    canonicalDescription = description || `${locationName}: A historical or documentary location.`;
    promptTemplate = `Location: ${locationName}. ${canonicalDescription} Photorealistic, period-accurate, cinematic quality.`;
    timeVariants = {
      morning: `${canonicalDescription} Early morning light, soft shadows, period-accurate atmosphere.`,
      afternoon: `${canonicalDescription} Natural daylight, clear visibility, documentary quality.`,
      evening: `${canonicalDescription} Golden hour, warm cinematic lighting, atmospheric.`,
      night: `${canonicalDescription} Nighttime, practical lighting sources, period-appropriate illumination.`
    };
  } else {
    canonicalDescription = description || `${locationName}: A typical location in the series' claymation world.`;
    promptTemplate = `Location: ${locationName}. ${canonicalDescription} Claymation style, handmade set, visible clay texture.`;
    timeVariants = {
      morning: `${canonicalDescription} Bright morning sunlight.`,
      afternoon: `${canonicalDescription} Warm afternoon light.`,
      evening: `${canonicalDescription} Golden hour lighting.`,
      night: `${canonicalDescription} Dark with artificial lighting.`
    };
  }

  const { data, error } = await supabase
    .from('location_consistency_profiles')
    .insert([{
      series_id: seriesId,
      organization_id: organizationId,
      location_name: locationName,
      canonical_description: canonicalDescription,
      veo3_location_prompt_template: promptTemplate,
      time_of_day_variants: timeVariants,
      reference_image_cloud_storage_uris: [],
      usage_count: 0,
      consistency_score: 0
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function getOrCreateLocationProfile(
  seriesId: string,
  organizationId: string,
  locationName: string,
  description?: string
): Promise<LocationProfile> {
  const { data: existing, error: fetchError } = await supabase
    .from('location_consistency_profiles')
    .select('*')
    .eq('series_id', seriesId)
    .eq('location_name', locationName)
    .maybeSingle();

  if (!fetchError && existing) {
    return existing;
  }

  const profileId = await createLocationProfile(
    seriesId,
    organizationId,
    locationName,
    description || ''
  );

  const { data: profile, error } = await supabase
    .from('location_consistency_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error || !profile) {
    throw error || new Error('Failed to create profile');
  }

  return profile;
}

export async function updateLocationProfile(
  profileId: string,
  updates: Partial<LocationProfile>
): Promise<void> {
  const { error } = await supabase
    .from('location_consistency_profiles')
    .update(updates)
    .eq('id', profileId);

  if (error) {
    throw error;
  }
}

export async function getCharacterProfilesForShot(
  shotPlanId: string
): Promise<CharacterProfile[]> {
  const { data: shot, error: shotError } = await supabase
    .from('production_shot_plans')
    .select('characters, series_id, organization_id')
    .eq('id', shotPlanId)
    .single();

  if (shotError || !shot) {
    throw shotError || new Error('Shot not found');
  }

  const characterNames = shot.characters || [];
  if (characterNames.length === 0) {
    return [];
  }

  const { data: characters, error: charError } = await supabase
    .from('characters')
    .select('id, name')
    .eq('series_id', shot.series_id)
    .in('name', characterNames);

  if (charError || !characters) {
    return [];
  }

  const profiles: CharacterProfile[] = [];

  for (const character of characters) {
    try {
      const profile = await getOrCreateCharacterProfile(
        character.id,
        shot.series_id,
        shot.organization_id
      );
      profiles.push(profile);
    } catch (error) {
      console.error(`Error getting profile for character ${character.name}:`, error);
    }
  }

  return profiles;
}

export async function getLocationProfileForShot(
  shotPlanId: string
): Promise<LocationProfile | null> {
  const { data: shot, error: shotError } = await supabase
    .from('production_shot_plans')
    .select('location, series_id, organization_id')
    .eq('id', shotPlanId)
    .single();

  if (shotError || !shot || !shot.location) {
    return null;
  }

  try {
    const profile = await getOrCreateLocationProfile(
      shot.series_id,
      shot.organization_id,
      shot.location
    );
    return profile;
  } catch (error) {
    console.error(`Error getting location profile:`, error);
    return null;
  }
}

export async function incrementProfileUsage(
  profileId: string,
  profileType: 'character' | 'location'
): Promise<void> {
  const table = profileType === 'character'
    ? 'character_consistency_profiles'
    : 'location_consistency_profiles';

  const { data: profile, error: fetchError } = await supabase
    .from(table)
    .select('usage_count')
    .eq('id', profileId)
    .single();

  if (fetchError || !profile) {
    return;
  }

  const { error } = await supabase
    .from(table)
    .update({ usage_count: (profile.usage_count || 0) + 1 })
    .eq('id', profileId);

  if (error) {
    console.error('Error incrementing usage:', error);
  }
}

export async function calculateConsistencyHealth(
  episodeId: string
): Promise<{
  overall: number;
  charactersWithProfiles: number;
  totalCharacters: number;
  locationsWithProfiles: number;
  totalLocations: number;
  missingProfiles: string[];
}> {
  const { data: shots, error } = await supabase
    .from('production_shot_plans')
    .select('characters, location')
    .eq('episode_id', episodeId);

  if (error || !shots) {
    throw error || new Error('Failed to fetch shots');
  }

  const uniqueCharacters = new Set<string>();
  const uniqueLocations = new Set<string>();

  shots.forEach(shot => {
    (shot.characters || []).forEach((char: string) => uniqueCharacters.add(char));
    if (shot.location) uniqueLocations.add(shot.location);
  });

  const { data: episode, error: epError } = await supabase
    .from('episodes')
    .select('series_id, organization_id')
    .eq('id', episodeId)
    .single();

  if (epError || !episode) {
    throw epError || new Error('Episode not found');
  }

  const { count: charProfileCount } = await supabase
    .from('character_consistency_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('series_id', episode.series_id);

  const { count: locProfileCount } = await supabase
    .from('location_consistency_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('series_id', episode.series_id);

  const charactersWithProfiles = charProfileCount || 0;
  const locationsWithProfiles = locProfileCount || 0;
  const totalCharacters = uniqueCharacters.size;
  const totalLocations = uniqueLocations.size;

  const charCoverage = totalCharacters > 0 ? (charactersWithProfiles / totalCharacters) : 1;
  const locCoverage = totalLocations > 0 ? (locationsWithProfiles / totalLocations) : 1;
  const overall = Math.round(((charCoverage + locCoverage) / 2) * 100);

  const missingProfiles: string[] = [];

  return {
    overall,
    charactersWithProfiles,
    totalCharacters,
    locationsWithProfiles,
    totalLocations,
    missingProfiles
  };
}

export async function autoPopulateProfiles(
  seriesId: string,
  organizationId: string,
  episodeId: string
): Promise<{
  charactersCreated: number;
  locationsCreated: number;
}> {
  const { data: shots, error } = await supabase
    .from('production_shot_plans')
    .select('characters, location')
    .eq('episode_id', episodeId);

  if (error || !shots) {
    throw error || new Error('Failed to fetch shots');
  }

  const uniqueCharacters = new Set<string>();
  const uniqueLocations = new Set<string>();

  shots.forEach(shot => {
    (shot.characters || []).forEach((char: string) => uniqueCharacters.add(char));
    if (shot.location) uniqueLocations.add(shot.location);
  });

  let charactersCreated = 0;
  let locationsCreated = 0;

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name')
    .eq('series_id', seriesId)
    .in('name', Array.from(uniqueCharacters));

  if (characters) {
    for (const character of characters) {
      try {
        await getOrCreateCharacterProfile(character.id, seriesId, organizationId);
        charactersCreated++;
      } catch (error) {
        console.error(`Error creating profile for ${character.name}:`, error);
      }
    }
  }

  for (const locationName of uniqueLocations) {
    try {
      await getOrCreateLocationProfile(seriesId, organizationId, locationName);
      locationsCreated++;
    } catch (error) {
      console.error(`Error creating profile for ${locationName}:`, error);
    }
  }

  return { charactersCreated, locationsCreated };
}
