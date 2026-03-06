import { useState, useEffect } from 'react';
import { X, Film, BarChart3, Copy, Archive, AlertTriangle, Loader2, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { SeriesMissionPanel } from './SeriesMissionPanel';

interface Series {
  id: string;
  name: string;
  description: string | null;
  theme: string | null;
  style_guide: string | null;
  organization_id: string;
  default_episode_count: number;
}

interface ContentCount {
  characters: number;
  scripts: number;
  episodes: number;
  assets: number;
  storyboards: number;
}

interface SeriesManagementModalProps {
  series: Series;
  onClose: () => void;
  onUpdate: () => void;
}

export function SeriesManagementModal({ series, onClose, onUpdate }: SeriesManagementModalProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState<'edit' | 'stats' | 'duplicate' | 'archive' | 'delete'>('edit');
  const [loading, setLoading] = useState(false);
  const [contentCount, setContentCount] = useState<ContentCount | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editForm, setEditForm] = useState({
    name: series.name,
    description: series.description || '',
    theme: series.theme || '',
    style_guide: series.style_guide || '',
    default_episode_count: series.default_episode_count || 6,
  });

  const [duplicateForm, setDuplicateForm] = useState({
    name: `${series.name} (Copy)`,
    copyCharacters: true,
    copyScripts: false,
    copyAssets: false,
    mode: 'full' as 'full' | 'fresh',
  });

  const [archiveConfirmation, setArchiveConfirmation] = useState({
    step: 1,
    typedName: '',
    confirmChecked: false,
  });

  useEffect(() => {
    fetchContentCount();
  }, [series.id]);

  const fetchContentCount = async () => {
    try {
      const { data, error } = await supabase.rpc('count_series_content', {
        series_uuid: series.id,
      });

      if (error) throw error;
      setContentCount(data);
    } catch (error) {
      console.error('Error fetching content count:', error);
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('series')
        .update({
          name: editForm.name,
          description: editForm.description,
          theme: editForm.theme,
          style_guide: editForm.style_guide,
          default_episode_count: editForm.default_episode_count,
          updated_at: new Date().toISOString(),
        })
        .eq('id', series.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating series:', error);
      alert('Failed to update series');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('duplicate_series', {
        source_series_uuid: series.id,
        user_uuid: user.id,
        new_name: duplicateForm.name,
        copy_characters: duplicateForm.mode === 'full' && duplicateForm.copyCharacters,
        copy_scripts: duplicateForm.mode === 'full' && duplicateForm.copyScripts,
        copy_assets: duplicateForm.mode === 'full' && duplicateForm.copyAssets,
      });

      if (error) throw error;

      if (data.success) {
        alert(`Series "${duplicateForm.name}" created successfully!`);
        onUpdate();
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error duplicating series:', error);
      alert('Failed to duplicate series');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!user) return;

    if (archiveConfirmation.step === 1) {
      setArchiveConfirmation({ ...archiveConfirmation, step: 2 });
      return;
    }

    if (archiveConfirmation.step === 2 && archiveConfirmation.typedName === series.name) {
      setArchiveConfirmation({ ...archiveConfirmation, step: 3 });
      return;
    }

    if (archiveConfirmation.step === 3 && archiveConfirmation.confirmChecked) {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('archive_series', {
          series_uuid: series.id,
          user_uuid: user.id,
        });

        if (error) {
          console.error('Supabase error:', error);
          alert(`Failed to archive series: ${error.message}`);
          return;
        }

        if (data.success) {
          alert('Series archived successfully');
          onUpdate();
          onClose();
        } else {
          alert(`Failed to archive series: ${data.error}`);
        }
      } catch (error) {
        console.error('Error archiving series:', error);
        alert(`Failed to archive series: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('delete_series', {
        series_uuid: series.id,
        user_uuid: user.id,
      });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete series');
      }

      showSuccess('Series Deleted', `"${series.name}" and all related content have been permanently deleted.`);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting series:', error);
      throw error;
    }
  };

  const tabs = [
    { id: 'edit' as const, label: 'Edit Details', icon: Film },
    { id: 'stats' as const, label: 'Statistics', icon: BarChart3 },
    { id: 'duplicate' as const, label: 'Duplicate', icon: Copy },
    { id: 'archive' as const, label: 'Archive', icon: Archive },
    { id: 'delete' as const, label: 'Delete', icon: Trash2 },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Manage Series</h2>
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
                tab.id === 'delete'
                  ? activeTab === tab.id
                    ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                  : activeTab === tab.id
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
          {activeTab === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Series Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter series name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe your series"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <input
                  type="text"
                  value={editForm.theme}
                  onChange={(e) => setEditForm({ ...editForm, theme: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Sci-Fi Animation, Educational Comedy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Style Guide
                </label>
                <textarea
                  value={editForm.style_guide}
                  onChange={(e) => setEditForm({ ...editForm, style_guide: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Visual style guidelines, animation notes, etc."
                />
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Episode Count for Profit Estimates
                </label>
                <div className="flex items-center gap-4 mb-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editForm.default_episode_count}
                    onChange={(e) => setEditForm({ ...editForm, default_episode_count: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <span className="text-2xl font-bold text-green-700 min-w-[3rem] text-center">
                    {editForm.default_episode_count}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  This value will be used as the default number of episodes in revenue projections and profit analytics for this series. Range: 0-100 episodes.
                </p>
              </div>

              <SeriesMissionPanel seriesId={series.id} />
            </div>
          )}

          {activeTab === 'stats' && contentCount && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-600">{contentCount.characters}</div>
                  <div className="text-sm text-gray-600">Characters</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-600">{contentCount.scripts}</div>
                  <div className="text-sm text-gray-600">Scripts</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-orange-600">{contentCount.episodes}</div>
                  <div className="text-sm text-gray-600">Episodes</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-purple-600">{contentCount.assets}</div>
                  <div className="text-sm text-gray-600">Assets</div>
                </div>
                <div className="bg-pink-50 rounded-lg p-4 col-span-2">
                  <div className="text-3xl font-bold text-pink-600">{contentCount.storyboards}</div>
                  <div className="text-sm text-gray-600">Storyboards</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'duplicate' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Create a copy of this series with its content, or start fresh with the same settings.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Series Name
                </label>
                <input
                  type="text"
                  value={duplicateForm.name}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Duplication Mode
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setDuplicateForm({ ...duplicateForm, mode: 'full' })}
                    className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                      duplicateForm.mode === 'full'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">Full Copy</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Duplicate with selected content
                    </div>
                  </button>
                  <button
                    onClick={() => setDuplicateForm({ ...duplicateForm, mode: 'fresh' })}
                    className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                      duplicateForm.mode === 'fresh'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">Fresh Start</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Empty series with same settings
                    </div>
                  </button>
                </div>
              </div>

              {duplicateForm.mode === 'full' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What to Copy
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={duplicateForm.copyCharacters}
                      onChange={(e) =>
                        setDuplicateForm({ ...duplicateForm, copyCharacters: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Characters</div>
                      <div className="text-sm text-gray-600">
                        Copy all characters and their settings
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={duplicateForm.copyScripts}
                      onChange={(e) =>
                        setDuplicateForm({ ...duplicateForm, copyScripts: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Scripts</div>
                      <div className="text-sm text-gray-600">Copy all scripts and episodes</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={duplicateForm.copyAssets}
                      onChange={(e) =>
                        setDuplicateForm({ ...duplicateForm, copyAssets: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Assets</div>
                      <div className="text-sm text-gray-600">
                        Copy asset references (files not duplicated)
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {activeTab === 'archive' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Archive Series</h4>
                  <p className="text-sm text-yellow-800">
                    Archiving this series will hide it from your workspace. You can restore it within
                    30 days. After 30 days, it will be permanently deleted.
                  </p>
                </div>
              </div>

              {contentCount && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Content that will be archived:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      {contentCount.characters} characters
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      {contentCount.scripts} scripts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      {contentCount.episodes} episodes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      {contentCount.assets} assets
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      {contentCount.storyboards} storyboards
                    </li>
                  </ul>
                </div>
              )}

              {archiveConfirmation.step >= 2 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type the series name "{series.name}" to confirm:
                  </label>
                  <input
                    type="text"
                    value={archiveConfirmation.typedName}
                    onChange={(e) =>
                      setArchiveConfirmation({ ...archiveConfirmation, typedName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={series.name}
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
                      I understand this series will be archived
                    </div>
                    <div className="text-gray-600 mt-1">
                      The series can be restored within 30 days, after which it will be permanently
                      deleted.
                    </div>
                  </div>
                </label>
              )}
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">Permanent Deletion</h4>
                  <p className="text-sm text-red-800">
                    This will permanently delete the series and all related database records. This action
                    cannot be undone. Storage files will remain but all data will be removed immediately.
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900 font-medium mb-2">
                  Difference between Archive and Delete:
                </p>
                <ul className="space-y-1 text-sm text-yellow-800">
                  <li className="flex items-start gap-2">
                    <Archive className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Archive:</strong> Hides series, recoverable for 30 days</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Trash2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Delete:</strong> Immediate permanent removal, cannot be recovered</span>
                  </li>
                </ul>
              </div>

              {contentCount && (
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-red-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Content that will be permanently deleted:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      {contentCount.characters} characters
                    </li>
                    <li className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      {contentCount.scripts} scripts
                    </li>
                    <li className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      {contentCount.episodes} episodes
                    </li>
                    <li className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      {contentCount.assets} assets
                    </li>
                    <li className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      {contentCount.storyboards} storyboards
                    </li>
                  </ul>
                </div>
              )}

              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Proceed with Permanent Deletion
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          {activeTab === 'edit' && (
            <button
              onClick={handleSaveEdit}
              disabled={loading || !editForm.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          )}
          {activeTab === 'duplicate' && (
            <button
              onClick={handleDuplicate}
              disabled={loading || !duplicateForm.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Copy className="w-4 h-4" />
              Duplicate Series
            </button>
          )}
          {activeTab === 'archive' && (
            <button
              onClick={handleArchive}
              disabled={
                loading ||
                (archiveConfirmation.step === 2 && archiveConfirmation.typedName !== series.name) ||
                (archiveConfirmation.step === 3 && !archiveConfirmation.confirmChecked)
              }
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Archive className="w-4 h-4" />
              {archiveConfirmation.step === 1 && 'Continue'}
              {archiveConfirmation.step === 2 && 'Confirm Name'}
              {archiveConfirmation.step === 3 && 'Archive Series'}
            </button>
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        entityType="Series"
        entityName={series.name}
        relatedItems={contentCount ? [
          { label: 'Characters', count: contentCount.characters },
          { label: 'Scripts', count: contentCount.scripts },
          { label: 'Episodes', count: contentCount.episodes },
          { label: 'Assets', count: contentCount.assets },
          { label: 'Storyboards', count: contentCount.storyboards },
        ] : []}
        warningMessage="This will permanently delete all database records. Storage files will remain, but all data will be removed immediately and cannot be recovered."
        requireTyping={true}
      />
    </div>
  );
}
