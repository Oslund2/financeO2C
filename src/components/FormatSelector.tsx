import { useState } from 'react';
import { Clock, Tv, Play, Film, ChevronDown, Info } from 'lucide-react';
import {
  FORMAT_PRESETS,
  getFormatBadgeColor,
  type FormatPreset,
} from '../types/formatConfig';

interface FormatSelectorProps {
  value: string;
  onChange: (presetId: string) => void;
  disabled?: boolean;
}

export function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const presets = Object.values(FORMAT_PRESETS);
  const selectedPreset = FORMAT_PRESETS[value];

  const getFormatIcon = (formatType: string) => {
    switch (formatType) {
      case 'broadcast':
        return Tv;
      case 'streaming':
        return Play;
      case 'short_form':
        return Clock;
      case 'medium_form':
        return Film;
      default:
        return Film;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    return `${minutes} min`;
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name} ({formatDuration(preset.program_length_minutes)})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {selectedPreset && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getFormatBadgeColor(selectedPreset.format_type)}`}>
              {(() => {
                const Icon = getFormatIcon(selectedPreset.format_type);
                return <Icon className="w-5 h-5" />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">{selectedPreset.name}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFormatBadgeColor(selectedPreset.format_type)}`}>
                  {selectedPreset.format_type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{selectedPreset.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-0.5">Content</div>
                  <div className="font-semibold text-gray-900">{formatDuration(selectedPreset.program_length_minutes)}</div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-0.5">Total</div>
                  <div className="font-semibold text-gray-900">{formatDuration(selectedPreset.total_episode_minutes)}</div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-0.5">Segments</div>
                  <div className="font-semibold text-gray-900">{selectedPreset.break_structure.segment_count}</div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-0.5">Breaks</div>
                  <div className="font-semibold text-gray-900">{selectedPreset.break_structure.break_positions.length}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-3 flex items-center gap-1 text-sm text-scripps-blue hover:text-scripps-dark-blue transition-colors"
              >
                <Info className="w-4 h-4" />
                {isExpanded ? 'Hide details' : 'Show use cases'}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Typical Use Cases</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPreset.typical_use_cases.map((useCase, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700"
                      >
                        {useCase}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FormatBadge({ formatType, programMinutes }: { formatType: string; programMinutes: number }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getFormatBadgeColor(formatType as any)}`}>
      <span>{programMinutes} min</span>
      <span className="opacity-70">|</span>
      <span className="capitalize">{formatType.replace('_', ' ')}</span>
    </div>
  );
}
