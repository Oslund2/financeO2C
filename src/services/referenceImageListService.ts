import { supabase } from '../lib/supabase';

export interface CharacterImageRequirement {
  character_id: string;
  character_name: string;
  role: string;
  scene_appearances: number;
  total_screen_time_seconds: number;
  existing_images: string[];
  missing_image_types: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  has_consistency_profile: boolean;
}

export interface LocationImageRequirement {
  location_name: string;
  scene_count: number;
  total_duration_seconds: number;
  time_variants_needed: string[];
  existing_images: string[];
  missing_variants: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  has_consistency_profile: boolean;
}

export interface ImageRequirementsSummary {
  episode_id: string;
  episode_title: string;
  total_characters: number;
  characters_with_images: number;
  characters_missing_images: number;
  total_locations: number;
  locations_with_images: number;
  locations_missing_images: number;
  overall_readiness_percent: number;
  blocking_issues: string[];
  character_requirements: CharacterImageRequirement[];
  location_requirements: LocationImageRequirement[];
}

export interface ReferenceImageChecklist {
  category: 'character' | 'location';
  name: string;
  required_for_scenes: number[];
  image_types_needed: string[];
  existing_count: number;
  missing_count: number;
  cloud_storage_uris: string[];
  action_required: string;
}

export async function buildEpisodeImageRequirements(
  episodeId: string
): Promise<ImageRequirementsSummary> {
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('id, title, series_id, organization_id')
    .eq('id', episodeId)
    .maybeSingle();

  if (episodeError || !episode) {
    throw new Error('Episode not found');
  }

  const { data: shots, error: shotsError } = await supabase
    .from('production_shot_plans')
    .select('id, characters, location, duration_seconds, dialogue_content')
    .eq('episode_id', episodeId);

  if (shotsError) {
    throw shotsError;
  }

  const characterAppearances = new Map<string, { count: number; duration: number; scenes: number[] }>();
  const locationUsage = new Map<string, { count: number; duration: number; timeVariants: Set<string> }>();

  (shots || []).forEach((shot, index) => {
    (shot.characters || []).forEach((charName: string) => {
      const existing = characterAppearances.get(charName) || { count: 0, duration: 0, scenes: [] };
      existing.count++;
      existing.duration += shot.duration_seconds || 5;
      existing.scenes.push(index + 1);
      characterAppearances.set(charName, existing);
    });

    if (shot.location) {
      const existing = locationUsage.get(shot.location) || { count: 0, duration: 0, timeVariants: new Set() };
      existing.count++;
      existing.duration += shot.duration_seconds || 5;
      const timeOfDay = extractTimeOfDayFromDialogue(shot.dialogue_content);
      if (timeOfDay) {
        existing.timeVariants.add(timeOfDay);
      }
      locationUsage.set(shot.location, existing);
    }
  });

  const characterRequirements = await buildCharacterRequirements(
    characterAppearances,
    episode.series_id,
    episode.organization_id
  );

  const locationRequirements = await buildLocationRequirements(
    locationUsage,
    episode.series_id,
    episode.organization_id
  );

  const charactersWithImages = characterRequirements.filter(c => c.existing_images.length > 0).length;
  const locationsWithImages = locationRequirements.filter(l => l.existing_images.length > 0).length;

  const blockingIssues: string[] = [];
  characterRequirements
    .filter(c => c.priority === 'critical' && c.existing_images.length === 0)
    .forEach(c => blockingIssues.push(`Missing reference image for main character: ${c.character_name}`));

  locationRequirements
    .filter(l => l.priority === 'critical' && l.existing_images.length === 0)
    .forEach(l => blockingIssues.push(`Missing reference image for key location: ${l.location_name}`));

  const totalItems = characterRequirements.length + locationRequirements.length;
  const itemsWithImages = charactersWithImages + locationsWithImages;
  const overallReadiness = totalItems > 0 ? Math.round((itemsWithImages / totalItems) * 100) : 100;

  return {
    episode_id: episodeId,
    episode_title: episode.title,
    total_characters: characterRequirements.length,
    characters_with_images: charactersWithImages,
    characters_missing_images: characterRequirements.length - charactersWithImages,
    total_locations: locationRequirements.length,
    locations_with_images: locationsWithImages,
    locations_missing_images: locationRequirements.length - locationsWithImages,
    overall_readiness_percent: overallReadiness,
    blocking_issues: blockingIssues,
    character_requirements: characterRequirements,
    location_requirements: locationRequirements
  };
}

async function buildCharacterRequirements(
  appearances: Map<string, { count: number; duration: number; scenes: number[] }>,
  seriesId: string,
  organizationId: string
): Promise<CharacterImageRequirement[]> {
  const requirements: CharacterImageRequirement[] = [];

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, role, reference_image_url')
    .eq('series_id', seriesId);

  const { data: profiles } = await supabase
    .from('character_consistency_profiles')
    .select('character_id, reference_image_cloud_storage_uris')
    .eq('series_id', seriesId);

  const profileMap = new Map(
    (profiles || []).map(p => [p.character_id, p.reference_image_cloud_storage_uris || []])
  );

  for (const [charName, usage] of appearances) {
    const character = (characters || []).find(c => c.name === charName);
    const characterId = character?.id || '';
    const existingImages: string[] = [];

    if (character?.reference_image_url) {
      existingImages.push(character.reference_image_url);
    }

    const profileImages = profileMap.get(characterId) || [];
    existingImages.push(...profileImages);

    const uniqueImages = [...new Set(existingImages)];

    const missingTypes: string[] = [];
    if (uniqueImages.length === 0) {
      missingTypes.push('primary_reference');
    }
    if (uniqueImages.length < 2) {
      missingTypes.push('expression_variants');
    }
    if (uniqueImages.length < 3) {
      missingTypes.push('pose_variants');
    }

    let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (usage.count >= 10 || usage.duration >= 120) {
      priority = 'critical';
    } else if (usage.count >= 5 || usage.duration >= 60) {
      priority = 'high';
    } else if (usage.count >= 2) {
      priority = 'medium';
    }

    requirements.push({
      character_id: characterId,
      character_name: charName,
      role: character?.role || 'unknown',
      scene_appearances: usage.count,
      total_screen_time_seconds: usage.duration,
      existing_images: uniqueImages,
      missing_image_types: missingTypes,
      priority,
      has_consistency_profile: profileMap.has(characterId)
    });
  }

  return requirements.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

async function buildLocationRequirements(
  usage: Map<string, { count: number; duration: number; timeVariants: Set<string> }>,
  seriesId: string,
  organizationId: string
): Promise<LocationImageRequirement[]> {
  const requirements: LocationImageRequirement[] = [];

  const { data: profiles } = await supabase
    .from('location_consistency_profiles')
    .select('location_name, reference_image_cloud_storage_uris, time_of_day_variants')
    .eq('series_id', seriesId);

  const profileMap = new Map(
    (profiles || []).map(p => [p.location_name, {
      images: p.reference_image_cloud_storage_uris || [],
      variants: p.time_of_day_variants || {}
    }])
  );

  for (const [locationName, data] of usage) {
    const profile = profileMap.get(locationName);
    const existingImages = profile?.images || [];
    const timeVariantsNeeded = Array.from(data.timeVariants);

    const missingVariants: string[] = [];
    if (existingImages.length === 0) {
      missingVariants.push('primary_reference');
    }
    timeVariantsNeeded.forEach(variant => {
      if (!profile?.variants?.[variant as keyof typeof profile.variants]) {
        missingVariants.push(`${variant}_variant`);
      }
    });

    let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (data.count >= 5 || data.duration >= 120) {
      priority = 'critical';
    } else if (data.count >= 3 || data.duration >= 60) {
      priority = 'high';
    } else if (data.count >= 2) {
      priority = 'medium';
    }

    requirements.push({
      location_name: locationName,
      scene_count: data.count,
      total_duration_seconds: data.duration,
      time_variants_needed: timeVariantsNeeded,
      existing_images: existingImages,
      missing_variants: missingVariants,
      priority,
      has_consistency_profile: profileMap.has(locationName)
    });
  }

  return requirements.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function extractTimeOfDayFromDialogue(dialogueContent: any): string | null {
  if (!dialogueContent) return 'AFTERNOON';

  const text = JSON.stringify(dialogueContent).toLowerCase();
  if (text.includes('morning') || text.includes('breakfast')) return 'MORNING';
  if (text.includes('evening') || text.includes('sunset') || text.includes('dinner')) return 'EVENING';
  if (text.includes('night') || text.includes('dark')) return 'NIGHT';
  return 'AFTERNOON';
}

export async function getCharacterImageNeeds(
  scriptId: string
): Promise<CharacterImageRequirement[]> {
  const { data: script, error } = await supabase
    .from('scripts')
    .select('series_id, organization_id, episode_id')
    .eq('id', scriptId)
    .maybeSingle();

  if (error || !script) {
    throw new Error('Script not found');
  }

  if (script.episode_id) {
    const summary = await buildEpisodeImageRequirements(script.episode_id);
    return summary.character_requirements;
  }

  const { data: scriptData } = await supabase
    .from('scripts')
    .select(`
      script_acts (
        script_scenes (
          characters,
          dialogue
        )
      )
    `)
    .eq('id', scriptId)
    .maybeSingle();

  const characterAppearances = new Map<string, { count: number; duration: number; scenes: number[] }>();

  (scriptData?.script_acts || []).forEach((act: any) => {
    (act.script_scenes || []).forEach((scene: any, sceneIndex: number) => {
      (scene.characters || []).forEach((charName: string) => {
        const existing = characterAppearances.get(charName) || { count: 0, duration: 0, scenes: [] };
        existing.count++;
        existing.duration += 90;
        existing.scenes.push(sceneIndex + 1);
        characterAppearances.set(charName, existing);
      });
    });
  });

  return buildCharacterRequirements(
    characterAppearances,
    script.series_id,
    script.organization_id
  );
}

export async function getLocationImageNeeds(
  scriptId: string
): Promise<LocationImageRequirement[]> {
  const { data: script, error } = await supabase
    .from('scripts')
    .select('series_id, organization_id, episode_id')
    .eq('id', scriptId)
    .maybeSingle();

  if (error || !script) {
    throw new Error('Script not found');
  }

  if (script.episode_id) {
    const summary = await buildEpisodeImageRequirements(script.episode_id);
    return summary.location_requirements;
  }

  const locationUsage = new Map<string, { count: number; duration: number; timeVariants: Set<string> }>();

  const { data: scriptData } = await supabase
    .from('scripts')
    .select(`
      script_acts (
        script_scenes (
          setting
        )
      )
    `)
    .eq('id', scriptId)
    .maybeSingle();

  (scriptData?.script_acts || []).forEach((act: any) => {
    (act.script_scenes || []).forEach((scene: any) => {
      const location = scene.setting || 'UNKNOWN';
      const existing = locationUsage.get(location) || { count: 0, duration: 0, timeVariants: new Set() };
      existing.count++;
      existing.duration += 90;
      existing.timeVariants.add('AFTERNOON');
      locationUsage.set(location, existing);
    });
  });

  return buildLocationRequirements(
    locationUsage,
    script.series_id,
    script.organization_id
  );
}

export async function generateImageChecklist(
  episodeId: string
): Promise<ReferenceImageChecklist[]> {
  const summary = await buildEpisodeImageRequirements(episodeId);
  const checklist: ReferenceImageChecklist[] = [];

  summary.character_requirements.forEach(char => {
    checklist.push({
      category: 'character',
      name: char.character_name,
      required_for_scenes: [],
      image_types_needed: char.missing_image_types,
      existing_count: char.existing_images.length,
      missing_count: char.missing_image_types.length,
      cloud_storage_uris: char.existing_images,
      action_required: char.existing_images.length === 0
        ? `Upload primary reference image for ${char.character_name}`
        : char.missing_image_types.length > 0
          ? `Add ${char.missing_image_types.join(', ')} for ${char.character_name}`
          : 'Complete'
    });
  });

  summary.location_requirements.forEach(loc => {
    checklist.push({
      category: 'location',
      name: loc.location_name,
      required_for_scenes: [],
      image_types_needed: loc.missing_variants,
      existing_count: loc.existing_images.length,
      missing_count: loc.missing_variants.length,
      cloud_storage_uris: loc.existing_images,
      action_required: loc.existing_images.length === 0
        ? `Upload primary reference image for ${loc.location_name}`
        : loc.missing_variants.length > 0
          ? `Add ${loc.missing_variants.join(', ')} for ${loc.location_name}`
          : 'Complete'
    });
  });

  return checklist.sort((a, b) => b.missing_count - a.missing_count);
}

export async function getMissingReferenceImages(
  episodeId: string
): Promise<{
  characters: CharacterImageRequirement[];
  locations: LocationImageRequirement[];
  total_missing: number;
  critical_missing: number;
}> {
  const summary = await buildEpisodeImageRequirements(episodeId);

  const missingCharacters = summary.character_requirements.filter(
    c => c.existing_images.length === 0
  );
  const missingLocations = summary.location_requirements.filter(
    l => l.existing_images.length === 0
  );

  const criticalMissing = [
    ...missingCharacters.filter(c => c.priority === 'critical'),
    ...missingLocations.filter(l => l.priority === 'critical')
  ].length;

  return {
    characters: missingCharacters,
    locations: missingLocations,
    total_missing: missingCharacters.length + missingLocations.length,
    critical_missing: criticalMissing
  };
}

export async function getShotImageRequirements(
  shotPlanId: string
): Promise<{
  characters: string[];
  location: string;
  required_images: string[];
  available_images: string[];
  missing_images: string[];
  ready_for_rendering: boolean;
}> {
  const { data: shot, error } = await supabase
    .from('production_shot_plans')
    .select('characters, location, series_id, organization_id')
    .eq('id', shotPlanId)
    .maybeSingle();

  if (error || !shot) {
    throw new Error('Shot not found');
  }

  const requiredImages: string[] = [];
  const availableImages: string[] = [];

  if (shot.characters && shot.characters.length > 0) {
    const { data: profiles } = await supabase
      .from('character_consistency_profiles')
      .select('character_id, reference_image_cloud_storage_uris')
      .eq('series_id', shot.series_id);

    const { data: characters } = await supabase
      .from('characters')
      .select('id, name, reference_image_url')
      .eq('series_id', shot.series_id)
      .in('name', shot.characters);

    (characters || []).forEach(char => {
      requiredImages.push(`character:${char.name}`);
      if (char.reference_image_url) {
        availableImages.push(char.reference_image_url);
      }
      const profile = (profiles || []).find(p => p.character_id === char.id);
      if (profile?.reference_image_cloud_storage_uris?.length) {
        availableImages.push(...profile.reference_image_cloud_storage_uris);
      }
    });
  }

  if (shot.location) {
    requiredImages.push(`location:${shot.location}`);

    const { data: locProfile } = await supabase
      .from('location_consistency_profiles')
      .select('reference_image_cloud_storage_uris')
      .eq('series_id', shot.series_id)
      .eq('location_name', shot.location)
      .maybeSingle();

    if (locProfile?.reference_image_cloud_storage_uris?.length) {
      availableImages.push(...locProfile.reference_image_cloud_storage_uris);
    }
  }

  const missingImages = requiredImages.filter(req => {
    const [type, name] = req.split(':');
    if (type === 'character') {
      return !availableImages.some(img => img.includes(name.toLowerCase().replace(/\s+/g, '')));
    }
    if (type === 'location') {
      return !availableImages.some(img => img.includes(name.toLowerCase().replace(/\s+/g, '')));
    }
    return true;
  });

  return {
    characters: shot.characters || [],
    location: shot.location || '',
    required_images: requiredImages,
    available_images: [...new Set(availableImages)],
    missing_images: missingImages,
    ready_for_rendering: missingImages.length === 0
  };
}

export async function calculateRenderingReadiness(
  episodeId: string
): Promise<{
  total_shots: number;
  shots_ready: number;
  shots_missing_images: number;
  readiness_percent: number;
  blocking_shots: string[];
}> {
  const { data: shots, error } = await supabase
    .from('production_shot_plans')
    .select('id, shot_number, characters, location')
    .eq('episode_id', episodeId);

  if (error || !shots) {
    throw error || new Error('No shots found');
  }

  let shotsReady = 0;
  const blockingShots: string[] = [];

  for (const shot of shots) {
    const requirements = await getShotImageRequirements(shot.id);
    if (requirements.ready_for_rendering) {
      shotsReady++;
    } else {
      blockingShots.push(`Shot ${shot.shot_number}: missing ${requirements.missing_images.join(', ')}`);
    }
  }

  return {
    total_shots: shots.length,
    shots_ready: shotsReady,
    shots_missing_images: shots.length - shotsReady,
    readiness_percent: shots.length > 0 ? Math.round((shotsReady / shots.length) * 100) : 0,
    blocking_shots: blockingShots.slice(0, 10)
  };
}
