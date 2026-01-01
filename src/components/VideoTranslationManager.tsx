import React, { useState, useEffect } from 'react';
import { Globe, Play, Clock, CheckCircle, XCircle, AlertCircle, Loader, DollarSign } from 'lucide-react';
import { heygenVideoTranslationService, type VideoTranslationJob, type TargetLanguage } from '../services/heygenVideoTranslationService';
import { HEYGEN_SUPPORTED_LANGUAGES, heygenConfigService } from '../services/heygenConfigService';
import { videoLocalizationOrchestrator } from '../services/videoLocalizationOrchestrator';
import { useNotification } from '../contexts/NotificationContext';

interface VideoTranslationManagerProps {
  episodeId: string;
  organizationId: string;
  videoUrl?: string;
  sourceLanguageCode?: string;
  sourceLanguageName?: string;
  onTranslationComplete?: () => void;
}

export function VideoTranslationManager({
  episodeId,
  organizationId,
  videoUrl,
  sourceLanguageCode = 'en',
  sourceLanguageName = 'English',
  onTranslationComplete,
}: VideoTranslationManagerProps) {
  const [jobs, setJobs] = useState<VideoTranslationJob[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<TargetLanguage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [useProofread, setUseProofread] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadJobs();
  }, [episodeId]);

  useEffect(() => {
    if (selectedLanguages.length > 0) {
      const cost = heygenVideoTranslationService.estimateCost(5, selectedLanguages.length);
      setEstimatedCost(cost);
    } else {
      setEstimatedCost(0);
    }
  }, [selectedLanguages]);

  const loadJobs = async () => {
    try {
      const data = await heygenVideoTranslationService.getJobsByEpisode(episodeId);
      setJobs(data);
    } catch (error) {
      console.error('Failed to load translation jobs:', error);
    }
  };

  const handleLanguageToggle = (language: TargetLanguage) => {
    setSelectedLanguages(prev => {
      const exists = prev.find(l => l.code === language.code);
      if (exists) {
        return prev.filter(l => l.code !== language.code);
      } else {
        return [...prev, language];
      }
    });
  };

  const handleSubmitTranslation = async () => {
    if (!videoUrl) {
      showNotification('error', 'No video URL available for translation');
      return;
    }

    if (selectedLanguages.length === 0) {
      showNotification('error', 'Please select at least one target language');
      return;
    }

    setLoading(true);
    try {
      await videoLocalizationOrchestrator.translateVideo(
        episodeId,
        organizationId,
        videoUrl,
        { code: sourceLanguageCode, name: sourceLanguageName },
        selectedLanguages,
        useProofread
      );

      showNotification('success', 'Video translation job submitted successfully');
      setSelectedLanguages([]);
      await loadJobs();
      onTranslationComplete?.();
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to submit translation');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
      case 'queued':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const filteredLanguages = searchQuery
    ? heygenConfigService.searchLanguages(searchQuery)
    : heygenConfigService.getMostPopularLanguages();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Video Translation
          </h3>
          {!videoUrl && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              No video available
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Language
            </label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900">
              {sourceLanguageName} ({sourceLanguageCode})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Languages
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by language name or code..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Languages ({selectedLanguages.length} selected)
            </label>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
              <div className="grid grid-cols-2 gap-2">
                {filteredLanguages.map(language => (
                  <label
                    key={language.code}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLanguages.some(l => l.code === language.code)}
                      onChange={() => handleLanguageToggle(language)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{language.name}</span>
                    <span className="text-xs text-gray-500">({language.code})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useProofread"
              checked={useProofread}
              onChange={(e) => setUseProofread(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="useProofread" className="text-sm text-gray-700">
              Enable proofread workflow (review captions before final video)
            </label>
          </div>

          {estimatedCost > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-900">
                Estimated cost: ${estimatedCost.toFixed(2)} USD
              </span>
            </div>
          )}

          <button
            onClick={handleSubmitTranslation}
            disabled={loading || !videoUrl || selectedLanguages.length === 0}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Submitting Translation...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Translation
              </>
            )}
          </button>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Translation Jobs</h3>
          <div className="space-y-3">
            {jobs.map(job => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {job.targetLanguages.length} languages
                    </div>
                    <div className="text-xs text-gray-500">
                      {job.targetLanguages.map(l => l.name).join(', ')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{job.status}</div>
                  {job.status === 'processing' && (
                    <div className="text-xs text-gray-500">{job.progressPercentage}%</div>
                  )}
                  {job.actualCostUsd > 0 && (
                    <div className="text-xs text-gray-500">${job.actualCostUsd.toFixed(2)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
