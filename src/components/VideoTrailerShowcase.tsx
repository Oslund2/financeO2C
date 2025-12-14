import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX, Film, Settings, FileText, User, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Asset {
  id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  asset_type: string;
}

interface AssociatedContent {
  type: 'script' | 'character';
  id: string;
  name: string;
}

interface TrailerData {
  asset: Asset | null;
  title: string | null;
  association: AssociatedContent | null;
}

interface VideoTrailerShowcaseProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
  onOpenSelector: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function VideoTrailerShowcase({ seriesId, onNavigate, onOpenSelector, isCollapsed, onToggleCollapse }: VideoTrailerShowcaseProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [trailerData, setTrailerData] = useState<TrailerData>({ asset: null, title: null, association: null });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (seriesId) {
      loadTrailerData();
    } else {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const loadTrailerData = async () => {
    if (!seriesId) return;

    try {
      const { data: series, error: seriesError } = await supabase
        .from('series')
        .select('featured_trailer_id, featured_trailer_title, featured_trailer_association_type, featured_trailer_association_id')
        .eq('id', seriesId)
        .maybeSingle();

      if (seriesError) throw seriesError;
      if (!series?.featured_trailer_id) {
        setTrailerData({ asset: null, title: null, association: null });
        setLoading(false);
        return;
      }

      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('id, name, description, file_url, thumbnail_url, asset_type')
        .eq('id', series.featured_trailer_id)
        .maybeSingle();

      if (assetError) throw assetError;

      let association: AssociatedContent | null = null;
      if (series.featured_trailer_association_type && series.featured_trailer_association_id) {
        if (series.featured_trailer_association_type === 'script') {
          const { data: script } = await supabase
            .from('scripts')
            .select('id, title')
            .eq('id', series.featured_trailer_association_id)
            .maybeSingle();
          if (script) {
            association = { type: 'script', id: script.id, name: script.title };
          }
        } else if (series.featured_trailer_association_type === 'character') {
          const { data: character } = await supabase
            .from('characters')
            .select('id, name')
            .eq('id', series.featured_trailer_association_id)
            .maybeSingle();
          if (character) {
            association = { type: 'character', id: character.id, name: character.name };
          }
        }
      }

      setTrailerData({
        asset: asset || null,
        title: series.featured_trailer_title,
        association
      });
    } catch (error) {
      console.error('Error loading trailer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    setHasInteracted(true);
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    setHasInteracted(true);
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(currentProgress);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = clickPosition * videoRef.current.duration;
  };

  const handleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleAssociationClick = () => {
    if (!trailerData.association) return;
    if (trailerData.association.type === 'script') {
      onNavigate('scripts');
    } else if (trailerData.association.type === 'character') {
      onNavigate('characters');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-white/70 font-medium">Loading...</span>
            </div>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!trailerData.asset || !trailerData.asset.file_url) {
    return (
      <div className="mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-700/50 transition-all duration-300">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-white font-medium">Add Series Trailer</span>
            </div>
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          {!isCollapsed && (
            <div
              onClick={onOpenSelector}
              className="group cursor-pointer hover:bg-white/5 transition-colors border-t border-gray-700/50"
            >
              <div className="aspect-video flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-scripps-navy/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors border border-white/10">
                    <Film className="w-10 h-10 text-gray-400 group-hover:text-scripps-blue transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Select a Video</h3>
                  <p className="text-sm text-gray-500 text-center max-w-xs">
                    Showcase your series with a featured video from your Asset Library
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-700/50 transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Film className="w-5 h-5 text-scripps-blue" />
            </div>
            <div className="text-left">
              <span className="text-white font-medium block">
                {trailerData.title || 'Series Trailer'}
              </span>
              {trailerData.asset.name && !trailerData.title && (
                <span className="text-gray-400 text-sm">{trailerData.asset.name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {trailerData.asset.thumbnail_url && (
              <div className="w-16 h-10 rounded-lg overflow-hidden border border-white/20 hidden sm:block">
                <img
                  src={trailerData.asset.thumbnail_url}
                  alt="Trailer thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {!isCollapsed && (
          <div
            ref={containerRef}
            className={`relative bg-black group ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            <video
              ref={videoRef}
              src={trailerData.asset.file_url}
              poster={trailerData.asset.thumbnail_url || undefined}
              className="w-full aspect-video object-cover"
              muted={isMuted}
              playsInline
              autoPlay
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnd}
            />

            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
              onClick={handlePlayPause}
            />

            {trailerData.title && (
              <div className={`absolute top-4 left-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-black/60 backdrop-blur-md rounded-lg px-4 py-2 border border-white/10">
                  <h3 className="text-white font-semibold text-lg">{trailerData.title}</h3>
                </div>
              </div>
            )}

            {trailerData.association && (
              <div className={`absolute top-4 right-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAssociationClick(); }}
                  className="flex items-center gap-2 bg-scripps-blue/80 backdrop-blur-md rounded-lg px-3 py-2 border border-white/20 hover:bg-scripps-blue transition-colors group/badge"
                >
                  {trailerData.association.type === 'script' ? (
                    <FileText className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                  <span className="text-white text-sm font-medium">{trailerData.association.name}</span>
                  <ExternalLink className="w-3 h-3 text-white/70 group-hover/badge:text-white transition-colors" />
                </button>
              </div>
            )}

            {(!isPlaying || showControls) && (
              <button
                onClick={handlePlayPause}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all duration-300 hover:scale-110 border border-white/30"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white ml-0" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </button>
            )}

            <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
              <div
                className="h-1 bg-white/20 cursor-pointer group/progress mx-4 mb-3 rounded-full overflow-hidden"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-scripps-blue group-hover/progress:bg-scripps-light-blue transition-colors relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg" />
                </div>
              </div>

              <div className="flex items-center justify-between px-4 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayPause}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" />
                    )}
                  </button>

                  <div className="relative group/volume">
                    <button
                      onClick={handleMuteToggle}
                      className={`p-2 hover:bg-white/10 rounded-lg transition-colors relative ${isMuted && !hasInteracted ? 'animate-pulse' : ''}`}
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                      {isMuted && !hasInteracted && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-scripps-blue rounded-full" />
                      )}
                    </button>
                  </div>

                  <span className="text-white/80 text-sm font-medium">
                    {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenSelector(); }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Change trailer"
                  >
                    <Settings className="w-5 h-5 text-white" />
                  </button>

                  <button
                    onClick={handleFullscreen}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Maximize className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
