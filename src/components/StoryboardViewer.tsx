import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Film, Camera, Clock, MessageSquare, Lightbulb, Download, Grid3x3, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

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

  useEffect(() => {
    loadStoryboard();
  }, [storyboardId]);

  const loadStoryboard = async () => {
    try {
      const { data: storyboardData, error: storyboardError } = await supabase
        .from('storyboards')
        .select('*')
        .eq('id', storyboardId)
        .single();

      if (storyboardError) throw storyboardError;
      setStoryboard(storyboardData);

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

  const currentShot = shots[currentShotIndex];

  const handlePrevious = () => {
    if (currentShotIndex > 0) {
      setCurrentShotIndex(currentShotIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentShotIndex < shots.length - 1) {
      setCurrentShotIndex(currentShotIndex + 1);
    }
  };

  const handleExport = () => {
    alert('Export functionality coming soon! This will generate a PDF storyboard document.');
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{storyboard.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{shots.length} shots</span>
              <span>•</span>
              <span>~{Math.round(shots.reduce((sum, shot) => sum + (shot.duration_seconds || 0), 0) / 60)} minutes</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shots.map((shot, index) => (
              <button
                key={shot.id}
                onClick={() => {
                  setCurrentShotIndex(index);
                  setViewMode('detailed');
                }}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-200 overflow-hidden group"
              >
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                  <Camera className="w-8 h-8 text-gray-400" />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    #{shot.shot_number}
                  </div>
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {shot.duration_seconds}s
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-xs font-semibold text-gray-500 mb-1 uppercase">{shot.shot_type}</div>
                  <div className="text-sm font-medium text-gray-900 line-clamp-2">
                    {shot.shot_description || 'No description'}
                  </div>
                </div>
              </button>
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
            <h1 className="text-2xl font-bold mb-2">{storyboard.title}</h1>
            <div className="flex items-center gap-4 text-blue-100">
              <span>Shot {currentShot.shot_number} of {shots.length}</span>
              <span>•</span>
              <span>{currentShot.shot_type}</span>
              <span>•</span>
              <span>{currentShot.duration_seconds}s</span>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-4 border-2 border-gray-300">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">Storyboard Panel</p>
                    <p className="text-xs text-gray-500 mt-1">Shot #{currentShot.shot_number}</p>
                  </div>
                </div>

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
                    {currentShotIndex + 1} / {shots.length}
                  </span>

                  <button
                    onClick={handleNext}
                    disabled={currentShotIndex === shots.length - 1}
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
          {shots.map((shot, index) => (
            <button
              key={shot.id}
              onClick={() => setCurrentShotIndex(index)}
              className={`aspect-video rounded-lg border-2 transition-all flex items-center justify-center ${
                index === currentShotIndex
                  ? 'border-scripps-blue bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-xs font-bold text-gray-600">#{shot.shot_number}</div>
                <div className="text-xs text-gray-500 capitalize">{shot.shot_type}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
