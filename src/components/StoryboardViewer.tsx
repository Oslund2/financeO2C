import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Film, Camera, Clock, MessageSquare, Lightbulb, Download, Grid3x3, List, Upload, Wand2, RefreshCw, ZoomIn, Layers, Sparkles, Trash2, Edit3, FileEdit, Filter, CheckCircle, History, Shield, FileDown, Settings, Users, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { uploadManualImage } from '../services/nanoBananaService';
import { generateImagesForStoryboard } from '../services/storyboardService';
import { exportStoryboardToPDF, downloadPDF } from '../services/storyboardPdfExportService';
import { BulkUploadModal } from './BulkUploadModal';
import { SelectiveGenerationModal } from './SelectiveGenerationModal';
import { ImageActionsMenu } from './ImageActionsMenu';
import { ShotStatusBadge, getCompletionStats } from './ShotStatusBadge';
import { ShotMetadataEditor } from './ShotMetadataEditor';
import { PromptEditor } from './PromptEditor';
import { ImageVersionHistory } from './ImageVersionHistory';
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { ManualReferenceUploadModal } from './ManualReferenceUploadModal';
import { StoryboardReferenceSetup } from './StoryboardReferenceSetup';
import { CharacterImage } from './CharacterImage';

type Storyboard = Database['public']['Tables']['storyboards']['Row'];
type StoryboardShot = Database['public']['Tables']['storyboard_shots']['Row'];

interface StoryboardViewerProps {
  storyboardId: string;
  onNavigate: (view: string) => void;
}

export function StoryboardViewer({ storyboardId, onNavigate }: StoryboardViewerProps) {
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [shots, setShots] = useState<StoryboardShot[]>([]);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'detailed' | 'grid'>('detailed');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showSelectiveGeneration, setShowSelectiveGeneration] = useState(false);
  const [currentActionShotId, setCurrentActionShotId] = useState<string | null>(null);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showManualReferenceUpload, setShowManualReferenceUpload] = useState(false);
  const [showReferenceSetup, setShowReferenceSetup] = useState(false);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportOptions, setExportOptions] = useState({
    includeDialogue: true,
    includeStageDirections: true,
    includeCameraInfo: true,
    shotsPerPage: 2 as 2 | 4 | 6,
    pageOrientation: 'landscape' as 'portrait' | 'landscape'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleUploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStoryboard();
  }, [storyboardId]);

  const loadStoryboard = async () => {
    try {
      const { data: storyboardData, error: storyboardError } = await supabase
        .from('storyboards')
        .select('*, scripts(series_id)')
        .eq('id', storyboardId)
        .single();

      if (storyboardError) throw storyboardError;
      setStoryboard(storyboardData);

      const scriptData = storyboardData.scripts as { series_id: string } | null;
      if (scriptData?.series_id) {
        setSeriesId(scriptData.series_id);
      }

      const { data: shotsData, error: shotsError } = await supabase
        .from('storyboard_shots')
        .select('*')
        .eq('storyboard_id', storyboardId)
        .order('shot_number', { ascending: true });

      if (shotsError) throw shotsError;
      setShots(shotsData || []);
    } catch (error) {
      console.error('Error loading storyboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredShots = filterApprovalStatus === 'all'
    ? shots
    : shots.filter(shot => shot.approval_status === filterApprovalStatus);

  const currentShot = filteredShots[currentShotIndex];

  const handlePrevious = () => {
    if (currentShotIndex > 0) {
      setCurrentShotIndex(currentShotIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentShotIndex < filteredShots.length - 1) {
      setCurrentShotIndex(currentShotIndex + 1);
    }
  };

  const handleEditMetadata = (shotId: string) => {
    setCurrentActionShotId(shotId);
    setShowMetadataEditor(true);
  };

  const handleEditPrompt = (shotId: string) => {
    setCurrentActionShotId(shotId);
    setShowPromptEditor(true);
  };

  const handleViewVersionHistory = (shotId: string) => {
    setCurrentActionShotId(shotId);
    setShowVersionHistory(true);
  };

  const handleManageApproval = (shotId: string) => {
    setCurrentActionShotId(shotId);
    setShowApprovalWorkflow(true);
  };

  const handleRegenerateWithNewPrompt = async (newPrompt: string) => {
    if (!currentActionShotId) return;

    setGenerating(true);
    try {
      await generateImagesForStoryboard(
        storyboardId,
        [currentActionShotId],
        (progress, status) => {
          setGenerationProgress(progress);
          setGenerationStatus(status);
        }
      );

      await loadStoryboard();
    } catch (error) {
      console.error('Regeneration error:', error);
      alert(error instanceof Error ? error.message : 'Failed to regenerate image');
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }
  };

  const handleExport = () => {
    setShowExportOptions(true);
  };

  const handleExportPDF = async () => {
    if (!storyboard) return;

    setExporting(true);
    setExportProgress(0);
    setExportStatus('Preparing export...');
    setShowExportOptions(false);

    try {
      const blob = await exportStoryboardToPDF(
        storyboard,
        shots,
        exportOptions,
        (progress, status) => {
          setExportProgress(progress);
          setExportStatus(status);
        }
      );

      const filename = `${storyboard.title.replace(/[^a-z0-9]/gi, '_')}_storyboard.pdf`;
      downloadPDF(blob, filename);
    } catch (error) {
      console.error('Export error:', error);
      alert(error instanceof Error ? error.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
      setExportProgress(0);
      setExportStatus('');
    }
  };

  const handleUploadImage = async (file: File, shotId: string, actNumber: number, shotNumber: number) => {
    setUploading(true);
    try {
      const { imageUrl, thumbnailUrl } = await uploadManualImage(file, storyboardId, actNumber, shotNumber);

      await supabase
        .from('storyboard_shots')
        .update({
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          generation_status: 'completed',
          generation_metadata: {
            source: 'manual_upload',
            uploadedAt: new Date().toISOString()
          }
        })
        .eq('id', shotId);

      await loadStoryboard();
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAllImages = async () => {
    if (!confirm('Generate images for all shots without images? This may incur costs.')) return;

    setGenerating(true);
    try {
      const pendingShots = shots.filter(s => !s.image_url).map(s => s.id);

      if (pendingShots.length === 0) {
        alert('All shots already have images!');
        return;
      }

      await generateImagesForStoryboard(
        storyboardId,
        pendingShots,
        (progress, status) => {
          setGenerationProgress(progress);
          setGenerationStatus(status);
        }
      );

      await loadStoryboard();
      alert('Image generation complete!');
    } catch (error) {
      console.error('Generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate images');
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }
  };

  const handleGenerateSingleImage = async (shotId: string) => {
    setGenerating(true);
    try {
      await generateImagesForStoryboard(
        storyboardId,
        [shotId],
        (progress, status) => {
          setGenerationProgress(progress);
          setGenerationStatus(status);
        }
      );

      await loadStoryboard();
    } catch (error) {
      console.error('Generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }
  };

  const getActNumberForShot = (shot: StoryboardShot): number => {
    return 1;
  };

  const handleDeleteImage = async (shotId: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) return;

    try {
      await supabase
        .from('storyboard_shots')
        .update({
          image_url: null,
          thumbnail_url: null,
          generation_status: 'pending',
          generation_metadata: {
            deletedAt: new Date().toISOString()
          }
        })
        .eq('id', shotId);

      await loadStoryboard();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete image');
    }
  };

  const handleRegenerateImage = async (shotId: string) => {
    if (!confirm('Generate a new AI image for this shot?')) return;

    setGenerating(true);
    try {
      await generateImagesForStoryboard(
        storyboardId,
        [shotId],
        (progress, status) => {
          setGenerationProgress(progress);
          setGenerationStatus(status);
        }
      );

      await loadStoryboard();
    } catch (error) {
      console.error('Regeneration error:', error);
      alert(error instanceof Error ? error.message : 'Failed to regenerate image');
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }
  };

  const handleSingleUpload = (shotId: string) => {
    setCurrentActionShotId(shotId);
    singleUploadInputRef.current?.click();
  };

  const handleUploadManualReference = (shotId: string) => {
    setCurrentActionShotId(shotId);
    setShowManualReferenceUpload(true);
  };

  const handleSingleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentActionShotId) return;

    const shot = shots.find(s => s.id === currentActionShotId);
    if (!shot) return;

    await handleUploadImage(file, shot.id, getActNumberForShot(shot), shot.shot_number);
    setCurrentActionShotId(null);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading storyboard...</p>
        </div>
      </div>
    );
  }

  if (!storyboard || shots.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-xl shadow-md p-12 border border-gray-200">
            <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Storyboard Found</h3>
            <p className="text-gray-600 mb-6">The storyboard you're looking for doesn't exist or has no shots.</p>
            <button
              onClick={() => onNavigate('storyboard-generator')}
              className="px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              Back to Generator
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completionStats = getCompletionStats(shots);

  if (viewMode === 'grid') {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => onNavigate('storyboard-generator')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            <div className="flex items-center gap-3">
              {storyboard.episode_id && (
                <button
                  onClick={() => onNavigate('production', { episodeId: storyboard.episode_id })}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  <Film className="w-4 h-4" />
                  Start Production
                </button>
              )}
              <button
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Layers className="w-4 h-4" />
                Bulk Upload
              </button>
              <button
                onClick={() => setShowReferenceSetup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                References
              </button>
              <button
                onClick={() => setShowReferenceSetup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Generate Images
              </button>
              <button
                onClick={() => onNavigate('video-generation')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-md transition-all font-medium"
              >
                <Video className="w-4 h-4" />
                Generate Video
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className="flex items-center gap-2 px-4 py-2 bg-scripps-blue text-white rounded-lg hover:shadow-md transition-all"
              >
                <List className="w-4 h-4" />
                Detailed View
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{storyboard.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{shots.length} shots</span>
                  <span>•</span>
                  <span>~{Math.round(shots.reduce((sum, shot) => sum + (shot.duration_seconds || 0), 0) / 60)} minutes</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600 mb-1">{completionStats.percentage}%</div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full transition-all duration-500"
                style={{ width: `${completionStats.percentage}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {completionStats.uploaded} Uploaded
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                {completionStats.aiGenerated} AI Generated
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                {completionStats.empty} Empty
              </span>
              {completionStats.failed > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {completionStats.failed} Failed
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shots.map((shot, index) => (
              <div
                key={shot.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-200 overflow-hidden group relative"
              >
                <div
                  onClick={() => {
                    setCurrentShotIndex(index);
                    setViewMode('detailed');
                  }}
                  className="cursor-pointer"
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                    <CharacterImage
                      url={shot.image_url}
                      alt={`Shot ${shot.shot_number}`}
                      className="w-full h-full object-cover"
                      fallback={<Camera className="w-8 h-8 text-gray-400" />}
                    />
                    <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      #{shot.shot_number}
                    </div>
                    <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {shot.duration_seconds}s
                    </div>
                    {shot.use_manual_reference && shot.manual_reference_image_url && (
                      <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1" title="Using manual reference for character consistency">
                        <Shield className="w-3 h-3" />
                        Manual Ref
                      </div>
                    )}
                    {shot.generation_status === 'generating' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {!shot.image_url && shot.generation_status !== 'generating' && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSingleUpload(shot.id);
                            }}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            title="Upload image"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateSingleImage(shot.id);
                            }}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Generate with AI"
                          >
                            <Wand2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase">{shot.shot_type}</div>
                      <ShotStatusBadge shot={shot} size="sm" />
                    </div>
                    <div className="text-sm font-medium text-gray-900 line-clamp-2">
                      {shot.shot_description || 'No description'}
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                  <ImageActionsMenu
                    hasImage={!!shot.image_url}
                    onUpload={() => handleSingleUpload(shot.id)}
                    onDelete={() => handleDeleteImage(shot.id)}
                    onRegenerate={() => handleRegenerateImage(shot.id)}
                    onGenerateAI={() => handleGenerateSingleImage(shot.id)}
                    onUploadReference={() => handleUploadManualReference(shot.id)}
                    disabled={generating || uploading}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('storyboard-generator')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {storyboard.episode_id && (
              <button
                onClick={() => onNavigate('production', { episodeId: storyboard.episode_id })}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                <Film className="w-4 h-4" />
                Start Production
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filter {filterApprovalStatus !== 'all' && `(${filterApprovalStatus})`}
              </button>
              {showFilterMenu && (
                <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                  <button
                    onClick={() => { setFilterApprovalStatus('all'); setShowFilterMenu(false); setCurrentShotIndex(0); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${filterApprovalStatus === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                  >
                    All Shots
                  </button>
                  <button
                    onClick={() => { setFilterApprovalStatus('draft'); setShowFilterMenu(false); setCurrentShotIndex(0); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${filterApprovalStatus === 'draft' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                  >
                    Draft
                  </button>
                  <button
                    onClick={() => { setFilterApprovalStatus('pending_review'); setShowFilterMenu(false); setCurrentShotIndex(0); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${filterApprovalStatus === 'pending_review' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                  >
                    Pending Review
                  </button>
                  <button
                    onClick={() => { setFilterApprovalStatus('approved'); setShowFilterMenu(false); setCurrentShotIndex(0); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${filterApprovalStatus === 'approved' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => { setFilterApprovalStatus('rejected'); setShowFilterMenu(false); setCurrentShotIndex(0); }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${filterApprovalStatus === 'rejected' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                  >
                    Rejected
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowBulkUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Layers className="w-4 h-4" />
              Bulk Upload
            </button>
            <button
              onClick={() => setShowReferenceSetup(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              References
            </button>
            <button
              onClick={() => setShowReferenceSetup(true)}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate Images'}
            </button>
            <button
              onClick={() => onNavigate('video-generation')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-md transition-all font-medium"
            >
              <Video className="w-4 h-4" />
              Generate Video
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Grid3x3 className="w-4 h-4" />
              Grid View
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">{storyboard.title}</h1>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold">{completionStats.percentage}%</div>
                  <div className="text-xs text-blue-100">Complete</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-blue-100">
              <span>Shot {currentShot.shot_number} of {shots.length}</span>
              <span>•</span>
              <span>{currentShot.shot_type}</span>
              <span>•</span>
              <span>{currentShot.duration_seconds}s</span>
              <span>•</span>
              <span className="inline-block">
                <ShotStatusBadge shot={currentShot} size="sm" />
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-4 border-2 border-gray-300 relative overflow-hidden group">
                  {currentShot.image_url ? (
                    <>
                      <CharacterImage
                        url={currentShot.image_url}
                        alt={`Shot ${currentShot.shot_number}`}
                        className="w-full h-full object-cover"
                        fallback={<Camera className="w-12 h-12 text-gray-400" />}
                      />
                      <button
                        onClick={() => setZoomedImage(currentShot.image_url)}
                        className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ZoomIn className="w-5 h-5" />
                      </button>
                      {currentShot.use_manual_reference && currentShot.manual_reference_image_url && (
                        <div className="absolute bottom-3 left-3 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg" title={`Manual reference: ${currentShot.manual_upload_notes || 'For improved character consistency'}`}>
                          <Shield className="w-4 h-4" />
                          <span className="font-medium">Manual Reference</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">No Image</p>
                      <p className="text-xs text-gray-500 mt-1">Shot #{currentShot.shot_number}</p>
                    </div>
                  )}
                  {currentShot.generation_status === 'generating' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm font-medium">Generating...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {currentShot.image_url ? (
                    <>
                      <button
                        onClick={() => handleSingleUpload(currentShot.id)}
                        disabled={uploading}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Replace Image'}
                      </button>
                      <button
                        onClick={() => handleRegenerateImage(currentShot.id)}
                        disabled={generating}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {generating ? 'Regenerating...' : 'Regenerate AI'}
                      </button>
                      <button
                        onClick={() => handleDeleteImage(currentShot.id)}
                        className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Image
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSingleUpload(currentShot.id)}
                        disabled={uploading}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Upload Image'}
                      </button>
                      <button
                        onClick={() => handleGenerateSingleImage(currentShot.id)}
                        disabled={generating}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Wand2 className="w-4 h-4" />
                        {generating ? 'Generating...' : 'Generate AI'}
                      </button>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => handleEditMetadata(currentShot.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Details
                  </button>
                  <button
                    onClick={() => handleEditPrompt(currentShot.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <FileEdit className="w-4 h-4" />
                    Edit Prompt
                  </button>
                  <button
                    onClick={() => handleViewVersionHistory(currentShot.id)}
                    disabled={!currentShot.image_url}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <History className="w-4 h-4" />
                    Versions
                  </button>
                  <button
                    onClick={() => handleManageApproval(currentShot.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approval
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadImage(file, currentShot.id, getActNumberForShot(currentShot), currentShot.shot_number);
                    }
                    e.target.value = '';
                  }}
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePrevious}
                    disabled={currentShotIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    {currentShotIndex + 1} / {filteredShots.length}
                  </span>

                  <button
                    onClick={handleNext}
                    disabled={currentShotIndex === filteredShots.length - 1}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Film className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Shot Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">Type:</span>
                      <span className="text-blue-900 capitalize">{currentShot.shot_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">Camera Angle:</span>
                      <span className="text-blue-900 capitalize">{currentShot.camera_angle?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">Movement:</span>
                      <span className="text-blue-900 capitalize">{currentShot.camera_movement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">Duration:</span>
                      <span className="text-blue-900">{currentShot.duration_seconds} seconds</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Visual Description</h3>
                  </div>
                  <p className="text-sm text-green-800 leading-relaxed">
                    {currentShot.shot_description || 'No description available'}
                  </p>
                </div>

                <div className={`rounded-lg p-4 border ${(currentShot.character_positions as any[])?.length > 0 ? 'bg-violet-50 border-violet-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className={`w-5 h-5 ${(currentShot.character_positions as any[])?.length > 0 ? 'text-violet-600' : 'text-amber-600'}`} />
                      <h3 className={`font-semibold ${(currentShot.character_positions as any[])?.length > 0 ? 'text-violet-900' : 'text-amber-900'}`}>
                        Character References
                      </h3>
                    </div>
                    {!(currentShot.character_positions as any[])?.length && (
                      <button
                        onClick={async () => {
                          const { repairShotCharacterPositions } = await import('../services/storyboardService');
                          const result = await repairShotCharacterPositions(currentShot.id);
                          if (result.success) {
                            alert(result.message);
                            loadStoryboard();
                          } else {
                            alert(`Failed to repair: ${result.message}`);
                          }
                        }}
                        className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
                      >
                        Fix Characters
                      </button>
                    )}
                  </div>
                  {(currentShot.character_positions as any[])?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(currentShot.character_positions as any[]).map((pos: any, idx: number) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-full font-medium">
                          {pos.character || pos.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-800">
                      No characters linked. This shot may generate with incorrect characters.
                    </p>
                  )}
                </div>

                {currentShot.dialogue_text && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5 text-yellow-600" />
                      <h3 className="font-semibold text-yellow-900">Dialogue</h3>
                    </div>
                    <p className="text-sm text-yellow-800 leading-relaxed">
                      {currentShot.dialogue_text}
                    </p>
                  </div>
                )}

                {currentShot.composition_notes && (
                  <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-cyan-600" />
                      <h3 className="font-semibold text-cyan-900">Composition Notes</h3>
                    </div>
                    <p className="text-sm text-cyan-800 leading-relaxed">
                      {currentShot.composition_notes}
                    </p>
                  </div>
                )}

                {currentShot.lighting_notes && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-orange-900">Lighting Notes</h3>
                    </div>
                    <p className="text-sm text-orange-800 leading-relaxed">
                      {currentShot.lighting_notes}
                    </p>
                  </div>
                )}

                {currentShot.stage_directions && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Film className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Stage Directions</h3>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {currentShot.stage_directions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredShots.map((shot, index) => (
            <button
              key={shot.id}
              onClick={() => setCurrentShotIndex(index)}
              className={`aspect-video rounded-lg border-2 transition-all overflow-hidden relative ${
                index === currentShotIndex
                  ? 'border-scripps-blue ring-2 ring-scripps-blue ring-offset-1'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {shot.image_url || shot.thumbnail_url ? (
                <>
                  <CharacterImage
                    url={shot.thumbnail_url || shot.image_url}
                    alt={`Shot ${shot.shot_number}`}
                    className="w-full h-full object-cover"
                    fallback={<Camera className="w-6 h-6 text-gray-400" />}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-1 left-1 right-1 text-center">
                    <div className="text-xs font-bold text-white drop-shadow">#{shot.shot_number}</div>
                    <div className="text-xs text-white/80 capitalize drop-shadow">{shot.shot_type}</div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-600">#{shot.shot_number}</div>
                    <div className="text-xs text-gray-500 capitalize">{shot.shot_type}</div>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <CharacterImage
              url={zoomedImage}
              alt="Zoomed shot"
              className="max-w-full max-h-screen object-contain"
              fallback={<div className="text-white text-lg">Image unavailable</div>}
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {generating && (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl border-2 border-blue-500 p-5 max-w-sm z-40">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 mb-1">Generating Image</p>
              <p className="text-sm text-gray-600 truncate">{generationStatus}</p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {generationProgress < 100 ? 'Please wait, this may take up to 30 seconds...' : 'Finalizing...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkUploadModal
          storyboardId={storyboardId}
          shots={shots}
          onClose={() => setShowBulkUpload(false)}
          onUploadComplete={() => {
            loadStoryboard();
            setShowBulkUpload(false);
          }}
        />
      )}

      {showReferenceSetup && (
        <StoryboardReferenceSetup
          storyboardId={storyboardId}
          seriesId={seriesId}
          onClose={() => setShowReferenceSetup(false)}
          onProceed={() => {
            setShowReferenceSetup(false);
            setShowSelectiveGeneration(true);
          }}
        />
      )}

      {showSelectiveGeneration && (
        <SelectiveGenerationModal
          storyboardId={storyboardId}
          shots={shots}
          onClose={() => setShowSelectiveGeneration(false)}
          onGenerationComplete={() => {
            loadStoryboard();
            setShowSelectiveGeneration(false);
          }}
        />
      )}

      {showMetadataEditor && currentActionShotId && (
        <ShotMetadataEditor
          shot={shots.find(s => s.id === currentActionShotId)!}
          onClose={() => {
            setShowMetadataEditor(false);
            setCurrentActionShotId(null);
          }}
          onSave={() => {
            loadStoryboard();
          }}
        />
      )}

      {showPromptEditor && currentActionShotId && (
        <PromptEditor
          shot={shots.find(s => s.id === currentActionShotId)!}
          onClose={() => {
            setShowPromptEditor(false);
            setCurrentActionShotId(null);
          }}
          onSave={() => {
            loadStoryboard();
          }}
          onRegenerateWithPrompt={handleRegenerateWithNewPrompt}
        />
      )}

      {showVersionHistory && currentActionShotId && (
        <ImageVersionHistory
          shot={shots.find(s => s.id === currentActionShotId)!}
          onClose={() => {
            setShowVersionHistory(false);
            setCurrentActionShotId(null);
          }}
          onVersionSelected={() => {
            loadStoryboard();
          }}
        />
      )}

      {showApprovalWorkflow && currentActionShotId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <ApprovalWorkflow
              shot={shots.find(s => s.id === currentActionShotId)!}
              onClose={() => {
                setShowApprovalWorkflow(false);
                setCurrentActionShotId(null);
              }}
              onApprovalChanged={() => {
                loadStoryboard();
              }}
            />
          </div>
        </div>
      )}

      {showManualReferenceUpload && currentActionShotId && (
        <ManualReferenceUploadModal
          shotId={currentActionShotId}
          shotNumber={shots.find(s => s.id === currentActionShotId)?.shot_number || 0}
          currentImageUrl={shots.find(s => s.id === currentActionShotId)?.image_url}
          onClose={() => {
            setShowManualReferenceUpload(false);
            setCurrentActionShotId(null);
          }}
          onSuccess={() => {
            loadStoryboard();
          }}
        />
      )}

      {showExportOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileDown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Export Storyboard PDF</h2>
                  <p className="text-sm text-gray-500">{shots.length} shots will be exported</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setExportOptions(prev => ({ ...prev, pageOrientation: 'landscape' }))}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      exportOptions.pageOrientation === 'landscape'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-full h-8 bg-gray-200 rounded mb-2" style={{ aspectRatio: '297/210' }}></div>
                    <span className="text-sm font-medium">Landscape</span>
                  </button>
                  <button
                    onClick={() => setExportOptions(prev => ({ ...prev, pageOrientation: 'portrait' }))}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      exportOptions.pageOrientation === 'portrait'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-12 h-8 bg-gray-200 rounded mx-auto mb-2" style={{ aspectRatio: '210/297' }}></div>
                    <span className="text-sm font-medium">Portrait</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shots Per Page</label>
                <div className="flex gap-2">
                  {[2, 4, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setExportOptions(prev => ({ ...prev, shotsPerPage: num as 2 | 4 | 6 }))}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                        exportOptions.shotsPerPage === num
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Include</label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDialogue}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeDialogue: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-gray-700">Dialogue text</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeStageDirections}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeStageDirections: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Stage directions</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCameraInfo}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeCameraInfo: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Camera information</span>
                  </div>
                </label>
              </div>

              {exportOptions.includeDialogue && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      Dialogue will appear in highlighted boxes beneath each shot's image for easy script reference.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowExportOptions(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {exporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900">Exporting PDF</h3>
            </div>
            <div className="mb-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">{exportStatus}</p>
          </div>
        </div>
      )}

      <input
        ref={singleUploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleSingleFileSelect}
      />
    </div>
  );
}
