import { useState, useEffect } from 'react';
import { Info, Camera, Sun, Film, Zap, Save, Loader2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface PhotorealConfig {
  realistic_environments_enabled: boolean;
  environment_detail_level: string;
  realistic_video_style: boolean;
  camera_movement_style: string;
  depth_of_field: string;
  color_grading_style: string;
  lighting_style: string;
  weather_effects: boolean;
  time_of_day_variation: boolean;
  lens_flare_enabled: boolean;
  motion_blur_enabled: boolean;
  hdr_enabled: boolean;
  ray_tracing_quality: string;
}

const DEFAULT_CONFIG: PhotorealConfig = {
  realistic_environments_enabled: true,
  environment_detail_level: 'high',
  realistic_video_style: true,
  camera_movement_style: 'cinematic',
  depth_of_field: 'medium',
  color_grading_style: 'natural',
  lighting_style: 'natural',
  weather_effects: false,
  time_of_day_variation: true,
  lens_flare_enabled: false,
  motion_blur_enabled: true,
  hdr_enabled: true,
  ray_tracing_quality: 'high',
};

export function PhotorealSettings() {
  const { showSuccess, showError } = useNotification();
  const { currentOrganization } = useOrganization();
  const [config, setConfig] = useState<PhotorealConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [currentOrganization]);

  const loadConfig = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_type_configs')
        .select('features, default_settings')
        .eq('workspace_type', 'photoreal')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const features = data.features as any || {};
        const settings = data.default_settings as any || {};

        setConfig({
          realistic_environments_enabled: features.realistic_environments?.enabled ?? DEFAULT_CONFIG.realistic_environments_enabled,
          environment_detail_level: features.realistic_environments?.detail_level ?? DEFAULT_CONFIG.environment_detail_level,
          realistic_video_style: features.realistic_video_style?.enabled ?? DEFAULT_CONFIG.realistic_video_style,
          camera_movement_style: settings.camera_movement_style ?? DEFAULT_CONFIG.camera_movement_style,
          depth_of_field: settings.depth_of_field ?? DEFAULT_CONFIG.depth_of_field,
          color_grading_style: settings.color_grading_style ?? DEFAULT_CONFIG.color_grading_style,
          lighting_style: settings.lighting_style ?? DEFAULT_CONFIG.lighting_style,
          weather_effects: features.realistic_environments?.weather_effects ?? DEFAULT_CONFIG.weather_effects,
          time_of_day_variation: features.realistic_environments?.time_of_day_variation ?? DEFAULT_CONFIG.time_of_day_variation,
          lens_flare_enabled: settings.lens_flare_enabled ?? DEFAULT_CONFIG.lens_flare_enabled,
          motion_blur_enabled: settings.motion_blur_enabled ?? DEFAULT_CONFIG.motion_blur_enabled,
          hdr_enabled: settings.hdr_enabled ?? DEFAULT_CONFIG.hdr_enabled,
          ray_tracing_quality: settings.ray_tracing_quality ?? DEFAULT_CONFIG.ray_tracing_quality,
        });
      }
    } catch (error) {
      console.error('Failed to load photoreal config:', error);
      showError('Failed to load photoreal settings');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!currentOrganization) return;

    setSaving(true);
    try {
      const features = {
        realistic_environments: {
          enabled: config.realistic_environments_enabled,
          detail_level: config.environment_detail_level,
          weather_effects: config.weather_effects,
          time_of_day_variation: config.time_of_day_variation,
        },
        realistic_video_style: {
          enabled: config.realistic_video_style,
        },
      };

      const defaultSettings = {
        camera_movement_style: config.camera_movement_style,
        depth_of_field: config.depth_of_field,
        color_grading_style: config.color_grading_style,
        lighting_style: config.lighting_style,
        lens_flare_enabled: config.lens_flare_enabled,
        motion_blur_enabled: config.motion_blur_enabled,
        hdr_enabled: config.hdr_enabled,
        ray_tracing_quality: config.ray_tracing_quality,
        animation_style: 'photoreal',
        character_style: 'realistic',
        video_fps: 30,
      };

      const { error } = await supabase
        .from('workspace_type_configs')
        .upsert({
          workspace_type: 'photoreal',
          features,
          default_settings: defaultSettings,
        }, {
          onConflict: 'workspace_type',
        });

      if (error) throw error;

      showSuccess('Photoreal settings saved successfully');
    } catch (error) {
      console.error('Failed to save photoreal config:', error);
      showError('Failed to save photoreal settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Photoreal Workspace Settings</p>
            <p>Configure settings specific to photorealistic video production, including environment detail, camera settings, and visual effects.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Camera & Cinematography</h3>
          </div>
          <div className="space-y-4 pl-7">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.realistic_video_style}
                onChange={(e) => setConfig({ ...config, realistic_video_style: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Realistic Video Style</span>
                <p className="text-xs text-gray-500">Apply cinematic camera techniques and professional filming aesthetics</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Camera Movement Style
              </label>
              <select
                value={config.camera_movement_style}
                onChange={(e) => setConfig({ ...config, camera_movement_style: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="static">Static (Tripod-mounted, minimal movement)</option>
                <option value="handheld">Handheld (Natural, documentary feel)</option>
                <option value="cinematic">Cinematic (Smooth dollies and tracking shots)</option>
                <option value="dynamic">Dynamic (Active camera, energetic movement)</option>
                <option value="hybrid">Hybrid (Mix of techniques)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Depth of Field
              </label>
              <select
                value={config.depth_of_field}
                onChange={(e) => setConfig({ ...config, depth_of_field: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="shallow">Shallow (Cinematic bokeh, isolated subject)</option>
                <option value="medium">Medium (Balanced focus)</option>
                <option value="deep">Deep (Everything in focus)</option>
                <option value="variable">Variable (Adjust per shot)</option>
              </select>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.motion_blur_enabled}
                onChange={(e) => setConfig({ ...config, motion_blur_enabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Motion Blur</span>
                <p className="text-xs text-gray-500">Add realistic motion blur for natural movement</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.lens_flare_enabled}
                onChange={(e) => setConfig({ ...config, lens_flare_enabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Lens Flare</span>
                <p className="text-xs text-gray-500">Enable lens flare effects for bright light sources</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Lighting & Color</h3>
          </div>
          <div className="space-y-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lighting Style
              </label>
              <select
                value={config.lighting_style}
                onChange={(e) => setConfig({ ...config, lighting_style: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="natural">Natural (Realistic daylight)</option>
                <option value="studio">Studio (Controlled professional lighting)</option>
                <option value="dramatic">Dramatic (High contrast, moody)</option>
                <option value="soft">Soft (Diffused, gentle lighting)</option>
                <option value="volumetric">Volumetric (God rays, atmospheric)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Grading Style
              </label>
              <select
                value={config.color_grading_style}
                onChange={(e) => setConfig({ ...config, color_grading_style: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="natural">Natural (True to life colors)</option>
                <option value="warm">Warm (Golden tones)</option>
                <option value="cool">Cool (Blue/teal tones)</option>
                <option value="cinematic">Cinematic (Orange & teal)</option>
                <option value="desaturated">Desaturated (Muted, documentary style)</option>
                <option value="vibrant">Vibrant (Enhanced saturation)</option>
              </select>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.hdr_enabled}
                onChange={(e) => setConfig({ ...config, hdr_enabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">HDR (High Dynamic Range)</span>
                <p className="text-xs text-gray-500">Enable HDR for enhanced contrast and color range</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Film className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Environment & Realism</h3>
          </div>
          <div className="space-y-4 pl-7">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.realistic_environments_enabled}
                onChange={(e) => setConfig({ ...config, realistic_environments_enabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Realistic Environments</span>
                <p className="text-xs text-gray-500">Generate photorealistic backgrounds and settings</p>
              </div>
            </label>

            {config.realistic_environments_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment Detail Level
                </label>
                <select
                  value={config.environment_detail_level}
                  onChange={(e) => setConfig({ ...config, environment_detail_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low (Basic details, faster generation)</option>
                  <option value="medium">Medium (Balanced detail and performance)</option>
                  <option value="high">High (Maximum detail, longer generation)</option>
                  <option value="ultra">Ultra (Photographic quality)</option>
                </select>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.weather_effects}
                onChange={(e) => setConfig({ ...config, weather_effects: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Weather Effects</span>
                <p className="text-xs text-gray-500">Include rain, fog, snow, and atmospheric conditions</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.time_of_day_variation}
                onChange={(e) => setConfig({ ...config, time_of_day_variation: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Time of Day Variation</span>
                <p className="text-xs text-gray-500">Vary lighting based on time of day (golden hour, blue hour, etc.)</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Rendering Quality</h3>
          </div>
          <div className="space-y-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ray Tracing Quality
              </label>
              <select
                value={config.ray_tracing_quality}
                onChange={(e) => setConfig({ ...config, ray_tracing_quality: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="off">Off (Faster, less realistic)</option>
                <option value="low">Low (Basic reflections)</option>
                <option value="medium">Medium (Good balance)</option>
                <option value="high">High (Realistic reflections and shadows)</option>
                <option value="ultra">Ultra (Maximum realism, slower)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Higher quality produces more realistic lighting and reflections but requires more processing time
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
