import { useState } from 'react';
import { X, Wand2, DollarSign, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { calculateEstimatedCost } from '../services/nanoBananaService';
import { generateImagesForStoryboard } from '../services/storyboardService';
import type { Database } from '../lib/database.types';

type StoryboardShot = Database['public']['Tables']['storyboard_shots']['Row'];

interface SelectiveGenerationModalProps {
  storyboardId: string;
  shots: StoryboardShot[];
  onClose: () => void;
  onGenerationComplete: () => void;
}

export function SelectiveGenerationModal({
  storyboardId,
  shots,
  onClose,
  onGenerationComplete
}: SelectiveGenerationModalProps) {
  const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [filterAct, setFilterAct] = useState<number | 'all'>('all');

  const availableShots = shots.filter(shot => !shot.image_url);

  const acts = Array.from(new Set(availableShots.map(shot => 1))).sort((a, b) => a - b);

  const filteredShots = filterAct === 'all'
    ? availableShots
    : availableShots.filter(shot => 1 === filterAct);

  const handleToggleShot = (shotId: string) => {
    const newSelected = new Set(selectedShots);
    if (newSelected.has(shotId)) {
      newSelected.delete(shotId);
    } else {
      newSelected.add(shotId);
    }
    setSelectedShots(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedShots.size === filteredShots.length) {
      setSelectedShots(new Set());
    } else {
      setSelectedShots(new Set(filteredShots.map(s => s.id)));
    }
  };

  const handleSelectByType = (type: string) => {
    const shotsOfType = filteredShots.filter(s => s.shot_type === type).map(s => s.id);
    const newSelected = new Set(selectedShots);

    const allSelected = shotsOfType.every(id => newSelected.has(id));

    if (allSelected) {
      shotsOfType.forEach(id => newSelected.delete(id));
    } else {
      shotsOfType.forEach(id => newSelected.add(id));
    }

    setSelectedShots(newSelected);
  };

  const handleGenerate = async () => {
    if (selectedShots.size === 0) return;

    setGenerating(true);

    try {
      await generateImagesForStoryboard(
        storyboardId,
        Array.from(selectedShots),
        (prog, stat) => {
          setProgress(prog);
          setStatus(stat);
        }
      );

      setTimeout(() => {
        onGenerationComplete();
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate images');
    } finally {
      setGenerating(false);
      setProgress(0);
      setStatus('');
    }
  };

  const estimatedCost = calculateEstimatedCost(selectedShots.size);

  const shotTypeGroups = filteredShots.reduce((acc, shot) => {
    const type = shot.shot_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(shot);
    return acc;
  }, {} as Record<string, StoryboardShot[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">AI Image Generation</h2>
            <p className="text-blue-100 text-sm">Select shots to generate images with AI</p>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!generating ? (
          <>
            <div className="border-b border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {selectedShots.size === filteredShots.length ? 'Deselect All' : 'Select All'}
                  </button>

                  <select
                    value={filterAct}
                    onChange={(e) => setFilterAct(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Acts</option>
                    {acts.map(act => (
                      <option key={act} value={act}>Act {act}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    Est. Cost: ${estimatedCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {availableShots.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">All shots have images!</h3>
                  <p className="text-gray-600">Every shot in this storyboard already has an image.</p>
                </div>
              ) : filteredShots.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No shots available</h3>
                  <p className="text-gray-600">No shots match your current filter.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(shotTypeGroups).map(([type, typeShots]) => (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 capitalize flex items-center gap-2">
                          {type.replace('_', ' ')}
                          <span className="text-sm font-normal text-gray-500">({typeShots.length})</span>
                        </h3>
                        <button
                          onClick={() => handleSelectByType(type)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {typeShots.every(s => selectedShots.has(s.id)) ? 'Deselect' : 'Select'} All
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {typeShots.map(shot => (
                          <label
                            key={shot.id}
                            className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                              selectedShots.has(shot.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedShots.has(shot.id)}
                                onChange={() => handleToggleShot(shot.id)}
                                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-bold text-gray-900">
                                    Shot #{shot.shot_number}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {shot.duration_seconds}s
                                  </span>
                                </div>

                                <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                                  {shot.shot_description || 'No description'}
                                </p>

                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span className="capitalize">{shot.camera_angle?.replace('_', ' ')}</span>
                                  <span>•</span>
                                  <span className="capitalize">{shot.camera_movement}</span>
                                </div>
                              </div>

                              <ImageIcon className={`w-5 h-5 ${
                                selectedShots.has(shot.id) ? 'text-blue-600' : 'text-gray-400'
                              }`} />
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selectedShots.size}</span> shots selected
                {selectedShots.size > 0 && (
                  <>
                    {' • '}
                    <span className="font-semibold text-gray-900">
                      ~{Math.ceil(selectedShots.size * 30)}s
                    </span>
                    {' generation time'}
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={selectedShots.size === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate {selectedShots.size} {selectedShots.size === 1 ? 'Image' : 'Images'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Generating Images</h3>
              <p className="text-gray-600 mb-4">{status}</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{Math.round(progress)}% complete</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
