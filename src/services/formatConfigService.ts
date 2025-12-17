import { supabase } from '../lib/supabase';
import type {
  ProgramFormatConfig,
  FormatType,
  BreakStructure,
  FormatPreset,
} from '../types/formatConfig';
import {
  FORMAT_PRESETS,
  calculateTotalBreakTime,
  calculateBreakPositions,
  validateFormatConfig,
  getDefaultBreakStructure,
} from '../types/formatConfig';

export async function getSeriesFormatConfig(seriesId: string): Promise<ProgramFormatConfig> {
  const { data, error } = await supabase
    .from('series')
    .select('program_length_minutes, total_episode_minutes, break_structure')
    .eq('id', seriesId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Series not found');

  return {
    program_length_minutes: data.program_length_minutes || 22,
    total_episode_minutes: data.total_episode_minutes || 30,
    break_structure: data.break_structure || FORMAT_PRESETS.broadcast.break_structure,
    format_type: 'broadcast',
    content_only_seconds: (data.program_length_minutes || 22) * 60,
    total_seconds: (data.total_episode_minutes || 30) * 60,
  };
}

export async function updateSeriesFormatConfig(
  seriesId: string,
  config: Partial<ProgramFormatConfig>
): Promise<void> {
  const errors = validateFormatConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid format configuration: ${errors.join(', ')}`);
  }

  const updates: Record<string, any> = {};

  if (config.program_length_minutes !== undefined) {
    updates.program_length_minutes = config.program_length_minutes;
  }

  if (config.total_episode_minutes !== undefined) {
    updates.total_episode_minutes = config.total_episode_minutes;
  }

  if (config.break_structure !== undefined) {
    updates.break_structure = config.break_structure;
  }

  const { error } = await supabase
    .from('series')
    .update(updates)
    .eq('id', seriesId);

  if (error) throw error;
}

export async function getScriptFormatConfig(scriptId: string): Promise<ProgramFormatConfig> {
  const { data, error } = await supabase.rpc('get_script_format_config', {
    script_id: scriptId,
  });

  if (error) throw error;
  if (!data) throw new Error('Script not found');

  return data as ProgramFormatConfig;
}

export async function updateScriptFormatConfig(
  scriptId: string,
  config: Partial<ProgramFormatConfig>
): Promise<void> {
  const errors = validateFormatConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid format configuration: ${errors.join(', ')}`);
  }

  const updates: Record<string, any> = {};

  if (config.program_length_minutes !== undefined) {
    updates.program_length_minutes = config.program_length_minutes;
  }

  if (config.total_episode_minutes !== undefined) {
    updates.total_episode_minutes = config.total_episode_minutes;
  }

  if (config.break_structure !== undefined) {
    updates.break_structure = config.break_structure;
  }

  if (config.format_type !== undefined) {
    updates.format_type = config.format_type;
  }

  const { error } = await supabase
    .from('scripts')
    .update(updates)
    .eq('id', scriptId);

  if (error) throw error;
}

export async function clearScriptFormatOverride(scriptId: string): Promise<void> {
  const { error } = await supabase
    .from('scripts')
    .update({
      program_length_minutes: null,
      total_episode_minutes: null,
      break_structure: null,
    })
    .eq('id', scriptId);

  if (error) throw error;
}

export function applyFormatPreset(presetId: string): Partial<ProgramFormatConfig> {
  const preset = FORMAT_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }

  return {
    program_length_minutes: preset.program_length_minutes,
    total_episode_minutes: preset.total_episode_minutes,
    break_structure: preset.break_structure,
    format_type: preset.format_type,
  };
}

export function createCustomFormat(
  programMinutes: number,
  totalMinutes: number,
  segmentCount: number
): Partial<ProgramFormatConfig> {
  const totalBreakSeconds = (totalMinutes - programMinutes) * 60;
  const breakStructure = getDefaultBreakStructure(segmentCount, totalBreakSeconds);

  const positions = calculateBreakPositions(programMinutes, segmentCount);
  breakStructure.break_positions = positions;

  const errors = validateFormatConfig({
    program_length_minutes: programMinutes,
    total_episode_minutes: totalMinutes,
    break_structure: breakStructure,
  });

  if (errors.length > 0) {
    throw new Error(`Invalid custom format: ${errors.join(', ')}`);
  }

  return {
    program_length_minutes: programMinutes,
    total_episode_minutes: totalMinutes,
    break_structure: breakStructure,
    format_type: 'custom',
  };
}

export function getFormatSummary(config: ProgramFormatConfig): string {
  const contentMin = config.program_length_minutes;
  const totalMin = config.total_episode_minutes;
  const segments = config.break_structure.segment_count;

  if (contentMin === totalMin) {
    return `${contentMin} min (no breaks)`;
  }

  return `${contentMin} min content / ${totalMin} min total / ${segments} segment${segments > 1 ? 's' : ''}`;
}

export function getFormatDetails(config: ProgramFormatConfig): {
  contentTime: string;
  totalTime: string;
  breakTime: string;
  segmentCount: number;
  segmentDuration: string;
} {
  const breakSeconds = calculateTotalBreakTime(config.break_structure);
  const segmentSeconds = (config.program_length_minutes * 60) / config.break_structure.segment_count;

  return {
    contentTime: `${config.program_length_minutes} min`,
    totalTime: `${config.total_episode_minutes} min`,
    breakTime: `${Math.floor(breakSeconds / 60)} min ${breakSeconds % 60} sec`,
    segmentCount: config.break_structure.segment_count,
    segmentDuration: `${Math.floor(segmentSeconds / 60)} min ${Math.floor(segmentSeconds % 60)} sec`,
  };
}

export function calculateCostScalingFactor(
  actualContentMinutes: number,
  baseContentMinutes: number = 22
): number {
  return actualContentMinutes / baseContentMinutes;
}

export function estimateSceneCount(contentMinutes: number): number {
  const scenesPerMinute = 1.5;
  return Math.ceil(contentMinutes * scenesPerMinute);
}

export function estimateShotCount(contentMinutes: number): number {
  const shotsPerMinute = 3;
  return Math.ceil(contentMinutes * shotsPerMinute);
}

export function estimateDialogueMinutes(contentMinutes: number): number {
  const dialogueRatio = 0.7;
  return Math.round(contentMinutes * dialogueRatio * 10) / 10;
}

export function getAvailablePresets(): FormatPreset[] {
  return Object.values(FORMAT_PRESETS);
}

export function getPresetById(id: string): FormatPreset | undefined {
  return FORMAT_PRESETS[id];
}

export function suggestFormatByPlatform(platform: string): FormatPreset {
  const platformLower = platform.toLowerCase();

  if (platformLower.includes('netflix') || platformLower.includes('disney') ||
      platformLower.includes('amazon') || platformLower.includes('apple')) {
    return FORMAT_PRESETS.streaming;
  }

  if (platformLower.includes('youtube')) {
    if (platformLower.includes('short')) {
      return FORMAT_PRESETS.youtube_short;
    } else if (platformLower.includes('long')) {
      return FORMAT_PRESETS.youtube_long;
    }
    return FORMAT_PRESETS.youtube_standard;
  }

  if (platformLower.includes('tiktok') || platformLower.includes('instagram') ||
      platformLower.includes('reel')) {
    return FORMAT_PRESETS.youtube_short;
  }

  if (platformLower.includes('tv') || platformLower.includes('broadcast') ||
      platformLower.includes('cable')) {
    return FORMAT_PRESETS.broadcast;
  }

  return FORMAT_PRESETS.streaming;
}

export async function getFormatUsageStats(organizationId: string): Promise<{
  format_type: FormatType;
  count: number;
  avg_content_minutes: number;
}[]> {
  const { data, error } = await supabase
    .from('scripts')
    .select('format_type, program_length_minutes, series!inner(organization_id)')
    .eq('series.organization_id', organizationId);

  if (error) throw error;

  const stats = new Map<FormatType, { count: number; totalMinutes: number }>();

  data?.forEach((script: any) => {
    const formatType = script.format_type as FormatType;
    const minutes = script.program_length_minutes || 22;

    if (!stats.has(formatType)) {
      stats.set(formatType, { count: 0, totalMinutes: 0 });
    }

    const stat = stats.get(formatType)!;
    stat.count++;
    stat.totalMinutes += minutes;
  });

  return Array.from(stats.entries()).map(([format_type, { count, totalMinutes }]) => ({
    format_type,
    count,
    avg_content_minutes: Math.round(totalMinutes / count),
  }));
}

export const formatConfigService = {
  getPreset: (presetId: string) => FORMAT_PRESETS[presetId],
  getAllPresets: () => Object.values(FORMAT_PRESETS),
  validateConfig: (config: Partial<ProgramFormatConfig>) => {
    const errors = validateFormatConfig(config);
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  },
  applyPreset: applyFormatPreset,
  createCustom: createCustomFormat,
  getSummary: getFormatSummary,
  getDetails: getFormatDetails
};
