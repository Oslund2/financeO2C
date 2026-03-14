import { useState, useEffect, useRef } from 'react';
import { X, Search, Film, FileText, User, Check, Trash2, Play, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { CharacterImage } from './CharacterImage';

interface Asset {
  id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  asset_type: string;
  metadata: { mimeType?: string } | null;
}

interface Script {
  id: string;
  title: string;
  episode_number: number | null;
}

interface Character {
  id: string;
  name: string;
  reference_image_url: string | null;
}

interface VideoSelectorModalProps {
  seriesId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  currentTrailerId: string | null;
  onNavigate: (view: string) => void;
}

export function VideoSelectorModal({
  seriesId,
  isOpen,
  onClose,
  onSave,
  currentTrailerId,
  onNavigate
}: VideoSelectorModalProps) {
  const { currentOrganization } = useOrganization();
  const modalRef = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<Asset[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(currentTrailerId);
  const [trailerTitle, setTrailerTitle] = useState('');
  const [associationType, setAssociationType] = useState<'none' | 'script' | 'character'>('none');
  const [associationId, setAssociationId] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Asset | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadCurrentSettings();
    }
  }, [isOpen, seriesId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const loadData = async () => {
    if (!currentOrganization) return;
    setLoading(true);

    try {
      const [assetsRes, scriptsRes, charactersRes] = await Promise.all([
        supabase
          .from('assets')
          .select('id, name, description, file_url, thumbnail_url, asset_type, metadata')
          .or(`organization_id.eq.${currentOrganization.id},organization_id.is.null`)
          .eq('series_id', seriesId)
          .order('created_at', { ascending: false }),
        supabase
          .from('scripts')
          .select('id, title, episode_number')
          .eq('series_id', seriesId)
          .order('episode_number', { ascending: true }),
        supabase
          .from('characters')
          .select('id, name, reference_image_url')
          .eq('series_id', seriesId)
          .order('name', { ascending: true })
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (scriptsRes.error) throw scriptsRes.error;
      if (charactersRes.error) throw charactersRes.error;

      const allAssets = assetsRes.data || [];
      const videoAssets = allAssets.filter((asset) => {
        const mimeType = asset.metadata?.mimeType || '';
        return mimeType.startsWith('video/') || asset.asset_type === 'video_clip';
      });
      setVideos(videoAssets);
      setScripts(scriptsRes.data || []);
      setCharacters(charactersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('series')
        .select('featured_trailer_id, featured_trailer_title, featured_trailer_association_type, featured_trailer_association_id')
        .eq('id', seriesId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSelectedVideoId(data.featured_trailer_id);
        setTrailerTitle(data.featured_trailer_title || '');
        setAssociationType(data.featured_trailer_association_type as 'script' | 'character' || 'none');
        setAssociationId(data.featured_trailer_association_id);
      }
    } catch (error) {
      console.error('Error loading current settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('series')
        .update({
          featured_trailer_id: selectedVideoId,
          featured_trailer_title: trailerTitle || null,
          featured_trailer_association_type: associationType === 'none' ? null : associationType,
          featured_trailer_association_id: associationType === 'none' ? null : associationId
        })
        .eq('id', seriesId);

      if (error) throw error;
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving trailer settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTrailer = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('series')
        .update({
          featured_trailer_id: null,
          featured_trailer_title: null,
          featured_trailer_association_type: null,
          featured_trailer_association_id: null
        })
        .eq('id', seriesId);

      if (error) throw error;
      onSave();
      onClose();
    } catch (error) {
      console.error('Error removing trailer:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredVideos = videos.filter(video =>
    video.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-scripps-navy to-scripps-blue">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Select Featured Trailer</h2>
              <p className="text-sm text-white/70">Choose a video to showcase on your dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-scripps-blue/30 border-t-scripps-blue rounded-full animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Videos Found</h3>
              <p className="text-gray-500 mb-4">Upload videos to your Asset Library to feature them here</p>
              <button
                onClick={() => { onClose(); onNavigate('assets'); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-scripps-blue text-white rounded-lg hover:bg-scripps-navy transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Go to Asset Library
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-scripps-blue/20 focus:border-scripps-blue outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setSelectedVideoId(video.id === selectedVideoId ? null : video.id)}
                    onMouseEnter={() => setPreviewVideo(video)}
                    onMouseLeave={() => setPreviewVideo(null)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all group ${
                      selectedVideoId === video.id
                        ? 'border-scripps-blue ring-2 ring-scripps-blue/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Film className="w-8 h-8 text-gray-500" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium truncate">{video.name}</p>
                    </div>

                    {selectedVideoId === video.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-scripps-blue flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedVideoId && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trailer Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={trailerTitle}
                      onChange={(e) => setTrailerTitle(e.target.value)}
                      placeholder="e.g., Series Premiere Trailer"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-scripps-blue/20 focus:border-scripps-blue outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Associate With (Optional)
                    </label>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => { setAssociationType('none'); setAssociationId(null); }}
                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          associationType === 'none'
                            ? 'border-scripps-blue bg-scripps-blue/5 text-scripps-blue'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        None
                      </button>
                      <button
                        onClick={() => { setAssociationType('script'); setAssociationId(null); }}
                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                          associationType === 'script'
                            ? 'border-scripps-blue bg-scripps-blue/5 text-scripps-blue'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        Script
                      </button>
                      <button
                        onClick={() => { setAssociationType('character'); setAssociationId(null); }}
                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                          associationType === 'character'
                            ? 'border-scripps-blue bg-scripps-blue/5 text-scripps-blue'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <User className="w-4 h-4" />
                        Character
                      </button>
                    </div>

                    {associationType === 'script' && (
                      <select
                        value={associationId || ''}
                        onChange={(e) => setAssociationId(e.target.value || null)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-scripps-blue/20 focus:border-scripps-blue outline-none transition-all bg-white"
                      >
                        <option value="">Select a script...</option>
                        {scripts.map((script) => (
                          <option key={script.id} value={script.id}>
                            {script.episode_number ? `Ep ${script.episode_number}: ` : ''}{script.title}
                          </option>
                        ))}
                      </select>
                    )}

                    {associationType === 'character' && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {characters.map((character) => (
                          <button
                            key={character.id}
                            onClick={() => setAssociationId(character.id === associationId ? null : character.id)}
                            className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                              associationId === character.id
                                ? 'border-scripps-blue bg-scripps-blue/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <CharacterImage
                              url={character.reference_image_url}
                              alt={character.name}
                              className="w-12 h-12 rounded-full object-cover mb-2"
                              fallback={
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                                  <User className="w-6 h-6 text-gray-400" />
                                </div>
                              }
                            />
                            <span className="text-xs font-medium text-gray-700 text-center truncate w-full">
                              {character.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {currentTrailerId && (
              <button
                onClick={handleRemoveTrailer}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Remove Trailer
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedVideoId}
              className="px-6 py-2 bg-scripps-blue text-white rounded-lg hover:bg-scripps-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Trailer'
              )}
            </button>
          </div>
        </div>
      </div>

      {previewVideo && previewVideo.file_url && (
        <div className="fixed bottom-4 right-4 w-64 bg-black rounded-xl overflow-hidden shadow-2xl z-[60] pointer-events-none">
          <video
            src={previewVideo.file_url}
            autoPlay
            muted
            loop
            className="w-full aspect-video object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-xs truncate">{previewVideo.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
