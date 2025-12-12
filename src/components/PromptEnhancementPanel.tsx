import { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  Minus
} from 'lucide-react';
import {
  enhancePrompt,
  analyzePrompt,
  type EnhancementType,
  type EnhancementResult,
  type PromptAnalysis
} from '../services/promptEnhancementService';

interface PromptEnhancementPanelProps {
  content: string;
  promptKey: string;
  category: string;
  onAccept: (enhancedContent: string) => void;
  onClose: () => void;
}

const ENHANCEMENT_MODES: {
  type: EnhancementType;
  label: string;
  description: string;
  icon: typeof Sparkles;
}[] = [
  {
    type: 'clarity',
    label: 'Clarity',
    description: 'Simplify and make clearer',
    icon: Zap
  },
  {
    type: 'detail',
    label: 'Detail',
    description: 'Expand with more specifics',
    icon: FileText
  },
  {
    type: 'optimize',
    label: 'Optimize',
    description: 'Better AI performance',
    icon: Settings
  },
  {
    type: 'custom',
    label: 'Custom',
    description: 'Your own instructions',
    icon: Sparkles
  }
];

export function PromptEnhancementPanel({
  content,
  promptKey,
  category,
  onAccept,
  onClose
}: PromptEnhancementPanelProps) {
  const [selectedMode, setSelectedMode] = useState<EnhancementType | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnhance = async () => {
    if (!selectedMode) return;
    if (selectedMode === 'custom' && !customInstruction.trim()) {
      setError('Please provide custom instructions');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const enhanced = await enhancePrompt(
        content,
        selectedMode,
        selectedMode === 'custom' ? customInstruction : undefined,
        { category, purpose: promptKey }
      );
      setResult(enhanced);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await analyzePrompt(content);
      setAnalysis(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 5) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getEffectivenessColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-amber-600 bg-amber-100';
      default:
        return 'text-red-600 bg-red-100';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          AI Enhancement
        </h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!result ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enhancement Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ENHANCEMENT_MODES.map(({ type, label, description, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedMode(type)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedMode === type
                        ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        className={`w-4 h-4 ${
                          selectedMode === type ? 'text-teal-600' : 'text-gray-400'
                        }`}
                      />
                      <span className="font-medium text-sm text-gray-900">{label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedMode === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Instructions
                </label>
                <textarea
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Describe how you want the prompt improved..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none h-24"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleEnhance}
                disabled={loading || !selectedMode}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Enhance
                  </>
                )}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
                Analyze
              </button>
            </div>

            {analysis && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                <h4 className="font-medium text-gray-900">Prompt Analysis</h4>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <div
                      className={`text-lg font-bold rounded px-2 py-1 ${getScoreColor(
                        analysis.clarity_score
                      )}`}
                    >
                      {analysis.clarity_score}/10
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Clarity</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <div
                      className={`text-lg font-bold rounded px-2 py-1 ${getScoreColor(
                        analysis.specificity_score
                      )}`}
                    >
                      {analysis.specificity_score}/10
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Specificity</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <div
                      className={`text-sm font-bold rounded px-2 py-1 capitalize ${getEffectivenessColor(
                        analysis.estimated_effectiveness
                      )}`}
                    >
                      {analysis.estimated_effectiveness}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Effectiveness</div>
                  </div>
                </div>

                {analysis.potential_issues.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Potential Issues</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {analysis.potential_issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.recommendations.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Recommendations</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Enhancement Complete</span>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Changes Preview</h4>
              <div className="space-y-2 max-h-64 overflow-auto">
                {result.analysis.recommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Plus className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {rec}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Enhanced Prompt Preview</h4>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs max-h-48 overflow-auto">
                {result.enhancedContent.substring(0, 800)}
                {result.enhancedContent.length > 800 && '...'}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onAccept(result.enhancedContent)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Accept Changes
              </button>
              <button
                onClick={() => setResult(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>

            <button
              onClick={() => setResult(null)}
              className="w-full px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg text-sm"
            >
              Try Different Enhancement
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <p className="text-xs text-gray-500 text-center">
          AI enhancements are suggestions. Always review before accepting.
        </p>
      </div>
    </div>
  );
}
