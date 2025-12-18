import { useState, useEffect } from 'react';
import { X, Wand2, DollarSign, Image as ImageIcon, CheckCircle, AlertCircle, Clock, Settings, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateEstimatedCost, getRateLimitStatus } from '../services/nanoBananaService';
import { generateImagesForStoryboard, GenerationProgressInfo } from '../services/storyboardService';
import { loadGenerationSettings, saveGenerationSettings, GenerationSettings, DEFAULT_GENERATION_SETTINGS } from '../services/rateLimitingService';
import type { Database } from '../lib/database.types';

type StoryboardShot = Database['public']['Tables']['storyboard_shots']['Row'];

interface SelectiveGenerationModalProps {
  storyboardId: string;
  shots: StoryboardShot[];
  onClose: () => void;
  onGenerationComplete: () => void;
}

interface GenerationLog {
  shotNumber: number;
  status: 'pending' | 'generating' | 'success' | 'failed';
  message?: string;
  timestamp: Date;
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
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>(loadGenerationSettings);
  const [progressInfo, setProgressInfo] = useState<GenerationProgressInfo | null>(null);
  const [generationLogs, setGenerationLogs] = useState<GenerationLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [generationResult, setGenerationResult] = useState<{ successCount: number; failCount: number; totalCost: number } | null>(null);

  const availableShots = shots.filter(shot => !shot.image_url);
  const acts = Array.from(new Set(availableShots.map(shot => 1))).sort((a, b) => a - b);

  const filteredShots = filterAct === 'all'
    ? availableShots
    : availableShots.filter(shot => 1 === filterAct);

  useEffect(() => {
    if (generating) {
      const selectedShotsList = shots.filter(s => selectedShots.has(s.id));
      setGenerationLogs(selectedShotsList.map(shot => ({
        shotNumber: shot.shot_number,
        status: 'pending',
        timestamp: new Date()
      })));
    }
  }, [generating]);

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

  const handleSettingsChange = (key: keyof GenerationSettings, value: number | boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveGenerationSettings(newSettings);
  };

  const handleGenerate = async () => {
    if (selectedShots.size === 0) return;

    setGenerating(true);
    setGenerationResult(null);

    try {
      const result = await generateImagesForStoryboard(
        storyboardId,
        Array.from(selectedShots),
        (prog, stat, shotNumber) => {
          setProgress(prog);
          setStatus(stat);

          if (shotNumber) {
            setGenerationLogs(prev => prev.map(log => {
              if (log.shotNumber === shotNumber) {
                const isSuccess = stat.toLowerCase().includes('completed successfully');
                const isFailed = stat.toLowerCase().includes('failed');
                const isGenerating = stat.toLowerCase().includes('generating');

                return {
                  ...log,
                  status: isSuccess ? 'success' : isFailed ? 'failed' : isGenerating ? 'generating' : log.status,
                  message: stat,
                  timestamp: new Date()
                };
              }
              return log;
            }));
          }
        },
        {
          delayBetweenShots: settings.delayBetweenRequests,
          onDetailedProgress: (info) => {
            setProgressInfo(info);
          }
        }
      );

      setGenerationResult(result);

      if (result.failCount === 0) {
        setTimeout(() => {
          onGenerationComplete();
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setStatus(error instanceof Error ? error.message : 'Failed to generate images');
    } finally {
      setGenerating(false);
    }
  };

  const estimatedCost = calculateEstimatedCost(selectedShots.size);
  const estimatedTime = Math.ceil(selectedShots.size * (15 + settings.delayBetweenRequests / 1000));

  const shotTypeGroups = filteredShots.reduce((acc, shot) => {
    const type = shot.shot_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(shot);
    return acc;
  }, {} as Record<string, StoryboardShot[]>);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

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

                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                      showSettings ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-amber-100 px-4 py-2 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-900">
                      ~{formatTime(estimatedTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">
                      Est. Cost: ${estimatedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {showSettings && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Generation Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Delay Between Shots</label>
                      <select
                        value={settings.delayBetweenRequests}
                        onChange={(e) => handleSettingsChange('delayBetweenRequests', parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={2000}>2 seconds (Fast)</option>
                        <option value={4000}>4 seconds (Recommended)</option>
                        <option value={6000}>6 seconds (Safe)</option>
                        <option value={10000}>10 seconds (Conservative)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Longer delays help avoid rate limits</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="autoRetry"
                        checked={settings.autoRetryOnRateLimit}
                        onChange={(e) => handleSettingsChange('autoRetryOnRateLimit', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="autoRetry" className="text-sm text-gray-700">
                        Auto-retry on rate limit errors
                      </label>
                    </div>
                  </div>
                </div>
              )}
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
                                  <span>-</span>
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
                    {' - '}
                    <span className="font-semibold text-gray-900">
                      ~{formatTime(estimatedTime)}
                    </span>
                    {' estimated'}
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
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                {generationResult ? (
                  generationResult.failCount === 0 ? (
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                  ) : (
                    <AlertCircle className="w-20 h-20 text-amber-500 mx-auto mb-4" />
                  )
                ) : (
                  <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                )}

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {generationResult ? 'Generation Complete' : 'Generating Images'}
                </h3>
                <p className="text-gray-600 mb-4">{status}</p>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      generationResult?.failCount ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-center gap-6 text-sm">
                  <span className="text-gray-600">{Math.round(progress)}% complete</span>
                  {progressInfo && !generationResult && (
                    <>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">
                        {progressInfo.currentIndex + 1} of {progressInfo.totalShots} shots
                      </span>
                      {progressInfo.estimatedTimeRemaining && (
                        <>
                          <span className="text-gray-400">|</span>
                          <span className="text-gray-600">
                            ~{formatTime(progressInfo.estimatedTimeRemaining)} remaining
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>

                {generationResult && (
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{generationResult.successCount} succeeded</span>
                    </div>
                    {generationResult.failCount > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-5 h-5" />
                        <span className="font-medium">{generationResult.failCount} failed</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-blue-600">
                      <DollarSign className="w-5 h-5" />
                      <span className="font-medium">${generationResult.totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg border border-gray-200">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition-colors rounded-lg"
                >
                  <span className="font-medium text-gray-900">Generation Log</span>
                  {showLogs ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </button>

                {showLogs && (
                  <div className="border-t border-gray-200 max-h-64 overflow-y-auto">
                    {generationLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`px-4 py-3 flex items-center gap-3 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        {log.status === 'pending' && (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                        )}
                        {log.status === 'generating' && (
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        {log.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {log.status === 'failed' && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}

                        <span className="font-medium text-gray-900">Shot #{log.shotNumber}</span>
                        <span className={`text-sm ${
                          log.status === 'success' ? 'text-green-600' :
                          log.status === 'failed' ? 'text-red-600' :
                          log.status === 'generating' ? 'text-blue-600' :
                          'text-gray-500'
                        }`}>
                          {log.status === 'pending' ? 'Waiting...' :
                           log.status === 'generating' ? 'Generating...' :
                           log.status === 'success' ? 'Completed' :
                           'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {generationResult && (
                <div className="mt-6 flex justify-center gap-3">
                  {generationResult.failCount > 0 && (
                    <button
                      onClick={() => {
                        setGenerating(false);
                        setGenerationResult(null);
                        setProgress(0);
                        setStatus('');
                      }}
                      className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                    >
                      Retry Failed Shots
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onGenerationComplete();
                      onClose();
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
