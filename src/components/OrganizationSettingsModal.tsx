import { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Users,
  BarChart3,
  AlertTriangle,
  Loader2,
  Upload,
  Mail,
  Trash2,
  Shield,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  billing_tier: string;
  subdomain: string | null;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface ContentCount {
  series: number;
  members: number;
  active_episodes: number;
  total_episodes: number;
  total_characters: number;
  total_scripts: number;
  total_assets: number;
  storage_bytes: number;
  storage_gb: number;
}

interface OrganizationSettingsModalProps {
  organization: Organization;
  userRole: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrganizationSettingsModal({
  organization,
  userRole,
  onClose,
  onUpdate,
}: OrganizationSettingsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'usage' | 'danger'>('general');
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [contentCount, setContentCount] = useState<ContentCount | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    name: organization.name,
    slug: organization.slug,
  });

  const [archiveConfirmation, setArchiveConfirmation] = useState({
    step: 1,
    typedName: '',
    typedConfirmation: '',
    confirmChecked: false,
  });

  const canEdit = ['owner', 'admin'].includes(userRole);
  const canArchive = userRole === 'owner';

  useEffect(() => {
    fetchContentCount();
    if (activeTab === 'team') {
      fetchMembers();
    }
  }, [organization.id, activeTab]);

  const fetchContentCount = async () => {
    try {
      const { data, error } = await supabase.rpc('count_organization_content', {
        org_uuid: organization.id,
      });

      if (error) throw error;
      setContentCount(data);
    } catch (error) {
      console.error('Error fetching content count:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organization.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, SVG, or WebP image');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}-${Date.now()}.${fileExt}`;
      const filePath = `organization-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('production-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('production-assets').getPublicUrl(filePath);

      if (organization.logo_url) {
        const oldPath = organization.logo_url.split('/').slice(-2).join('/');
        await supabase.storage.from('production-assets').remove([oldPath]);
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          logo_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      onUpdate();
      alert('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!organization.logo_url) return;

    const confirmed = confirm('Are you sure you want to remove the organization logo?');
    if (!confirmed) return;

    setUploadingLogo(true);
    try {
      const oldPath = organization.logo_url.split('/').slice(-2).join('/');
      await supabase.storage.from('production-assets').remove([oldPath]);

      const { error } = await supabase
        .from('organizations')
        .update({
          logo_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      onUpdate();
      alert('Logo removed successfully');
    } catch (error) {
      console.error('Error removing logo:', error);
      alert('Failed to remove logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!canEdit) {
      alert('You do not have permission to edit organization settings');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editForm.name,
          slug: editForm.slug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      onUpdate();
      alert('Organization settings updated successfully');
    } catch (error) {
      console.error('Error updating organization:', error);
      alert('Failed to update organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!user || !canArchive) return;

    if (archiveConfirmation.step === 1) {
      setArchiveConfirmation({ ...archiveConfirmation, step: 2 });
      return;
    }

    if (archiveConfirmation.step === 2 && archiveConfirmation.typedName === organization.name) {
      setArchiveConfirmation({ ...archiveConfirmation, step: 3 });
      return;
    }

    if (
      archiveConfirmation.step === 3 &&
      archiveConfirmation.typedConfirmation === 'DELETE ALL DATA' &&
      archiveConfirmation.confirmChecked
    ) {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('archive_organization', {
          org_uuid: organization.id,
          user_uuid: user.id,
        });

        if (error) throw error;

        if (data.success) {
          alert('Organization archived successfully. All members have been notified.');
          onUpdate();
          onClose();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error('Error archiving organization:', error);
        alert('Failed to archive organization');
      } finally {
        setLoading(false);
      }
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Building2 },
    { id: 'team' as const, label: 'Team', icon: Users },
    { id: 'usage' as const, label: 'Usage & Billing', icon: BarChart3 },
    { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Workspace Settings</h2>
            <p className="text-sm text-gray-600 mt-1">{organization.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Your Role: {userRole}</h4>
                    <p className="text-sm text-blue-800">
                      {canEdit
                        ? 'You have permission to edit organization settings.'
                        : 'You have read-only access to this organization.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter organization name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Slug
                </label>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="organization-slug"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used in URLs and API calls. Use lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt="Organization logo"
                      className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={handleLogoUploadClick}
                      disabled={!canEdit || uploadingLogo}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Logo
                        </>
                      )}
                    </button>
                    {organization.logo_url && canEdit && (
                      <button
                        onClick={handleRemoveLogo}
                        disabled={uploadingLogo}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: PNG, JPG, SVG, WebP. Max size: 5MB
                </p>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                <button
                  disabled={!canEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Invite Member
                </button>
              </div>

              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        U
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{member.user_id.slice(0, 8)}...</div>
                        <div className="text-sm text-gray-600">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          member.role === 'owner'
                            ? 'bg-purple-100 text-purple-700'
                            : member.role === 'admin'
                            ? 'bg-blue-100 text-blue-700'
                            : member.role === 'member'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {member.role}
                      </span>
                      {canEdit && member.role !== 'owner' && member.user_id !== user?.id && (
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'usage' && contentCount && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Plan</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-600 capitalize">
                    {organization.billing_tier}
                  </span>
                  <span className="text-sm text-gray-600">tier</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{contentCount.series}</div>
                    <div className="text-sm text-gray-600">Active Series</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{contentCount.members}</div>
                    <div className="text-sm text-gray-600">Team Members</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {contentCount.total_episodes}
                    </div>
                    <div className="text-sm text-gray-600">Total Episodes</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {contentCount.active_episodes}
                    </div>
                    <div className="text-sm text-gray-600">In Production</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {contentCount.total_characters}
                    </div>
                    <div className="text-sm text-gray-600">Characters</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {contentCount.total_assets}
                    </div>
                    <div className="text-sm text-gray-600">Assets</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 col-span-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {contentCount.storage_gb} GB
                    </div>
                    <div className="text-sm text-gray-600">Storage Used</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">Danger Zone</h4>
                  <p className="text-sm text-red-800">
                    Archiving your organization is a permanent action. All series, episodes, and data
                    will be archived and can be restored within 30 days. After 30 days, everything
                    will be permanently deleted.
                  </p>
                </div>
              </div>

              {!canArchive && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">
                    Only the organization owner can archive the organization. Your current role is:{' '}
                    <strong>{userRole}</strong>
                  </p>
                </div>
              )}

              {contentCount && canArchive && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Content that will be archived:
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• {contentCount.series} series with all their content</li>
                    <li>• {contentCount.total_characters} characters</li>
                    <li>• {contentCount.total_scripts} scripts</li>
                    <li>• {contentCount.total_episodes} episodes</li>
                    <li>• {contentCount.total_assets} assets ({contentCount.storage_gb} GB)</li>
                    <li>• All team member access will be revoked</li>
                  </ul>
                </div>
              )}

              {canArchive && (
                <>
                  {archiveConfirmation.step >= 2 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type the organization name "{organization.name}" to confirm:
                      </label>
                      <input
                        type="text"
                        value={archiveConfirmation.typedName}
                        onChange={(e) =>
                          setArchiveConfirmation({
                            ...archiveConfirmation,
                            typedName: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder={organization.name}
                      />
                    </div>
                  )}

                  {archiveConfirmation.step >= 3 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type "DELETE ALL DATA" to confirm permanent deletion:
                      </label>
                      <input
                        type="text"
                        value={archiveConfirmation.typedConfirmation}
                        onChange={(e) =>
                          setArchiveConfirmation({
                            ...archiveConfirmation,
                            typedConfirmation: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="DELETE ALL DATA"
                      />
                    </div>
                  )}

                  {archiveConfirmation.step >= 3 && (
                    <label className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-lg cursor-pointer hover:bg-red-50">
                      <input
                        type="checkbox"
                        checked={archiveConfirmation.confirmChecked}
                        onChange={(e) =>
                          setArchiveConfirmation({
                            ...archiveConfirmation,
                            confirmChecked: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-red-600 mt-1"
                      />
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">
                          I understand this action cannot be undone after 30 days
                        </div>
                        <div className="text-gray-600 mt-1">
                          The organization and all its data will be archived. You have 30 days to
                          restore before permanent deletion.
                        </div>
                      </div>
                    </label>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading}
          >
            Close
          </button>
          {activeTab === 'general' && canEdit && (
            <button
              onClick={handleSaveGeneral}
              disabled={loading || !editForm.name.trim() || !editForm.slug.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          )}
          {activeTab === 'danger' && canArchive && (
            <button
              onClick={handleArchive}
              disabled={
                loading ||
                (archiveConfirmation.step === 2 &&
                  archiveConfirmation.typedName !== organization.name) ||
                (archiveConfirmation.step === 3 &&
                  (archiveConfirmation.typedConfirmation !== 'DELETE ALL DATA' ||
                    !archiveConfirmation.confirmChecked))
              }
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <AlertTriangle className="w-4 h-4" />
              {archiveConfirmation.step === 1 && 'Archive Organization'}
              {archiveConfirmation.step === 2 && 'Confirm Name'}
              {archiveConfirmation.step === 3 && 'Final Confirmation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
