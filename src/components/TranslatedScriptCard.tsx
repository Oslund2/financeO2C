import { useState, useEffect } from 'react';
import { Globe, FileText, X, Loader2, ChevronDown, ChevronRight, Trash2, RefreshCw, Download, Search, Eye, FileDown, Maximize2, BarChart2 } from 'lucide-react';
import { ScriptTranslationService } from '../services/scriptTranslationService';
import { TranslationExportService, type ExportFormat } from '../services/translationExportService';

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
  const [viewMode, setViewMode] = useState<'tabs' | 'fullscreen'>('tabs');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStats, setExportStats] = useState<any>(null);

  useEffect(() => {
    loadTranslations();
  }, [scriptId]);

  useEffect(() => {
    if (selectedLanguage) {
      loadTranslatedContent(selectedLanguage);
      loadExportStats();
    }
  }, [selectedLanguage]);

  const loadExportStats = async () => {
    const translation = translations.find(t => t.language_code === selectedLanguage);
    if (translation) {
      const stats = await TranslationExportService.getExportStats(translation.id);
      setExportStats(stats);

      // Track view
      await TranslationExportService.trackView(translation.id);
    }
  };

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

  const handleExport = async (format: ExportFormat) => {
    if (!selectedLanguage) return;

    setExporting(true);
    setShowExportMenu(false);

    try {
      const blob = await TranslationExportService.exportTranslation(scriptId, selectedLanguage, format, {
        includeSynopsis: true,
        includeStageDirections: true,
        includeSceneNumbers: true
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scriptTitle}_${selectedLanguage}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await loadExportStats();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async (format: ExportFormat) => {
    setExporting(true);
    setShowExportMenu(false);

    try {
      const { files } = await TranslationExportService.exportAllTranslations(scriptId, format);

      files.forEach(({ name, blob }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      alert(`Successfully exported ${files.length} translation(s)!`);
    } catch (error) {
      console.error('Export all failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const filterContent = (content: { acts: Act[] } | null, search: string) => {
    if (!content || !search) return content;

    const filtered = {
      acts: content.acts.map(act => ({
        ...act,
        scenes: act.scenes.filter(scene => {
          const searchLower = search.toLowerCase();
          return (
            scene.setting.toLowerCase().includes(searchLower) ||
            scene.description.toLowerCase().includes(searchLower) ||
            (Array.isArray(scene.dialogue) && scene.dialogue.some((line: any) => {
              const dialogueText = line.text || line.line || '';
              return dialogueText.toLowerCase().includes(searchLower) ||
                     line.character?.toLowerCase().includes(searchLower);
            }))
          );
        })
      })).filter(act => act.scenes.length > 0)
    };

    return filtered;
  };

  const selectedTranslation = translations.find(t => t.language_code === selectedLanguage);
  const completedTranslations = translations.filter(t => t.status === 'completed');
  const filteredContent = filterContent(translatedContent, searchTerm);

  return (
    <div className={`bg-white border-2 border-gray-200 rounded-xl p-6 ${viewMode === 'fullscreen' ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <Globe className="w-6 h-6 text-blue-600" />
          <div>
            <h4 className="text-xl font-bold text-gray-900">Translated Scripts</h4>
            <p className="text-xs text-gray-500 mt-0.5">{completedTranslations.length} translation(s) available</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'fullscreen' ? 'tabs' : 'fullscreen')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={viewMode === 'fullscreen' ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {completedTranslations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium">No translations available yet</p>
          <p className="text-xs mt-1">Enable languages and click "Convert Script" to translate</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Language Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {completedTranslations.map((translation) => (
              <button
                key={translation.language_code}
                onClick={() => setSelectedLanguage(translation.language_code)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                  selectedLanguage === translation.language_code
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {translation.language_name}
              </button>
            ))}
          </div>

          {selectedTranslation && (
            <div className="space-y-4">
              {/* Header with title and actions */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h5 className="font-bold text-gray-900 text-lg">{selectedTranslation.translated_title}</h5>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteTranslation(selectedTranslation.language_code)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete translation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats and Actions Bar */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-blue-200">
                  {exportStats && (
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{exportStats.viewCount} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>{exportStats.downloadCount} downloads</span>
                      </div>
                    </div>
                  )}

                  <div className="flex-1"></div>

                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      disabled={exporting}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {exporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FileDown className="w-4 h-4" />
                          Export
                        </>
                      )}
                    </button>

                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-10">
                        <div className="p-2">
                          <div className="text-xs font-semibold text-gray-500 px-3 py-2">Current Language</div>
                          <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">PDF Document</button>
                          <button onClick={() => handleExport('txt')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">Plain Text</button>
                          <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">JSON Data</button>
                          <button onClick={() => handleExport('csv')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">CSV (Dialogue)</button>
                          <button onClick={() => handleExport('srt')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">SRT Subtitles</button>
                          <button onClick={() => handleExport('vtt')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">VTT Subtitles</button>

                          <div className="border-t border-gray-200 my-2"></div>
                          <div className="text-xs font-semibold text-gray-500 px-3 py-2">All Languages</div>
                          <button onClick={() => handleExportAll('pdf')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">Export All as PDF</button>
                          <button onClick={() => handleExportAll('txt')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">Export All as TXT</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search dialogue, scenes, or descriptions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="ml-2 text-sm text-gray-600">Loading translated content...</span>
                </div>
              ) : filteredContent && filteredContent.acts && filteredContent.acts.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {searchTerm && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-900">
                      Found {filteredContent.acts.reduce((sum, act) => sum + act.scenes.length, 0)} scene(s) matching "{searchTerm}"
                    </div>
                  )}
                  {filteredContent.acts.map((act: Act) => {
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
                                          <span className="text-gray-700">{line.text || line.line}</span>
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
              ) : searchTerm ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium">No results found</p>
                  <p className="text-xs mt-1">Try different search terms</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium">No content available</p>
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
