import { useState, useEffect, useRef, useCallback } from 'react';
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
  Clock,
  RotateCcw,
  CheckCircle,
  XCircle,
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
  archived_at?: string | null;
  scheduled_deletion_at?: string | null;
  deletion_confirmed_at?: string | null;
}

interface DeletionStatus {
  exists: boolean;
  is_archived: boolean;
  archived_at: string | null;
  is_deletion_scheduled: boolean;
  scheduled_deletion_at: string | null;
  deletion_confirmed_at: string | null;
  time_remaining_seconds: number;
  can_delete_now: boolean;
  grace_period_days: number;
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
  onDeleted?: () => void;
}

export function OrganizationSettingsModal({
  organization,
  userRole,
  onClose,
  onUpdate,
  onDeleted,
}: OrganizationSettingsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'team' | 'usage' | 'danger'>('general');
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [contentCount, setContentCount] = useState<ContentCount | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [showDeletedConfirmation, setShowDeletedConfirmation] = useState(false);
  const [deletedOrgName, setDeletedOrgName] = useState('');

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

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    step: 1,
    typedName: '',
    typedConfirmation: '',
    confirmChecked: false,
  });

  const canEdit = ['owner', 'admin'].includes(userRole);
  const canArchive = userRole === 'owner';
  const canDelete = userRole === 'owner';

  const fetchDeletionStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_organization_deletion_status', {
        org_uuid: organization.id,
      });
      if (error) throw error;
      setDeletionStatus(data);
    } catch (error) {
      console.error('Error fetching deletion status:', error);
    }
  }, [organization.id]);

  useEffect(() => {
    fetchContentCount();
    fetchDeletionStatus();
    if (activeTab === 'team') {
      fetchMembers();
    }
  }, [organization.id, activeTab, fetchDeletionStatus]);

  useEffect(() => {
    if (!deletionStatus?.is_deletion_scheduled || !deletionStatus.scheduled_deletion_at) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(deletionStatus.scheduled_deletion_at!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        fetchDeletionStatus();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [deletionStatus?.is_deletion_scheduled, deletionStatus?.scheduled_deletion_at, fetchDeletionStatus]);

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
      archiveConfirmation.typedConfirmation === 'DELETE' &&
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
          alert(`"${organization.name}" has been scheduled for deletion. You have 7 days to restore it before permanent deletion.`);
          onUpdate();
          onClose();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error('Error scheduling deletion:', error);
        alert('Failed to schedule workspace deletion');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleScheduleDeletion = async () => {
    if (!user || !canDelete) return;

    if (deleteConfirmation.step === 1) {
      setDeleteConfirmation({ ...deleteConfirmation, step: 2 });
      return;
    }

    if (deleteConfirmation.step === 2 && deleteConfirmation.typedName === organization.name) {
      setDeleteConfirmation({ ...deleteConfirmation, step: 3 });
      return;
    }

    if (
      deleteConfirmation.step === 3 &&
      deleteConfirmation.typedConfirmation === 'PERMANENTLY DELETE' &&
      deleteConfirmation.confirmChecked
    ) {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('schedule_organization_deletion', {
          org_uuid: organization.id,
          user_uuid: user.id,
        });

        if (error) throw error;

        if (data.success) {
          await fetchDeletionStatus();
          setDeleteConfirmation({ step: 1, typedName: '', typedConfirmation: '', confirmChecked: false });
          onUpdate();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error('Error scheduling deletion:', error);
        alert('Failed to schedule deletion');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelDeletion = async (restoreFromArchive: boolean = false) => {
    if (!user || !canDelete) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('cancel_organization_deletion', {
        org_uuid: organization.id,
        user_uuid: user.id,
        restore_from_archive: restoreFromArchive,
      });

      if (error) throw error;

      if (data.success) {
        await fetchDeletionStatus();
        onUpdate();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error canceling deletion:', error);
      alert('Failed to cancel deletion');
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!user || !canDelete || !deletionStatus?.can_delete_now) return;

    const confirmed = window.confirm(
      `This is your FINAL confirmation. "${organization.name}" and ALL its data will be permanently deleted. This action CANNOT be undone.\n\nAre you absolutely sure?`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('permanently_delete_organization', {
        org_uuid: organization.id,
        user_uuid: user.id,
      });

      if (error) throw error;

      if (data.success) {
        setDeletedOrgName(organization.name);
        setShowDeletedConfirmation(true);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error permanently deleting organization:', error);
      alert('Failed to delete organization');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDeletedConfirmation = () => {
    setShowDeletedConfirmation(false);
    onDeleted?.();
    onClose();
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
              {!canDelete && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">
                    Only the organization owner can manage workspace deletion. Your current role is:{' '}
                    <strong>{userRole}</strong>
                  </p>
                </div>
              )}

              {canDelete && deletionStatus && (
                <>
                  {deletionStatus.is_deletion_scheduled && countdown && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-amber-100 rounded-full">
                            <Clock className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-amber-900">"{organization.name}" Pending Deletion</h3>
                            <p className="text-sm text-amber-700">
                              Scheduled for permanent deletion on {new Date(deletionStatus.scheduled_deletion_at!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 mb-4">
                          <p className="text-sm text-gray-700 mb-3">Time remaining to restore this workspace:</p>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-amber-700">{countdown.days}</div>
                              <div className="text-xs text-gray-600 uppercase tracking-wide">Days</div>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-amber-700">{countdown.hours}</div>
                              <div className="text-xs text-gray-600 uppercase tracking-wide">Hours</div>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-amber-700">{countdown.minutes}</div>
                              <div className="text-xs text-gray-600 uppercase tracking-wide">Minutes</div>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-amber-700">{countdown.seconds}</div>
                              <div className="text-xs text-gray-600 uppercase tracking-wide">Seconds</div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCancelDeletion(true)}
                          disabled={loading}
                          className="w-full px-4 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-lg"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                          Restore Workspace
                        </button>
                        <p className="text-center text-sm text-gray-600 mt-2">
                          Restoring will return this workspace to normal operation immediately.
                        </p>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-900 mb-1">Your other workspaces are safe</h4>
                          <p className="text-sm text-green-800">
                            This pending deletion only affects "{organization.name}".
                            Content in your other workspaces is NOT affected.
                          </p>
                        </div>
                      </div>

                      {deletionStatus.can_delete_now && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-sm text-red-800 mb-4">
                            The 7-day grace period has elapsed. You can now permanently delete this workspace.
                          </p>
                          <button
                            onClick={handlePermanentDelete}
                            disabled={loading}
                            className="w-full px-4 py-3 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-bold"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                            Permanently Delete Now
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {deletionStatus.is_archived && !deletionStatus.is_deletion_scheduled && (
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-900 mb-1">"{organization.name}" Scheduled for Deletion</h4>
                          <p className="text-sm text-amber-800">
                            Deletion was initiated on {new Date(deletionStatus.archived_at!).toLocaleDateString()}.
                            You can restore the workspace or proceed to permanent deletion.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelDeletion(true)}
                        disabled={loading}
                        className="w-full px-4 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-lg"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                        Restore Workspace
                      </button>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-900 mb-1">Your other workspaces are safe</h4>
                          <p className="text-sm text-green-800">
                            This deletion only affects "{organization.name}".
                            Content in your other workspaces is NOT affected.
                          </p>
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <h4 className="font-bold text-red-900 text-lg mb-2">Proceed to Permanent Deletion</h4>
                        <p className="text-sm text-red-800 mb-4">
                          You can skip the 7-day waiting period and permanently delete this workspace now.
                          This action is immediate and irreversible.
                        </p>

                        {contentCount && (
                          <div className="bg-white rounded-lg p-4 mb-4 border border-red-100">
                            <h5 className="font-semibold text-gray-900 mb-2 text-sm">Content in "{organization.name}" that will be deleted:</h5>
                            <ul className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                              <li>{contentCount.series} series</li>
                              <li>{contentCount.total_characters} characters</li>
                              <li>{contentCount.total_scripts} scripts</li>
                              <li>{contentCount.total_episodes} episodes</li>
                              <li>{contentCount.total_assets} assets</li>
                              <li>{contentCount.storage_gb} GB storage</li>
                            </ul>
                          </div>
                        )}

                        {deleteConfirmation.step >= 2 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Step 1: Type "{organization.name}" to confirm:
                            </label>
                            <input
                              type="text"
                              value={deleteConfirmation.typedName}
                              onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, typedName: e.target.value })}
                              className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder={organization.name}
                            />
                          </div>
                        )}

                        {deleteConfirmation.step >= 3 && (
                          <>
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Step 2: Type "PERMANENTLY DELETE" to confirm:
                              </label>
                              <input
                                type="text"
                                value={deleteConfirmation.typedConfirmation}
                                onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, typedConfirmation: e.target.value })}
                                className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="PERMANENTLY DELETE"
                              />
                            </div>

                            <label className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-lg cursor-pointer hover:bg-red-100 mb-4 bg-white">
                              <input
                                type="checkbox"
                                checked={deleteConfirmation.confirmChecked}
                                onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, confirmChecked: e.target.checked })}
                                className="w-4 h-4 text-red-600 mt-1"
                              />
                              <div className="text-sm">
                                <div className="font-semibold text-gray-900">
                                  I understand this action is IRREVERSIBLE
                                </div>
                                <div className="text-gray-600 mt-1">
                                  The workspace and all its data will be permanently deleted immediately with no possibility of recovery.
                                </div>
                              </div>
                            </label>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {!deletionStatus.is_archived && (
                    <>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-red-900 mb-1">Delete "{organization.name}" Workspace</h4>
                          <p className="text-sm text-red-800">
                            This will schedule the deletion of this workspace and all its content.
                            You will have a <strong>7-day grace period</strong> to restore your workspace before permanent deletion.
                          </p>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-900 mb-1">Your other workspaces are safe</h4>
                          <p className="text-sm text-green-800">
                            This action only affects the "{organization.name}" workspace.
                            Content in your other workspaces will NOT be affected.
                          </p>
                        </div>
                      </div>

                      {contentCount && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Content in "{organization.name}" that will be deleted:</h4>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li>{contentCount.series} series with all their content</li>
                            <li>{contentCount.total_characters} characters</li>
                            <li>{contentCount.total_scripts} scripts</li>
                            <li>{contentCount.total_episodes} episodes</li>
                            <li>{contentCount.total_assets} assets ({contentCount.storage_gb} GB)</li>
                            <li>All team member access will be revoked</li>
                          </ul>
                        </div>
                      )}

                      {archiveConfirmation.step >= 2 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type "{organization.name}" to confirm:
                          </label>
                          <input
                            type="text"
                            value={archiveConfirmation.typedName}
                            onChange={(e) => setArchiveConfirmation({ ...archiveConfirmation, typedName: e.target.value })}
                            className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            placeholder={organization.name}
                          />
                        </div>
                      )}

                      {archiveConfirmation.step >= 3 && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Type "DELETE" to confirm:
                            </label>
                            <input
                              type="text"
                              value={archiveConfirmation.typedConfirmation}
                              onChange={(e) => setArchiveConfirmation({ ...archiveConfirmation, typedConfirmation: e.target.value })}
                              className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="DELETE"
                            />
                          </div>

                          <label className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-lg cursor-pointer hover:bg-red-50">
                            <input
                              type="checkbox"
                              checked={archiveConfirmation.confirmChecked}
                              onChange={(e) => setArchiveConfirmation({ ...archiveConfirmation, confirmChecked: e.target.checked })}
                              className="w-4 h-4 text-red-600 mt-1"
                            />
                            <div className="text-sm">
                              <div className="font-semibold text-gray-900">I understand I have 7 days to restore this workspace</div>
                              <div className="text-gray-600 mt-1">
                                The workspace will be scheduled for deletion. You can restore it anytime within the 7-day grace period.
                                After 7 days, all data will be permanently deleted.
                              </div>
                            </div>
                          </label>
                        </>
                      )}
                    </>
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
          {activeTab === 'danger' && canDelete && deletionStatus && !deletionStatus.is_archived && (
            <button
              onClick={handleArchive}
              disabled={
                loading ||
                (archiveConfirmation.step === 2 && archiveConfirmation.typedName !== organization.name) ||
                (archiveConfirmation.step === 3 && (archiveConfirmation.typedConfirmation !== 'DELETE' || !archiveConfirmation.confirmChecked))
              }
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Trash2 className="w-4 h-4" />
              {archiveConfirmation.step === 1 && 'Delete Workspace'}
              {archiveConfirmation.step === 2 && 'Confirm Name'}
              {archiveConfirmation.step === 3 && 'Confirm Delete'}
            </button>
          )}
          {activeTab === 'danger' && canDelete && deletionStatus?.is_archived && !deletionStatus.is_deletion_scheduled && (
            <button
              onClick={handleScheduleDeletion}
              disabled={
                loading ||
                (deleteConfirmation.step === 2 && deleteConfirmation.typedName !== organization.name) ||
                (deleteConfirmation.step === 3 && (deleteConfirmation.typedConfirmation !== 'PERMANENTLY DELETE' || !deleteConfirmation.confirmChecked))
              }
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Trash2 className="w-4 h-4" />
              {deleteConfirmation.step === 1 && 'Delete Permanently'}
              {deleteConfirmation.step === 2 && 'Confirm Name'}
              {deleteConfirmation.step === 3 && 'Confirm & Delete'}
            </button>
          )}
        </div>
      </div>

      {showDeletedConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Workspace Deleted</h2>
            <p className="text-gray-600 mb-6">
              "{deletedOrgName}" and all its associated data have been permanently deleted.
            </p>
            <button
              onClick={handleCloseDeletedConfirmation}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
