export type FormatType = 'broadcast' | 'streaming' | 'short_form' | 'medium_form' | 'custom' | 'spot';

export type BreakType = 'commercial' | 'chapter' | 'end';

export interface BreakStructure {
  segment_count: number;
  break_positions: string[];
  break_durations: number[];
  break_types: BreakType[];
  end_break_duration?: number;
}

export interface ProgramFormatConfig {
  program_length_minutes: number;
  total_episode_minutes: number;
  break_structure: BreakStructure;
  format_type: FormatType;
  content_only_seconds: number;
  total_seconds: number;
}

export interface FormatPreset {
  id: string;
  name: string;
  description: string;
  format_type: FormatType;
  program_length_minutes: number;
  total_episode_minutes: number;
  break_structure: BreakStructure;
  typical_use_cases: string[];
}

export const FORMAT_PRESETS: Record<string, FormatPreset> = {
  broadcast: {
    id: 'broadcast',
    name: 'Standard Broadcast',
    description: 'Traditional TV with commercial breaks',
    format_type: 'broadcast',
    program_length_minutes: 22,
    total_episode_minutes: 30,
    break_structure: {
      segment_count: 4,
      break_positions: ['00:05:30', '00:11:00', '00:16:30'],
      break_durations: [120, 120, 120],
      break_types: ['commercial', 'commercial', 'commercial'],
      end_break_duration: 120,
    },
    typical_use_cases: ['Network TV', 'Cable TV', 'Syndication'],
  },
  streaming: {
    id: 'streaming',
    name: 'Streaming (No Breaks)',
    description: 'Continuous content without commercial breaks',
    format_type: 'streaming',
    program_length_minutes: 22,
    total_episode_minutes: 22,
    break_structure: {
      segment_count: 1,
      break_positions: [],
      break_durations: [],
      break_types: [],
    },
    typical_use_cases: ['Netflix', 'Disney+', 'Apple TV+', 'Amazon Prime'],
  },
  youtube_short: {
    id: 'youtube_short',
    name: 'YouTube Short',
    description: 'Ultra-short vertical video format',
    format_type: 'short_form',
    program_length_minutes: 1,
    total_episode_minutes: 1,
    break_structure: {
      segment_count: 1,
      break_positions: [],
      break_durations: [],
      break_types: [],
    },
    typical_use_cases: ['YouTube Shorts', 'TikTok', 'Instagram Reels'],
  },
  youtube_standard: {
    id: 'youtube_standard',
    name: 'YouTube Standard',
    description: 'Standard YouTube video with optional mid-roll',
    format_type: 'medium_form',
    program_length_minutes: 10,
    total_episode_minutes: 10,
    break_structure: {
      segment_count: 2,
      break_positions: ['00:05:00'],
      break_durations: [0],
      break_types: ['chapter'],
    },
    typical_use_cases: ['YouTube', 'Vimeo', 'Social Media'],
  },
  youtube_long: {
    id: 'youtube_long',
    name: 'YouTube Long Form',
    description: 'Extended YouTube content with chapter markers',
    format_type: 'medium_form',
    program_length_minutes: 15,
    total_episode_minutes: 15,
    break_structure: {
      segment_count: 3,
      break_positions: ['00:05:00', '00:10:00'],
      break_durations: [0, 0],
      break_types: ['chapter', 'chapter'],
    },
    typical_use_cases: ['YouTube', 'Educational Content', 'Tutorials'],
  },
  short_5min: {
    id: 'short_5min',
    name: '5 Minute Episode',
    description: 'Quick episode for social media or web series',
    format_type: 'short_form',
    program_length_minutes: 5,
    total_episode_minutes: 5,
    break_structure: {
      segment_count: 1,
      break_positions: [],
      break_durations: [],
      break_types: [],
    },
    typical_use_cases: ['Web Series', 'Social Media', 'Kids Content'],
  },
  broadcast_15min: {
    id: 'broadcast_15min',
    name: '15 Minute Broadcast',
    description: 'Shorter TV format with 2 breaks',
    format_type: 'broadcast',
    program_length_minutes: 11,
    total_episode_minutes: 15,
    break_structure: {
      segment_count: 3,
      break_positions: ['00:03:40', '00:07:20'],
      break_durations: [120, 120],
      break_types: ['commercial', 'commercial'],
      end_break_duration: 60,
    },
    typical_use_cases: ['Network TV', 'Kids Programming'],
  },
  broadcast_45min: {
    id: 'broadcast_45min',
    name: '45 Minute Drama',
    description: 'Hour-long TV drama format',
    format_type: 'broadcast',
    program_length_minutes: 42,
    total_episode_minutes: 60,
    break_structure: {
      segment_count: 5,
      break_positions: ['00:08:25', '00:16:50', '00:25:15', '00:33:40'],
      break_durations: [180, 180, 180, 180],
      break_types: ['commercial', 'commercial', 'commercial', 'commercial'],
      end_break_duration: 180,
    },
    typical_use_cases: ['Prime Time Drama', 'Cable Series'],
  },
  // Commercial & Promo spot presets
  spot_10: {
    id: 'spot_10',
    name: ':10 Bumper',
    description: '10-second spot — bumper ads, pre-rolls, social stories',
    format_type: 'spot',
    program_length_minutes: 10 / 60,
    total_episode_minutes: 10 / 60,
    break_structure: {
      segment_count: 1,
      break_positions: [],
      break_durations: [],
      break_types: [],
    },
    typical_use_cases: ['Bumper Ads', 'Social Stories', 'Pre-Roll'],
  },
  spot_15: {
    id: 'spot_15',
    name: ':15 Spot',
    description: '15-second spot — standard digital pre-roll, TikTok, Instagram Reels',
    format_type: 'spot',
    program_length_minutes: 15 / 60,
    total_episode_minutes: 15 / 60,
    break_structure: {
      segment_count: 1,
      break_positions: [],
      break_durations: [],
      break_types: [],
    },
    typical_use_cases: ['Digital Pre-Roll', 'TikTok', 'Instagram Reels', 'YouTube Bumper'],
  },
  spot_30: {
    id: 'spot_30',
    name: ':30 Spot',
    description: '30-second spot — standard broadcast commercial, YouTube skippable',
    format_type: 'spot',
    program_length_minutes: 30 / 60,
    total_episode_minutes: 30 / 60,
    break_structure: {
      segment_count: 1,
      break_positions: [],
      break_durations: [],
      break_types: [],
    },
    typical_use_cases: ['Broadcast TV', 'Cable', 'YouTube Skippable', 'OTT/Streaming'],
  },
};

export function getDefaultBreakStructure(segmentCount: number, totalBreakSeconds: number): BreakStructure {
  if (segmentCount === 1) {
    return {
      segment_count: 1,
      break_positions: [],
      break_durations: [],
      break_types: [],
    };
  }

  const breakCount = segmentCount - 1;
  const breakDurationEach = Math.floor(totalBreakSeconds / segmentCount);
  const endBreakDuration = totalBreakSeconds - (breakDurationEach * breakCount);

  const breaks: string[] = [];
  const durations: number[] = [];
  const types: BreakType[] = [];

  for (let i = 0; i < breakCount; i++) {
    breaks.push('00:00:00');
    durations.push(breakDurationEach);
    types.push('commercial');
  }

  return {
    segment_count: segmentCount,
    break_positions: breaks,
    break_durations: durations,
    break_types: types,
    end_break_duration: endBreakDuration,
  };
}

export function calculateTotalBreakTime(breakStructure: BreakStructure): number {
  const internalBreaks = breakStructure.break_durations.reduce((sum, duration) => sum + duration, 0);
  const endBreak = breakStructure.end_break_duration || 0;
  return internalBreaks + endBreak;
}

export function calculateContentTime(totalMinutes: number, breakStructure: BreakStructure): number {
  const totalSeconds = totalMinutes * 60;
  const breakSeconds = calculateTotalBreakTime(breakStructure);
  return totalSeconds - breakSeconds;
}

export function formatTimecode(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimecode(timecode: string): number {
  const parts = timecode.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function calculateBreakPositions(
  contentMinutes: number,
  segmentCount: number
): string[] {
  if (segmentCount <= 1) return [];

  const contentSeconds = contentMinutes * 60;
  const segmentDuration = contentSeconds / segmentCount;
  const positions: string[] = [];

  for (let i = 1; i < segmentCount; i++) {
    positions.push(formatTimecode(Math.floor(segmentDuration * i)));
  }

  return positions;
}

export function getFormatBadgeColor(formatType: FormatType): string {
  switch (formatType) {
    case 'broadcast':
      return 'bg-blue-100 text-blue-700';
    case 'streaming':
      return 'bg-purple-100 text-purple-700';
    case 'short_form':
      return 'bg-green-100 text-green-700';
    case 'medium_form':
      return 'bg-orange-100 text-orange-700';
    case 'spot':
      return 'bg-amber-100 text-amber-700';
    case 'custom':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getFormatDisplayName(formatType: FormatType): string {
  switch (formatType) {
    case 'broadcast':
      return 'Broadcast';
    case 'streaming':
      return 'Streaming';
    case 'short_form':
      return 'Short Form';
    case 'medium_form':
      return 'Medium Form';
    case 'spot':
      return 'Spot';
    case 'custom':
      return 'Custom';
    default:
      return formatType;
  }
}

export function validateFormatConfig(config: Partial<ProgramFormatConfig>): string[] {
  const errors: string[] = [];

  if (config.program_length_minutes !== undefined) {
    if (config.program_length_minutes <= 0) {
      errors.push('Program length must be greater than 0');
    }
    if (config.program_length_minutes > 180) {
      errors.push('Program length cannot exceed 180 minutes');
    }
  }

  if (config.total_episode_minutes !== undefined && config.program_length_minutes !== undefined) {
    if (config.total_episode_minutes < config.program_length_minutes) {
      errors.push('Total episode length must be at least as long as program length');
    }
  }

  if (config.break_structure) {
    const breakTime = calculateTotalBreakTime(config.break_structure);
    if (config.total_episode_minutes !== undefined && config.program_length_minutes !== undefined) {
      const expectedBreakTime = (config.total_episode_minutes - config.program_length_minutes) * 60;
      if (Math.abs(breakTime - expectedBreakTime) > 5) {
        errors.push('Break structure durations do not match the difference between total and content time');
      }
    }

    if (config.break_structure.segment_count < 1) {
      errors.push('Must have at least 1 segment');
    }

    if (config.break_structure.segment_count > 1) {
      const expectedBreaks = config.break_structure.segment_count - 1;
      if (config.break_structure.break_positions.length !== expectedBreaks) {
        errors.push(`Expected ${expectedBreaks} break positions for ${config.break_structure.segment_count} segments`);
      }
    }
  }

  return errors;
}
