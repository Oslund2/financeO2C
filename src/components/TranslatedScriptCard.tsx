import { useState, useEffect } from 'react';
import { Globe, FileText, X, Loader2, ChevronDown, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import { ScriptTranslationService } from '../services/scriptTranslationService';

interface TranslatedScriptCardProps {
  scriptId: string;
  scriptTitle: string;
  availableLanguages: Array<{ code: string; name: string }>;
  onClose: () => void;
}

interface Translation {
  id: string;
  language_code: string;
  language_name: string;
  translated_title: string;
  translated_synopsis: string | null;
  translated_theme: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress_percentage: number;
  error_message: string | null;
}

interface Act {
  id: string;
  act_number: number;
  content: string;
  notes: string;
  duration_estimate: number;
  scenes: Scene[];
}

interface Scene {
  id: string;
  scene_number: number;
  setting: string;
  description: string;
  dialogue: any;
  stage_directions: string;
  duration_estimate: number;
  characters: string[];
}

export function TranslatedScriptCard({ scriptId, scriptTitle, availableLanguages, onClose }: TranslatedScriptCardProps) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [translatedContent, setTranslatedContent] = useState<{ acts: Act[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTranslations();
  }, [scriptId]);

  useEffect(() => {
    if (selectedLanguage) {
      loadTranslatedContent(selectedLanguage);
    }
  }, [selectedLanguage]);

  const loadTranslations = async () => {
    const allTranslations = await ScriptTranslationService.getAllTranslations(scriptId);
    setTranslations(allTranslations);

    const completedTranslation = allTranslations.find(t => t.status === 'completed');
    if (completedTranslation && !selectedLanguage) {
      setSelectedLanguage(completedTranslation.language_code);
    }
  };

  const loadTranslatedContent = async (languageCode: string) => {
    setLoading(true);
    const content = await ScriptTranslationService.getTranslatedScript(scriptId, languageCode);
    setTranslatedContent(content);
    setLoading(false);
  };

  const handleDeleteTranslation = async (languageCode: string) => {
    if (!confirm('Are you sure you want to delete this translation?')) return;

    await ScriptTranslationService.deleteTranslation(scriptId, languageCode);
    await loadTranslations();

    if (selectedLanguage === languageCode) {
      setSelectedLanguage(null);
      setTranslatedContent(null);
    }
  };

  const toggleAct = (actId: string) => {
    const newExpanded = new Set(expandedActs);
    if (newExpanded.has(actId)) {
      newExpanded.delete(actId);
    } else {
      newExpanded.add(actId);
    }
    setExpandedActs(newExpanded);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const selectedTranslation = translations.find(t => t.language_code === selectedLanguage);
  const completedTranslations = translations.filter(t => t.status === 'completed');

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Globe className="w-5 h-5 text-blue-600" />
          <h4 className="text-lg font-bold text-gray-900">Translated Scripts</h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {completedTranslations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium">No translations available yet</p>
          <p className="text-xs mt-1">Enable languages and click "Convert Script" to translate</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Select Language:</label>
            <select
              value={selectedLanguage || ''}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a language...</option>
              {completedTranslations.map((translation) => (
                <option key={translation.language_code} value={translation.language_code}>
                  {translation.language_name}
                </option>
              ))}
            </select>
          </div>

          {selectedTranslation && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h5 className="font-bold text-gray-900">{selectedTranslation.translated_title}</h5>
                    </div>
                    {selectedTranslation.translated_synopsis && (
                      <p className="text-sm text-gray-700 mb-2">{selectedTranslation.translated_synopsis}</p>
                    )}
                    {selectedTranslation.translated_theme && (
                      <div className="text-xs text-gray-600">
                        <strong>Theme:</strong> {selectedTranslation.translated_theme}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTranslation(selectedTranslation.language_code)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete translation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="ml-2 text-sm text-gray-600">Loading translated content...</span>
                </div>
              ) : translatedContent && translatedContent.acts ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {translatedContent.acts.map((act: Act) => {
                    const isExpanded = expandedActs.has(act.id);
                    return (
                      <div key={act.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleAct(act.id)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                            <span className="font-medium text-gray-900">Act {act.act_number}</span>
                            <span className="text-xs text-gray-500">
                              ({act.scenes.length} scenes, {formatDuration(act.duration_estimate)})
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 space-y-3 bg-white">
                            {act.content && (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">{act.content}</div>
                            )}

                            {act.notes && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                <div className="text-xs font-medium text-yellow-900 mb-1">Notes:</div>
                                <div className="text-xs text-yellow-800">{act.notes}</div>
                              </div>
                            )}

                            <div className="space-y-2">
                              {act.scenes.map((scene: Scene) => (
                                <div key={scene.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-gray-700">Scene {scene.scene_number}</span>
                                    <span className="text-xs text-gray-500">{scene.setting}</span>
                                  </div>

                                  {scene.description && (
                                    <p className="text-xs text-gray-700 mb-2 italic">{scene.description}</p>
                                  )}

                                  {scene.dialogue && Array.isArray(scene.dialogue) && scene.dialogue.length > 0 && (
                                    <div className="space-y-1 mb-2">
                                      {scene.dialogue.map((line: any, idx: number) => (
                                        <div key={idx} className="text-xs">
                                          <strong className="text-gray-900">{line.character}:</strong>{' '}
                                          <span className="text-gray-700">{line.text}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {scene.stage_directions && (
                                    <div className="text-xs text-gray-600 italic">
                                      [{scene.stage_directions}]
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No content available</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {translations.some(t => t.status === 'in_progress') && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">Translations in progress...</span>
          </div>
          {translations
            .filter(t => t.status === 'in_progress')
            .map(t => (
              <div key={t.language_code} className="text-xs text-blue-800 ml-6">
                {t.language_name}: {t.progress_percentage}%
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
