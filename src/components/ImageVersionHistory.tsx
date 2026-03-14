import { useState, useEffect } from 'react';
import { X, Star, Check, Trash2, Eye, Clock, Upload, Wand2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { CharacterImage } from './CharacterImage';

type ImageVersion = Database['public']['Tables']['storyboard_image_versions']['Row'];
type StoryboardShot = Database['public']['Tables']['storyboard_shots']['Row'];

interface ImageVersionHistoryProps {
  shot: StoryboardShot;
  onClose: () => void;
  onVersionSelected: () => void;
}

export function ImageVersionHistory({ shot, onClose, onVersionSelected }: ImageVersionHistoryProps) {
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [shot.id]);

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('storyboard_image_versions')
        .select('*')
        .eq('shot_id', shot.id)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (version: ImageVersion) => {
    try {
      const { error } = await supabase
        .from('storyboard_shots')
        .update({
          image_url: version.image_url,
          thumbnail_url: version.thumbnail_url,
          current_version: version.version_number,
          last_edited_by: 'user',
          last_edited_at: new Date().toISOString()
        })
        .eq('id', shot.id);

      if (error) throw error;

      onVersionSelected();
      onClose();
    } catch (error) {
      console.error('Error setting active version:', error);
      alert(error instanceof Error ? error.message : 'Failed to set active version');
    }
  };

  const handleToggleFavorite = async (version: ImageVersion) => {
    try {
      const { error } = await supabase
        .from('storyboard_image_versions')
        .update({ is_favorite: !version.is_favorite })
        .eq('id', version.id);

      if (error) throw error;
      await loadVersions();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleDeleteVersion = async (version: ImageVersion) => {
    if (!confirm('Delete this version? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('storyboard_image_versions')
        .delete()
        .eq('id', version.id);

      if (error) throw error;
      await loadVersions();
    } catch (error) {
      console.error('Error deleting version:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete version');
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ai_generated':
        return <Wand2 className="w-3.5 h-3.5" />;
      case 'manual_upload':
        return <Upload className="w-3.5 h-3.5" />;
      case 'edited':
        return <Edit className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'ai_generated':
        return 'AI Generated';
      case 'manual_upload':
        return 'Uploaded';
      case 'edited':
        return 'Edited';
      default:
        return source;
    }
  };

  const isCurrentVersion = (version: ImageVersion) => {
    return shot.current_version === version.version_number;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading version history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Image Version History</h2>
              <p className="text-blue-100 text-sm">Shot #{shot.shot_number} - {versions.length} versions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {versions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Version History</h3>
              <p className="text-gray-600">Upload or generate images to create version history</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`bg-white border-2 rounded-lg overflow-hidden transition-all ${
                    isCurrentVersion(version)
                      ? 'border-green-500 shadow-lg'
                      : selectedVersion === version.id
                      ? 'border-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedVersion(version.id)}
                >
                  <div className="aspect-video bg-gray-100 relative group cursor-pointer">
                    <CharacterImage
                      url={version.image_url}
                      alt={`Version ${version.version_number}`}
                      className="w-full h-full object-cover"
                      fallback={<div className="w-full h-full bg-gray-200 flex items-center justify-center"><Eye className="w-8 h-8 text-gray-400" /></div>}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                    {isCurrentVersion(version) && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                        <Check className="w-3 h-3" />
                        Current
                      </div>
                    )}
                    {version.is_favorite && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white p-1.5 rounded-full">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        Version {version.version_number}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {getSourceIcon(version.source)}
                        <span>{getSourceLabel(version.source)}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-3">
                      {new Date(version.created_at).toLocaleDateString()} at{' '}
                      {new Date(version.created_at).toLocaleTimeString()}
                    </div>

                    <div className="flex gap-2">
                      {!isCurrentVersion(version) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetActive(version);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Use This
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(version);
                        }}
                        className={`flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                          version.is_favorite
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={version.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`w-4 h-4 ${version.is_favorite ? 'fill-current' : ''}`} />
                      </button>
                      {!isCurrentVersion(version) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVersion(version);
                          }}
                          className="flex items-center justify-center p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Delete version"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {versions.filter(v => v.is_favorite).length > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                {versions.filter(v => v.is_favorite).length} favorite
                {versions.filter(v => v.is_favorite).length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Edit({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  );
}
