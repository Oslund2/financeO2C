import { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  X,
  CheckCircle2,
  XCircle,
  DollarSign,
  Info,
  Filter
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  scanCharactersForCopyright,
  scanScriptsForCopyright,
  executeBulkRegistration,
  checkExistingRegistrations,
  calculateBulkRegistrationFees,
  type CharacterForCopyright,
  type ScriptForCopyright,
  type BulkRegistrationConfig,
  type BulkRegistrationProgress,
  type BulkRegistrationResult
} from '../services/bulkCopyrightRegistrationService';
import { supabase } from '../lib/supabase';

interface BulkCopyrightWizardProps {
  onClose: () => void;
  onComplete: (result: BulkRegistrationResult) => void;
}

type WizardStep = 'source' | 'selection' | 'author' | 'ai-disclosure' | 'review';

interface Series {
  id: string;
  name: string;
}

export function BulkCopyrightWizard({ onClose, onComplete }: BulkCopyrightWizardProps) {
  const { currentOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState<WizardStep>('source');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceTypes, setSourceTypes] = useState<{ characters: boolean; scripts: boolean }>({
    characters: true,
    scripts: true
  });
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [series, setSeries] = useState<Series[]>([]);

  const [characters, setCharacters] = useState<CharacterForCopyright[]>([]);
  const [scripts, setScripts] = useState<ScriptForCopyright[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [selectedScripts, setSelectedScripts] = useState<Set<string>>(new Set());
  const [existingRegistrations, setExistingRegistrations] = useState<Map<string, string>>(new Map());
  const [filterAIOnly, setFilterAIOnly] = useState(false);

  const [config, setConfig] = useState<BulkRegistrationConfig>({
    authorName: '',
    authorCitizenship: 'United States',
    authorDomicile: 'United States',
    aiToolsUsed: ['Google Gemini'],
    defaultAiContributionPercentage: 30,
    humanAuthorshipStatement: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkRegistrationProgress | null>(null);
  const [result, setResult] = useState<BulkRegistrationResult | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      loadSeries();
    }
  }, [currentOrganization]);

  const loadSeries = async () => {
    if (!currentOrganization) return;

    const { data } = await supabase
      .from('series')
      .select('id, name')
      .eq('organization_id', currentOrganization.id)
      .order('name');

    setSeries(data || []);
  };

  const loadAssets = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    setError(null);

    try {
      const [chars, scrs] = await Promise.all([
        sourceTypes.characters
          ? scanCharactersForCopyright(currentOrganization.id, selectedSeriesId)
          : Promise.resolve([]),
        sourceTypes.scripts
          ? scanScriptsForCopyright(currentOrganization.id, selectedSeriesId)
          : Promise.resolve([])
      ]);

      setCharacters(chars);
      setScripts(scrs);

      const allItems = [
        ...chars.map(c => ({ type: 'character' as const, id: c.id, sourceId: c.id })),
        ...scrs.map(s => ({ type: 'script' as const, id: s.id, sourceId: s.id }))
      ];

      if (allItems.length > 0) {
        const existing = await checkExistingRegistrations(
          currentOrganization.id,
          allItems.map(i => ({
            type: i.type,
            id: i.id,
            title: '',
            description: '',
            isAIGenerated: false,
            sourceId: i.sourceId,
            createdAt: ''
          }))
        );
        setExistingRegistrations(existing);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    switch (currentStep) {
      case 'source':
        await loadAssets();
        setCurrentStep('selection');
        break;
      case 'selection':
        setCurrentStep('author');
        break;
      case 'author':
        setCurrentStep('ai-disclosure');
        break;
      case 'ai-disclosure':
        setCurrentStep('review');
        break;
      case 'review':
        await executeRegistration();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'selection':
        setCurrentStep('source');
        break;
      case 'author':
        setCurrentStep('selection');
        break;
      case 'ai-disclosure':
        setCurrentStep('author');
        break;
      case 'review':
        setCurrentStep('ai-disclosure');
        break;
    }
  };

  const executeRegistration = async () => {
    if (!currentOrganization) return;

    setIsProcessing(true);
    setError(null);

    try {
      const selectedChars = characters.filter(c => selectedCharacters.has(c.id));
      const selectedScrs = scripts.filter(s => selectedScripts.has(s.id));

      const registrationResult = await executeBulkRegistration(
        currentOrganization.id,
        selectedChars,
        selectedScrs,
        config,
        (prog) => setProgress(prog)
      );

      setResult(registrationResult);
      onComplete(registrationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCharacter = (id: string) => {
    const newSelected = new Set(selectedCharacters);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCharacters(newSelected);
  };

  const toggleScript = (id: string) => {
    const newSelected = new Set(selectedScripts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedScripts(newSelected);
  };

  const selectAll = () => {
    const filteredChars = filterAIOnly
      ? characters.filter(c => c.ai_generated)
      : characters;
    const filteredScrs = filterAIOnly
      ? scripts.filter(s => s.ai_generated)
      : scripts;

    setSelectedCharacters(new Set(
      filteredChars
        .filter(c => !existingRegistrations.has(`character:${c.id}`))
        .map(c => c.id)
    ));
    setSelectedScripts(new Set(
      filteredScrs
        .filter(s => !existingRegistrations.has(`script:${s.id}`))
        .map(s => s.id)
    ));
  };

  const selectNone = () => {
    setSelectedCharacters(new Set());
    setSelectedScripts(new Set());
  };

  const totalSelected = selectedCharacters.size + selectedScripts.size;
  const aiSelectedCount =
    characters.filter(c => selectedCharacters.has(c.id) && c.ai_generated).length +
    scripts.filter(s => selectedScripts.has(s.id) && s.ai_generated).length;

  const feeEstimate = calculateBulkRegistrationFees(totalSelected, totalSelected > 5);

  const canProceed = () => {
    switch (currentStep) {
      case 'source':
        return sourceTypes.characters || sourceTypes.scripts;
      case 'selection':
        return totalSelected > 0;
      case 'author':
        return config.authorName.trim().length > 0;
      case 'ai-disclosure':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'source', label: 'Source' },
    { key: 'selection', label: 'Selection' },
    { key: 'author', label: 'Author' },
    { key: 'ai-disclosure', label: 'AI Disclosure' },
    { key: 'review', label: 'Review' }
  ];

  const getStepIndex = (step: WizardStep) => steps.findIndex(s => s.key === step);

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl max-w-lg w-full p-6">
          <div className="text-center mb-6">
            {result.success ? (
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            )}
            <h2 className="text-xl font-bold text-white">
              {result.success ? 'Registration Complete' : 'Registration Completed with Errors'}
            </h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Processed</span>
              <span className="text-white font-medium">{result.totalProcessed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Successful</span>
              <span className="text-green-400 font-medium">{result.successCount}</span>
            </div>
            {result.failureCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Failed</span>
                <span className="text-red-400 font-medium">{result.failureCount}</span>
              </div>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 max-h-40 overflow-y-auto">
              <p className="text-red-400 font-medium text-sm mb-2">Errors:</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-red-300 text-xs">
                  {err.item}: {err.error}
                </p>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl max-w-lg w-full p-6">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Processing Registrations</h2>
            {progress && (
              <>
                <p className="text-gray-400 text-sm mb-4">{progress.currentItem}</p>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-gray-400 text-xs">
                  {progress.completed} of {progress.total} completed
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-400" />
              Bulk Copyright Registration
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                    getStepIndex(currentStep) === i
                      ? 'bg-blue-600 text-white'
                      : getStepIndex(currentStep) > i
                        ? 'bg-green-600/20 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {getStepIndex(currentStep) > i ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="w-4 h-4 flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-600 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {currentStep === 'source' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Select Source Types</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                      sourceTypes.characters
                        ? 'bg-blue-600/10 border-blue-500'
                        : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sourceTypes.characters}
                      onChange={(e) =>
                        setSourceTypes({ ...sourceTypes, characters: e.target.checked })
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        sourceTypes.characters ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Characters</p>
                      <p className="text-gray-400 text-sm">Visual art registrations</p>
                    </div>
                    {sourceTypes.characters && (
                      <Check className="w-5 h-5 text-blue-400 ml-auto" />
                    )}
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                      sourceTypes.scripts
                        ? 'bg-blue-600/10 border-blue-500'
                        : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sourceTypes.scripts}
                      onChange={(e) =>
                        setSourceTypes({ ...sourceTypes, scripts: e.target.checked })
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        sourceTypes.scripts ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Scripts</p>
                      <p className="text-gray-400 text-sm">Dramatic work registrations</p>
                    </div>
                    {sourceTypes.scripts && (
                      <Check className="w-5 h-5 text-blue-400 ml-auto" />
                    )}
                  </label>
                </div>
              </div>

              {series.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Filter by Series (Optional)</h3>
                  <select
                    value={selectedSeriesId || ''}
                    onChange={(e) => setSelectedSeriesId(e.target.value || null)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Series</option>
                    {series.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {currentStep === 'selection' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Select Items to Register</h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={filterAIOnly}
                      onChange={(e) => setFilterAIOnly(e.target.checked)}
                      className="rounded bg-gray-700 border-gray-600"
                    />
                    <Filter className="w-4 h-4" />
                    AI-generated only
                  </label>
                  <button
                    onClick={selectAll}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Select All
                  </button>
                  <button
                    onClick={selectNone}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {sourceTypes.characters && characters.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Characters ({characters.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {characters
                          .filter((c) => !filterAIOnly || c.ai_generated)
                          .map((char) => {
                            const isRegistered = existingRegistrations.has(
                              `character:${char.id}`
                            );
                            return (
                              <label
                                key={char.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isRegistered
                                    ? 'bg-gray-700/30 border-gray-700 opacity-50 cursor-not-allowed'
                                    : selectedCharacters.has(char.id)
                                      ? 'bg-blue-600/10 border-blue-500'
                                      : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCharacters.has(char.id)}
                                  onChange={() => !isRegistered && toggleCharacter(char.id)}
                                  disabled={isRegistered}
                                  className="rounded bg-gray-700 border-gray-600"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">
                                    {char.name}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs">
                                    {char.series_name && (
                                      <span className="text-gray-400">{char.series_name}</span>
                                    )}
                                    {char.ai_generated && (
                                      <span className="px-1.5 py-0.5 bg-purple-600/20 text-purple-400 rounded">
                                        AI
                                      </span>
                                    )}
                                    {isRegistered && (
                                      <span className="px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded">
                                        Registered
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {sourceTypes.scripts && scripts.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Scripts ({scripts.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {scripts
                          .filter((s) => !filterAIOnly || s.ai_generated)
                          .map((script) => {
                            const isRegistered = existingRegistrations.has(
                              `script:${script.id}`
                            );
                            return (
                              <label
                                key={script.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isRegistered
                                    ? 'bg-gray-700/30 border-gray-700 opacity-50 cursor-not-allowed'
                                    : selectedScripts.has(script.id)
                                      ? 'bg-blue-600/10 border-blue-500'
                                      : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedScripts.has(script.id)}
                                  onChange={() => !isRegistered && toggleScript(script.id)}
                                  disabled={isRegistered}
                                  className="rounded bg-gray-700 border-gray-600"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">
                                    {script.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs">
                                    {script.series_name && (
                                      <span className="text-gray-400">{script.series_name}</span>
                                    )}
                                    {script.episode_number && (
                                      <span className="text-gray-400">
                                        Ep. {script.episode_number}
                                      </span>
                                    )}
                                    {script.ai_generated && (
                                      <span className="px-1.5 py-0.5 bg-purple-600/20 text-purple-400 rounded">
                                        AI
                                      </span>
                                    )}
                                    {isRegistered && (
                                      <span className="px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded">
                                        Registered
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {characters.length === 0 && scripts.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No assets found matching your criteria</p>
                    </div>
                  )}
                </div>
              )}

              {totalSelected > 0 && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    <strong>{totalSelected}</strong> items selected
                    {aiSelectedCount > 0 && (
                      <span className="text-purple-400 ml-2">
                        ({aiSelectedCount} AI-generated)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 'author' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Author Information</h3>
              <p className="text-gray-400 text-sm">
                This information will be applied to all selected registrations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Author Name *
                  </label>
                  <input
                    type="text"
                    value={config.authorName}
                    onChange={(e) => setConfig({ ...config, authorName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter author name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Citizenship
                  </label>
                  <input
                    type="text"
                    value={config.authorCitizenship || ''}
                    onChange={(e) =>
                      setConfig({ ...config, authorCitizenship: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., United States"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Domicile
                  </label>
                  <input
                    type="text"
                    value={config.authorDomicile || ''}
                    onChange={(e) => setConfig({ ...config, authorDomicile: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., United States"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Birth Year
                  </label>
                  <input
                    type="number"
                    value={config.authorBirthYear || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        authorBirthYear: e.target.value ? parseInt(e.target.value) : undefined
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 1985"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Claimant Name
                  </label>
                  <input
                    type="text"
                    value={config.claimantName || ''}
                    onChange={(e) => setConfig({ ...config, claimantName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="If different from author"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 'ai-disclosure' && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-purple-300 font-medium">AI Content Disclosure</p>
                  <p className="text-purple-200/70 text-sm mt-1">
                    {aiSelectedCount} of your selected items contain AI-generated content. The
                    Copyright Office requires disclosure of AI involvement.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI Tools Used
                </label>
                <input
                  type="text"
                  value={config.aiToolsUsed?.join(', ') || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      aiToolsUsed: e.target.value.split(',').map((s) => s.trim())
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Google Gemini, DALL-E"
                />
                <p className="text-gray-500 text-xs mt-1">Separate multiple tools with commas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default AI Contribution Percentage
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.defaultAiContributionPercentage || 30}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        defaultAiContributionPercentage: parseInt(e.target.value)
                      })
                    }
                    className="flex-1"
                  />
                  <span className="text-white font-medium w-12 text-right">
                    {config.defaultAiContributionPercentage || 30}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Human Authorship Statement
                </label>
                <textarea
                  value={config.humanAuthorshipStatement || ''}
                  onChange={(e) =>
                    setConfig({ ...config, humanAuthorshipStatement: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the human creative contribution to the work..."
                />
                <p className="text-gray-500 text-xs mt-1">
                  Explain what aspects were created by humans vs. AI
                </p>
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Review and Submit</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Characters to Register</p>
                  <p className="text-white text-2xl font-bold">{selectedCharacters.size}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Scripts to Register</p>
                  <p className="text-white text-2xl font-bold">{selectedScripts.size}</p>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <p className="text-white font-medium">Fee Estimate</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Registration Method</span>
                    <span className="text-white">{feeEstimate.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fee per Item</span>
                    <span className="text-white">${feeEstimate.feePerItem.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-300">Total Estimated Fee</span>
                    <span className="text-green-400">${feeEstimate.totalFee.toFixed(2)}</span>
                  </div>
                  {feeEstimate.savings > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Savings from Group Registration</span>
                      <span>${feeEstimate.savings.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-white font-medium mb-3">Author Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name</span>
                    <span className="text-white">{config.authorName}</span>
                  </div>
                  {config.authorCitizenship && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Citizenship</span>
                      <span className="text-white">{config.authorCitizenship}</span>
                    </div>
                  )}
                </div>
              </div>

              {aiSelectedCount > 0 && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-5 h-5 text-purple-400" />
                    <p className="text-purple-300 font-medium">AI Disclosure</p>
                  </div>
                  <p className="text-purple-200/70 text-sm">
                    {aiSelectedCount} items will include AI-generated content disclosure with{' '}
                    {config.defaultAiContributionPercentage}% AI contribution.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 'source'}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : currentStep === 'review' ? (
              <>
                <Check className="w-5 h-5" />
                Submit Registrations
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
