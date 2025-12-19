import type { ElementType } from 'react';
import { Play, Tv, Monitor, Film, Check } from 'lucide-react';
import { DistributionChannelSettings } from '../services/episodeProfitSettingsService';

export interface FormatPreset {
  id: string;
  name: string;
  description: string;
  icon: ElementType;
  runtimeMinutes: number;
  breaksPerEpisode: number;
  channels: DistributionChannelSettings[];
  runsPerYear: number;
  impressionRange: { min: number; max: number };
  bgGradient: string;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: 'social-short',
    name: '5-min Social Short',
    description: 'YouTube Shorts + TikTok - Ad revenue + sponsorship potential',
    icon: Play,
    runtimeMinutes: 5,
    breaksPerEpisode: 0,
    runsPerYear: 12,
    impressionRange: { min: 50000, max: 500000 },
    bgGradient: 'from-red-500 to-pink-600',
    channels: [
      { id: '1', name: 'YouTube (Ad Revenue)', buyingModel: 'cpm', rate: 200, cpmRate: 2.00, impressionsPerRun: 100000, enabled: true },
      { id: '2', name: 'YouTube (Sponsorship)', buyingModel: 'cpm', rate: 1500, cpmRate: 15.00, impressionsPerRun: 100000, enabled: true },
      { id: '3', name: 'TikTok Creator Fund', buyingModel: 'cpm', rate: 20, cpmRate: 0.04, impressionsPerRun: 250000, enabled: true },
      { id: '4', name: 'Instagram Reels Bonus', buyingModel: 'cpm', rate: 75, cpmRate: 0.50, impressionsPerRun: 150000, enabled: false }
    ]
  },
  {
    id: 'digital-11',
    name: '11-min Digital',
    description: 'YouTube long-form with mid-roll ads + streaming',
    icon: Monitor,
    runtimeMinutes: 11,
    breaksPerEpisode: 1,
    runsPerYear: 8,
    impressionRange: { min: 20000, max: 150000 },
    bgGradient: 'from-blue-500 to-cyan-600',
    channels: [
      { id: '1', name: 'YouTube (Ad Revenue)', buyingModel: 'cpm', rate: 300, cpmRate: 4.00, impressionsPerRun: 75000, enabled: true },
      { id: '2', name: 'YouTube (Sponsorship)', buyingModel: 'cpm', rate: 1500, cpmRate: 20.00, impressionsPerRun: 75000, enabled: true },
      { id: '3', name: 'O&O Streaming', buyingModel: 'cpm', rate: 450, cpmRate: 18, impressionsPerRun: 25000, enabled: true },
      { id: '4', name: 'Tablo Kids', buyingModel: 'cpm', rate: 180, cpmRate: 12, impressionsPerRun: 15000, enabled: true }
    ]
  },
  {
    id: 'broadcast-22',
    name: '22-min Broadcast',
    description: 'Full distribution - TV, streaming, YouTube with multiple ad breaks',
    icon: Tv,
    runtimeMinutes: 22,
    breaksPerEpisode: 3,
    runsPerYear: 4,
    impressionRange: { min: 100000, max: 500000 },
    bgGradient: 'from-emerald-500 to-teal-600',
    channels: [
      { id: '1', name: 'O&O TV', buyingModel: 'spot', rate: 350, cpmRate: 28, impressionsPerRun: 200000, enabled: true },
      { id: '2', name: 'O&O Streaming', buyingModel: 'cpm', rate: 750, cpmRate: 25, impressionsPerRun: 30000, enabled: true },
      { id: '3', name: 'YouTube (Ad Revenue)', buyingModel: 'cpm', rate: 250, cpmRate: 5.00, impressionsPerRun: 50000, enabled: true },
      { id: '4', name: 'YouTube (Sponsorship)', buyingModel: 'cpm', rate: 1000, cpmRate: 20.00, impressionsPerRun: 50000, enabled: true },
      { id: '5', name: 'Tablo Kids', buyingModel: 'cpm', rate: 300, cpmRate: 15, impressionsPerRun: 20000, enabled: true }
    ]
  },
  {
    id: 'premium-30',
    name: '30-min Premium',
    description: 'Premium rates, all channels, 4 ad breaks, maximum revenue',
    icon: Film,
    runtimeMinutes: 30,
    breaksPerEpisode: 4,
    runsPerYear: 4,
    impressionRange: { min: 150000, max: 750000 },
    bgGradient: 'from-amber-500 to-orange-600',
    channels: [
      { id: '1', name: 'O&O TV', buyingModel: 'spot', rate: 450, cpmRate: 32, impressionsPerRun: 300000, enabled: true },
      { id: '2', name: 'O&O Streaming', buyingModel: 'cpm', rate: 1400, cpmRate: 28, impressionsPerRun: 50000, enabled: true },
      { id: '3', name: 'YouTube (Ad Revenue)', buyingModel: 'cpm', rate: 450, cpmRate: 6.00, impressionsPerRun: 75000, enabled: true },
      { id: '4', name: 'YouTube (Sponsorship)', buyingModel: 'cpm', rate: 2250, cpmRate: 30.00, impressionsPerRun: 75000, enabled: true },
      { id: '5', name: 'Tablo Kids', buyingModel: 'cpm', rate: 540, cpmRate: 18, impressionsPerRun: 30000, enabled: true },
      { id: '6', name: 'Syndication', buyingModel: 'spot', rate: 200, cpmRate: 12, impressionsPerRun: 150000, enabled: false }
    ]
  }
];

interface EpisodeFormatPresetsProps {
  selectedPresetId?: string;
  onSelectPreset: (preset: FormatPreset) => void;
  disabled?: boolean;
}

export function EpisodeFormatPresets({
  selectedPresetId,
  onSelectPreset,
  disabled = false
}: EpisodeFormatPresetsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Quick Start: Episode Format</h4>
        <p className="text-xs text-gray-500">Select a preset to auto-configure channels and rates for your episode type</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FORMAT_PRESETS.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          const Icon = preset.icon;

          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              disabled={disabled}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${preset.bgGradient} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              <h5 className="font-semibold text-gray-900 text-sm mb-1">{preset.name}</h5>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{preset.description}</p>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Breaks:</span>
                  <span className="font-medium text-gray-700">{preset.breaksPerEpisode}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Runs/year:</span>
                  <span className="font-medium text-gray-700">{preset.runsPerYear}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Channels:</span>
                  <span className="font-medium text-gray-700">{preset.channels.filter(c => c.enabled).length}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
