import { useState, useEffect } from 'react';
import { Globe, Loader2, CheckCircle, XCircle, Languages } from 'lucide-react';
import { ScriptTranslationService, type ScriptTranslationStatus } from '../services/scriptTranslationService';
import { TranslatedScriptCard } from './TranslatedScriptCard';

interface Language {
  code: string;
  name: string;
  enabled: boolean;
}

interface ScriptTranslationManagerProps {
  scriptId: string;
  scriptTitle: string;
}

export function ScriptTranslationManager({ scriptId, scriptTitle }: ScriptTranslationManagerProps) {
  const [enableMultiLanguage, setEnableMultiLanguage] = useState(false);
  const [showTranslationCard, setShowTranslationCard] = useState(false);
  const [translationStatuses, setTranslationStatuses] = useState<Map<string, ScriptTranslationStatus>>(new Map());
  const [translating, setTranslating] = useState<Set<string>>(new Set());

  const [languages, setLanguages] = useState<Language[]>([
    { code: 'en', name: 'English', enabled: true },
    { code: 'es', name: 'Spanish (Español)', enabled: false },
    { code: 'zh', name: 'Mandarin Chinese (中文)', enabled: false },
    { code: 'hi', name: 'Hindi (हिन्दी)', enabled: false },
    { code: 'ar', name: 'Arabic (العربية)', enabled: false },
    { code: 'pt', name: 'Portuguese (Português)', enabled: false },
    { code: 'bn', name: 'Bengali (বাংলা)', enabled: false },
    { code: 'fr', name: 'French (Français)', enabled: false },
    { code: 'ru', name: 'Russian (Русский)', enabled: false },
    { code: 'ja', name: 'Japanese (日本語)', enabled: false }
  ]);

  useEffect(() => {
    loadTranslationStatuses();
  }, [scriptId]);

  useEffect(() => {
    // Poll for status updates every 2 seconds if there are any in-progress translations
    const hasInProgress = Array.from(translationStatuses.values()).some(
      status => status.status === 'in_progress'
    ) || translating.size > 0;

    if (!hasInProgress) return;

    const interval = setInterval(() => {
      loadTranslationStatuses();
    }, 2000);

    return () => clearInterval(interval);
  }, [translationStatuses, translating, scriptId]);

  const loadTranslationStatuses = async () => {
    const statuses = new Map<string, ScriptTranslationStatus>();
    for (const lang of languages) {
      if (lang.code !== 'en') {
        const status = await ScriptTranslationService.getTranslationStatus(scriptId, lang.code);
        if (status) {
          statuses.set(lang.code, status);
        }
      }
    }
    setTranslationStatuses(statuses);
  };

  const toggleLanguage = (code: string) => {
    if (code === 'en') return;
    setLanguages(langs =>
      langs.map(l => l.code === code ? { ...l, enabled: !l.enabled } : l)
    );
  };

  const handleTranslateScript = async (languageCode: string, languageName: string) => {
    setTranslating(prev => new Set(prev).add(languageCode));

    try {
      const result = await ScriptTranslationService.translateScript(
        scriptId,
        languageCode,
        languageName,
        (progress) => {
          console.log(`Translation progress: ${progress.percentage}%`);
        }
      );

      if (result.success) {
        await loadTranslationStatuses();
      } else {
        await loadTranslationStatuses();
        alert(`Translation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Translation error:', error);
      await loadTranslationStatuses();
      alert(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTranslating(prev => {
        const next = new Set(prev);
        next.delete(languageCode);
        return next;
      });
    }
  };

  const getTranslationButton = (language: Language) => {
    if (language.code === 'en' || !language.enabled) return null;

    const status = translationStatuses.get(language.code);
    const isTranslating = translating.has(language.code);

    if (isTranslating || status?.status === 'in_progress') {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Translating... {status?.progress || 0}%</span>
        </div>
      );
    }

    if (status?.status === 'completed') {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs">
            <CheckCircle className="w-3 h-3" />
            <span>Translated</span>
          </div>
          <button
            onClick={() => handleTranslateScript(language.code, language.name)}
            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs"
          >
            Re-translate
          </button>
        </div>
      );
    }

    if (status?.status === 'failed') {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs">
              <XCircle className="w-3 h-3" />
              <span>Failed</span>
            </div>
            <button
              onClick={() => handleTranslateScript(language.code, language.name)}
              className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs"
            >
              Retry
            </button>
          </div>
          {status.errorMessage && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {status.errorMessage}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={() => handleTranslateScript(language.code, language.name)}
        className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-md transition-all text-xs font-medium"
      >
        <Languages className="w-3 h-3" />
        Convert Script
      </button>
    );
  };

  const enabledLanguages = languages.filter(l => l.enabled);
  const completedTranslations = Array.from(translationStatuses.entries())
    .filter(([_, status]) => status.status === 'completed')
    .map(([code, _]) => {
      const lang = languages.find(l => l.code === code);
      return lang ? { code: lang.code, name: lang.name } : null;
    })
    .filter(Boolean) as Array<{ code: string; name: string }>;

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-700" />
            <h4 className="text-lg font-bold text-gray-900">Script Language Versions</h4>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableMultiLanguage}
              onChange={(e) => setEnableMultiLanguage(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable Multi-Language</span>
          </label>
        </div>

        {enableMultiLanguage && (
          <div className="mb-4">
            <button
              onClick={() => {
                if (completedTranslations.length === 0) {
                  alert('No translations available yet. Please translate the script to at least one language first.');
                  return;
                }
                setShowTranslationCard(!showTranslationCard);
              }}
              disabled={completedTranslations.length === 0}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                completedTranslations.length > 0
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Globe className="w-4 h-4" />
              {showTranslationCard ? 'Hide' : 'View'} Translated Scripts
              {completedTranslations.length > 0 && ` (${completedTranslations.length})`}
            </button>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {languages.map((language) => (
            <div
              key={language.code}
              className={`border-2 rounded-lg p-3 transition-all ${
                language.enabled
                  ? 'border-green-200 bg-green-50'
                  : enableMultiLanguage && !language.code.startsWith('en')
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 bg-gray-50 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={language.enabled}
                    onChange={() => toggleLanguage(language.code)}
                    disabled={language.code === 'en' || !enableMultiLanguage}
                    className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                      {language.name}
                      {language.code === 'en' && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Default</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ml-3">
                  {getTranslationButton(language)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {enableMultiLanguage && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Enabled Languages:</span>
              <span className="font-bold text-green-600">{enabledLanguages.length}</span>
            </div>
          </div>
        )}
      </div>

      {showTranslationCard && completedTranslations.length > 0 && (
        <TranslatedScriptCard
          scriptId={scriptId}
          scriptTitle={scriptTitle}
          availableLanguages={completedTranslations}
          onClose={() => setShowTranslationCard(false)}
        />
      )}
    </div>
  );
}
