import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User, Sparkles, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { useNotification } from '../contexts/NotificationContext';

interface TalentProfile {
  id: string;
  organization_id: string;
  series_id: string | null;
  name: string; // Internal reference label, not a character name
  description: string;
  demographic: string;
  physical_description: string;
  style_notes: string;
  personality_notes: string;
  image_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface TalentFormData {
  name: string;
  description: string;
  demographic: string;
  physical_description: string;
  style_notes: string;
  personality_notes: string;
  tags: string;
}

const EMPTY_FORM: TalentFormData = {
  name: '',
  description: '',
  demographic: '',
  physical_description: '',
  style_notes: '',
  personality_notes: '',
  tags: '',
};

interface TalentProfilesProps {
  seriesId: string | null;
}

export function TalentProfiles({ seriesId }: TalentProfilesProps) {
  const { currentOrganization } = useOrganization();
  const { showSuccess, showError } = useNotification();
  const [profiles, setProfiles] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TalentProfile | null>(null);
  const [formData, setFormData] = useState<TalentFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, [seriesId, currentOrganization?.id]);

  const loadProfiles = async () => {
    if (!currentOrganization?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      let query = supabase
        .from('talent_profiles')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (seriesId) {
        query = query.or(`series_id.eq.${seriesId},series_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      // Table may not exist yet — degrade gracefully
      console.warn('talent_profiles table not found, using local state only.', err);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingProfile(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (profile: TalentProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description,
      demographic: profile.demographic,
      physical_description: profile.physical_description,
      style_notes: profile.style_notes,
      personality_notes: profile.personality_notes,
      tags: profile.tags.join(', '),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      showError('Required Fields', 'Please provide a label and description.');
      return;
    }
    if (!currentOrganization?.id) return;

    setSaving(true);
    try {
      const payload = {
        organization_id: currentOrganization.id,
        series_id: seriesId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        demographic: formData.demographic.trim(),
        physical_description: formData.physical_description.trim(),
        style_notes: formData.style_notes.trim(),
        personality_notes: formData.personality_notes.trim(),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (editingProfile) {
        const { error } = await supabase
          .from('talent_profiles')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingProfile.id);
        if (error) throw error;
        showSuccess('Updated', 'Talent profile updated.');
      } else {
        const { error } = await supabase.from('talent_profiles').insert([payload]);
        if (error) throw error;
        showSuccess('Created', 'Talent profile created.');
      }

      setShowForm(false);
      loadProfiles();
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Failed to save talent profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profile: TalentProfile) => {
    if (!window.confirm(`Delete talent profile "${profile.name}"?`)) return;
    setDeletingId(profile.id);
    try {
      const { error } = await supabase.from('talent_profiles').delete().eq('id', profile.id);
      if (error) throw error;
      setProfiles(prev => prev.filter(p => p.id !== profile.id));
      showSuccess('Deleted', 'Talent profile removed.');
    } catch (err) {
      showError('Delete Failed', err instanceof Error ? err.message : 'Could not delete profile.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Talent Profiles</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Unnamed spokesperson types and on-screen talent used in commercial spots. Unlike Characters, talent profiles describe a <em>type of person</em>, not a named recurring character.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Talent Profile
        </button>
      </div>

      {/* Example callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">What is a Talent Profile?</p>
            <p className="text-sm text-amber-800 mt-0.5">
              Examples: <em>"Confident 30s professional woman, business casual"</em> — <em>"Energetic young athlete, diverse, active lifestyle"</em> — <em>"Warm family dad, suburban, 40s"</em>. These drive image and video generation for your spots without locking you into a named character.
            </p>
          </div>
        </div>
      </div>

      {/* Profile list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading talent profiles…
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No talent profiles yet</p>
          <p className="text-sm mt-1">Add your first talent type to use in concept generation and video production.</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Talent Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(profile => (
            <div key={profile.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              {/* Image placeholder */}
              <div className="h-32 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center relative">
                {profile.image_url ? (
                  <img src={profile.image_url} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-amber-400">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-xs">No reference image</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => openEdit(profile)}
                    className="p-1.5 bg-white/90 hover:bg-white rounded-md text-gray-600 hover:text-gray-900 shadow-sm"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(profile)}
                    disabled={deletingId === profile.id}
                    className="p-1.5 bg-white/90 hover:bg-white rounded-md text-gray-600 hover:text-red-600 shadow-sm disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === profile.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="font-semibold text-gray-900 text-sm mb-0.5">{profile.name}</div>
                {profile.demographic && (
                  <div className="text-xs text-amber-700 font-medium mb-1">{profile.demographic}</div>
                )}
                <p className="text-xs text-gray-600 line-clamp-2">{profile.description}</p>
                {profile.physical_description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">{profile.physical_description}</p>
                )}
                {profile.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">{tag}</span>
                    ))}
                    {profile.tags.length > 4 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">+{profile.tags.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingProfile ? 'Edit Talent Profile' : 'New Talent Profile'}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Label *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Confident Professional Woman"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used internally — not shown to end audiences.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. A driven professional in her early 30s who projects authority and warmth. Used for B2B and finance spots."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Demographic</label>
                    <input
                      type="text"
                      value={formData.demographic}
                      onChange={e => setFormData(prev => ({ ...prev, demographic: e.target.value }))}
                      placeholder="e.g. Female, 28-35, urban professional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="corporate, b2b, finance"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Physical Description</label>
                  <input
                    type="text"
                    value={formData.physical_description}
                    onChange={e => setFormData(prev => ({ ...prev, physical_description: e.target.value }))}
                    placeholder="e.g. Dark hair, business casual attire, confident posture"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used to guide image and video generation.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Style Notes</label>
                  <input
                    type="text"
                    value={formData.style_notes}
                    onChange={e => setFormData(prev => ({ ...prev, style_notes: e.target.value }))}
                    placeholder="e.g. Clean, minimal wardrobe — no logos. Well-lit, natural environments."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personality / Performance Notes</label>
                  <input
                    type="text"
                    value={formData.personality_notes}
                    onChange={e => setFormData(prev => ({ ...prev, personality_notes: e.target.value }))}
                    placeholder="e.g. Warm but authoritative, never overly sales-y, relatable delivery"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProfile ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
