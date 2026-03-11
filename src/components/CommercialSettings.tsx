import { useState, useEffect } from 'react';
import { Save, Loader2, Megaphone, DollarSign, Music, Shield, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNotification } from '../contexts/NotificationContext';

interface CommercialConfig {
  agency_name: string;
  default_billing_rate: number;
  default_markup_percent: number;
  included_revision_rounds: number;
  revision_round_cost: number;
  preferred_music_styles: string[];
  default_visual_style: string;
  brand_safety_level: string;
  mandatory_legal_disclaimer: string;
  default_spot_length: '10' | '15' | '30';
}

const DEFAULT_CONFIG: CommercialConfig = {
  agency_name: '',
  default_billing_rate: 150,
  default_markup_percent: 35,
  included_revision_rounds: 2,
  revision_round_cost: 500,
  preferred_music_styles: ['upbeat', 'emotional'],
  default_visual_style: 'photoreal',
  brand_safety_level: 'standard',
  mandatory_legal_disclaimer: '',
  default_spot_length: '30',
};

const MUSIC_STYLES = [
  { id: 'upbeat', label: 'Upbeat / Retail Energy' },
  { id: 'emotional', label: 'Emotional / Storytelling' },
  { id: 'power', label: 'Power / Authority' },
  { id: 'playful', label: 'Playful / Fun' },
  { id: 'corporate', label: 'Corporate Confidence' },
  { id: 'inspirational', label: 'Inspirational / Aspirational' },
  { id: 'urgency', label: 'Urgency / Call to Action' },
  { id: 'minimal', label: 'Minimal / Clean' },
];

export function CommercialSettings() {
  const { currentOrganization } = useOrganization();
  const { showSuccess, showError } = useNotification();
  const [config, setConfig] = useState<CommercialConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, [currentOrganization?.id]);

  const loadConfig = async () => {
    if (!currentOrganization?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('workspace_type_configs')
        .select('default_settings')
        .eq('workspace_type', 'commercial')
        .maybeSingle();

      if (data?.default_settings) {
        const saved = data.default_settings as any;
        setConfig({ ...DEFAULT_CONFIG, ...saved });
      }
    } catch (err) {
      console.error('Error loading commercial config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('workspace_type_configs')
        .upsert({
          workspace_type: 'commercial',
          display_name: 'Commercial & Promo',
          description: 'Commercial and promotional video production',
          icon_name: 'Megaphone',
          primary_color: '#F59E0B',
          features: {
            concept_generator: { enabled: true },
            campaign_brief_intake: { enabled: true },
            variant_manager: { enabled: true },
            legal_compliance_checklist: { enabled: true },
            talent_profiles: { enabled: true },
            music_generation: { enabled: true },
            ai_advantage_calculator: { enabled: true },
            realistic_environments: { enabled: true },
            realistic_video_style: { enabled: true },
          },
          default_settings: config,
        }, { onConflict: 'workspace_type' });

      if (error) throw error;
      showSuccess('Settings Saved', 'Commercial workspace settings have been updated.');
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleMusicStyle = (styleId: string) => {
    setConfig(prev => ({
      ...prev,
      preferred_music_styles: prev.preferred_music_styles.includes(styleId)
        ? prev.preferred_music_styles.filter(s => s !== styleId)
        : [...prev.preferred_music_styles, styleId],
    }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading commercial settings...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">

      {/* Agency / Studio Identity */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-semibold text-gray-900">Agency / Studio Identity</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agency or Studio Name</label>
            <input
              type="text"
              value={config.agency_name}
              onChange={e => setConfig(prev => ({ ...prev, agency_name: e.target.value }))}
              placeholder="e.g. Apex Creative Studios"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Used in AI prompts as the producing agency.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Spot Length</label>
            <select
              value={config.default_spot_length}
              onChange={e => setConfig(prev => ({ ...prev, default_spot_length: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="10">:10 Bumper</option>
              <option value="15">:15 Spot</option>
              <option value="30">:30 Spot</option>
            </select>
          </div>
        </div>
      </section>

      {/* Billing & Economics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="text-base font-semibold text-gray-900">Billing & Economics Defaults</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Hourly Rate ($)</label>
            <input
              type="number"
              value={config.default_billing_rate}
              onChange={e => setConfig(prev => ({ ...prev, default_billing_rate: Number(e.target.value) }))}
              min={25}
              max={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Markup %</label>
            <input
              type="number"
              value={config.default_markup_percent}
              onChange={e => setConfig(prev => ({ ...prev, default_markup_percent: Number(e.target.value) }))}
              min={0}
              max={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Applied on top of AI + labor costs to set client billing.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Included Revision Rounds</label>
            <input
              type="number"
              value={config.included_revision_rounds}
              onChange={e => setConfig(prev => ({ ...prev, included_revision_rounds: Number(e.target.value) }))}
              min={0}
              max={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Revision Round Cost ($)</label>
            <input
              type="number"
              value={config.revision_round_cost}
              onChange={e => setConfig(prev => ({ ...prev, revision_round_cost: Number(e.target.value) }))}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </section>

      {/* Visual Style */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-purple-500" />
          <h3 className="text-base font-semibold text-gray-900">Default Visual Style</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'photoreal', label: 'Photo-Real', desc: 'Cinematic, realistic' },
            { id: 'animated', label: 'Animated', desc: 'Motion graphics, 2D/3D' },
            { id: 'mixed', label: 'Mixed', desc: 'Live + animated elements' },
            { id: 'documentary', label: 'Documentary', desc: 'Testimonial, interview' },
          ].map(style => (
            <button
              key={style.id}
              onClick={() => setConfig(prev => ({ ...prev, default_visual_style: style.id }))}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                config.default_visual_style === style.id
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-900">{style.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{style.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Music Styles */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-semibold text-gray-900">Preferred Music Styles</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">Select the music moods you most commonly need. These will be offered first during spot production.</p>
        <div className="flex flex-wrap gap-2">
          {MUSIC_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => toggleMusicStyle(style.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                config.preferred_music_styles.includes(style.id)
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </section>

      {/* Brand Safety */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900">Brand Safety & Legal</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Safety Level</label>
            <select
              value={config.brand_safety_level}
              onChange={e => setConfig(prev => ({ ...prev, brand_safety_level: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="relaxed">Relaxed — General audience, minimal restrictions</option>
              <option value="standard">Standard — Family-safe, no controversial topics</option>
              <option value="strict">Strict — Conservative, regulated industries (pharma, finance, legal)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Legal Disclaimer</label>
            <input
              type="text"
              value={config.mandatory_legal_disclaimer}
              onChange={e => setConfig(prev => ({ ...prev, mandatory_legal_disclaimer: e.target.value }))}
              placeholder="e.g. Results may vary. See site for details."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">Automatically included in all spot concept scripts.</p>
          </div>
        </div>
      </section>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
