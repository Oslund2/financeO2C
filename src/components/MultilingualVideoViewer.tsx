import React, { useState, useEffect } from 'react';
import { Globe, Download, Play, Eye, CheckCircle, Clock } from 'lucide-react';
import { heygenVideoTranslationService, type TranslationOutput } from '../services/heygenVideoTranslationService';
import { videoLocalizationOrchestrator } from '../services/videoLocalizationOrchestrator';
import { useNotification } from '../contexts/NotificationContext';

interface MultilingualVideoViewerProps {
  episodeId: string;
  episodeTitle: string;
  sourceVideoUrl?: string;
  sourceLanguageCode?: string;
  sourceLanguageName?: string;
}

export function MultilingualVideoViewer({
  episodeId,
  episodeTitle,
  sourceVideoUrl,
  sourceLanguageCode = 'en',
  sourceLanguageName = 'English',
}: MultilingualVideoViewerProps) {
  const [translations, setTranslations] = useState<TranslationOutput[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadTranslations();
  }, [episodeId]);

  const loadTranslations = async () => {
    setLoading(true);
    try {
      const jobs = await heygenVideoTranslationService.getJobsByEpisode(episodeId);

      const allTranslations: TranslationOutput[] = [];
      for (const job of jobs) {
        if (job.status === 'completed') {
          const outputs = await heygenVideoTranslationService.getTranslationOutputs(job.id);
          allTranslations.push(...outputs);
        }
      }

      setTranslations(allTranslations.filter(t => t.status === 'completed'));

      if (allTranslations.length > 0 && !selectedLanguage) {
        setSelectedLanguage(allTranslations[0].targetLanguageCode);
        setSelectedVideo(allTranslations[0].translatedVideoUrl || null);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    const translation = translations.find(t => t.targetLanguageCode === languageCode);
    setSelectedVideo(translation?.translatedVideoUrl || null);
  };

  const handleDownload = async (languageCode: string) => {
    try {
      const packageData = await videoLocalizationOrchestrator.exportLanguagePackage(
        episodeId,
        languageCode
      );

      if (packageData.videoUrl) {
        const link = document.createElement('a');
        link.href = packageData.videoUrl;
        link.download = `${episodeTitle}_${languageCode}.mp4`;
        link.click();
        showNotification('success', 'Download started');
      } else {
        showNotification('error', 'Video not available for download');
      }
    } catch (error) {
      showNotification('error', 'Failed to download video');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (translations.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">No translations available yet</p>
        <p className="text-sm text-gray-500">
          Use the Video Translation Manager to create translations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Multilingual Versions
          </h3>
          <span className="text-sm text-gray-500">
            {translations.length} language{translations.length !== 1 ? 's' : ''} available
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            {sourceVideoUrl && (
              <button
                onClick={() => {
                  setSelectedLanguage(null);
                  setSelectedVideo(sourceVideoUrl);
                }}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedLanguage === null
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-gray-900">{sourceLanguageName}</span>
                </div>
                <span className="text-xs text-gray-500">Original · {sourceLanguageCode}</span>
              </button>
            )}

            {translations.map(translation => (
              <button
                key={translation.id}
                onClick={() => handleLanguageSelect(translation.targetLanguageCode)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedLanguage === translation.targetLanguageCode
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {translation.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">
                      {translation.targetLanguageName}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(translation.targetLanguageCode);
                    }}
                    className="p-1 hover:bg-white rounded transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{translation.targetLanguageCode}</span>
                  {translation.qualityStatus === 'approved' && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      Approved
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedVideo ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  key={selectedVideo}
                  controls
                  className="w-full h-full"
                  src={selectedVideo}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Select a language to view video</p>
                </div>
              </div>
            )}

            {selectedLanguage && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      Currently viewing: {
                        translations.find(t => t.targetLanguageCode === selectedLanguage)?.targetLanguageName
                      }
                    </h4>
                    <p className="text-sm text-gray-600">
                      This video has been automatically translated with AI-powered lip sync and voice cloning
                      to maintain the original speaker's tone and style.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About Video Translation</h4>
        <p className="text-sm text-blue-800">
          These videos have been translated using HeyGen's AI technology, which preserves the
          original speaker's voice characteristics, maintains natural lip sync, and provides
          accurate translations in {translations.length} languages. Each translation is
          optimized for the target language's cultural context.
        </p>
      </div>
    </div>
  );
}
