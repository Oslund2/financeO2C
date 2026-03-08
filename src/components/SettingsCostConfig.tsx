import { useState, useEffect } from 'react';
import { Info, CheckCircle, Briefcase } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { ANIMATION_STYLE_MULTIPLIERS, PRODUCTION_TIER_PRESETS, FREELANCE_TIER_PRESETS, fetchCostConfig, updateCostConfig } from '../services/costCalculationService';
import type { AnimationStyle, ProductionTier, FreelanceTier, CostConfig } from '../services/costCalculationService';

export function SettingsCostConfig() {
  const { showSuccess, showError } = useNotification();
  const [costConfig, setCostConfig] = useState<CostConfig | null>(null);
  const [costConfigLoading, setCostConfigLoading] = useState(false);
  const [costConfigError, setCostConfigError] = useState<string | null>(null);
  const [costConfigSaving, setCostConfigSaving] = useState(false);

  useEffect(() => {
    loadCostConfig();
  }, []);

  const loadCostConfig = async () => {
    setCostConfigLoading(true);
    setCostConfigError(null);
    try {
      const config = await fetchCostConfig(null);
      setCostConfig(config);
    } catch (err) {
      setCostConfigError(err instanceof Error ? err.message : 'Failed to load cost configuration');
    } finally {
      setCostConfigLoading(false);
    }
  };

  const handleUpdateCostConfig = async (updates: Partial<CostConfig>) => {
    if (!costConfig) return;
    setCostConfigSaving(true);
    setCostConfigError(null);
    try {
      await updateCostConfig(costConfig.id, updates);
      setCostConfig({ ...costConfig, ...updates });
      showSuccess('Cost configuration saved', 'Production cost settings have been updated');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save changes';
      setCostConfigError(errorMsg);
      showError('Save failed', errorMsg);
    } finally {
      setCostConfigSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-200 p-6">
      {costConfigLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
        </div>
      ) : costConfigError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {costConfigError}
        </div>
      ) : costConfig ? (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Industry-Accurate Cost Calculations</p>
                <p>Traditional animation costs are calculated based on industry research from Beverly Boy Productions, ZipRecruiter, Upwork, and Animation Iconic. Stop-motion requires 300-500 hours per minute of finished animation.</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Animation Style</h3>
            <p className="text-sm text-gray-600 mb-3">Select the animation style to adjust labor and materials multipliers</p>
            <div className="grid gap-3">
              {(Object.entries(ANIMATION_STYLE_MULTIPLIERS) as [AnimationStyle, typeof ANIMATION_STYLE_MULTIPLIERS[AnimationStyle]][]).map(([key, settings]) => (
                <button
                  key={key}
                  onClick={() => handleUpdateCostConfig({ animation_style: key })}
                  disabled={costConfigSaving}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    costConfig.animation_style === key
                      ? 'border-gray-600 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{settings.name}</div>
                      <div className="text-sm text-gray-600">{settings.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{settings.laborMultiplier}x labor</div>
                      <div className="text-xs text-gray-500">{settings.baseHoursPerMinute} hrs/min</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Production Tier</h3>
            <p className="text-sm text-gray-600 mb-3">Select the production quality tier for hourly rates and cost estimates</p>
            <div className="grid gap-3">
              {(Object.entries(PRODUCTION_TIER_PRESETS) as [ProductionTier, typeof PRODUCTION_TIER_PRESETS[ProductionTier]][]).map(([key, settings]) => (
                <button
                  key={key}
                  onClick={() => handleUpdateCostConfig({ production_tier: key })}
                  disabled={costConfigSaving}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    costConfig.production_tier === key
                      ? 'border-gray-600 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{settings.name}</div>
                      <div className="text-sm text-gray-600">{settings.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">${settings.hourlyRate}/hr</div>
                      <div className="text-xs text-gray-500">${settings.materialsPerCharacter}/character</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Freelance Tier (Creator Economy)
            </h3>
            <p className="text-sm text-gray-600 mb-3">Configure Fiverr/Upwork freelancer rates for comparison</p>
            <div className="grid gap-3">
              {(Object.entries(FREELANCE_TIER_PRESETS) as [FreelanceTier, typeof FREELANCE_TIER_PRESETS[FreelanceTier]][]).map(([key, settings]) => (
                <button
                  key={key}
                  onClick={() => handleUpdateCostConfig({ freelance_tier: key })}
                  disabled={costConfigSaving}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    costConfig.freelance_tier === key
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{settings.name}</div>
                      <div className="text-sm text-gray-600">{settings.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">${settings.hourlyRate}/hr</div>
                      <div className="text-xs text-gray-500">{settings.platformFeePercentage}% platform fee</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Current Configuration</div>
              <div className="text-sm text-gray-600">
                {ANIMATION_STYLE_MULTIPLIERS[costConfig.animation_style || 'claymation'].name} | {PRODUCTION_TIER_PRESETS[costConfig.production_tier || 'mid_tier'].name}
              </div>
            </div>
            {costConfigSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
