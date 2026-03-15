import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Zap, Shield } from 'lucide-react';
import { WorkflowStep, Assumptions } from '../types';
import { analyzeStep, getAutomationScore } from '../lib/claude';

interface AIStepAnalyzerProps {
  step: WorkflowStep;
  assumptions: Assumptions;
  onApplyEstimate?: (manualTime: number, autoTime: number) => void;
}

export function AIStepAnalyzer({ step, assumptions, onApplyEstimate }: AIStepAnalyzerProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeStep(step, assumptions);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Check that ANTHROPIC_API_KEY is set in Netlify.');
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async () => {
    setLoadingScore(true);
    setError(null);
    try {
      const result = await getAutomationScore(step);
      setScore(result);
    } catch (err: any) {
      setError(err.message || 'Scoring failed.');
    } finally {
      setLoadingScore(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="btn-primary text-xs flex items-center gap-1.5 py-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI Time Estimate
        </button>
        <button
          onClick={handleScore}
          disabled={loadingScore}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"
        >
          {loadingScore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Automation Score
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {analysis && (
        <div className="p-3 bg-brand-50 rounded-lg border border-brand-200 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-900">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            AI Time Estimate
            {analysis.confidence && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                analysis.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                analysis.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>{analysis.confidence} confidence</span>
            )}
          </div>
          {analysis.manualTimeMinutes && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <span className="text-surface-500">Manual:</span>{' '}
                <span className="font-semibold">{analysis.manualTimeMinutes} min</span>
              </div>
              <div className="bg-white rounded p-2">
                <span className="text-surface-500">Automated:</span>{' '}
                <span className="font-semibold text-emerald-600">{analysis.automatedTimeMinutes} min</span>
              </div>
            </div>
          )}
          {analysis.rationale && (
            <p className="text-xs text-brand-800">{analysis.rationale}</p>
          )}
          {analysis.automationApproach && (
            <p className="text-xs text-brand-700"><strong>Approach:</strong> {analysis.automationApproach}</p>
          )}
          {analysis.riskFactors && analysis.riskFactors.length > 0 && (
            <div className="text-xs">
              <span className="text-brand-700 font-medium">Risks: </span>
              {analysis.riskFactors.join(', ')}
            </div>
          )}
          {onApplyEstimate && analysis.manualTimeMinutes && (
            <button
              onClick={() => onApplyEstimate(analysis.manualTimeMinutes, analysis.automatedTimeMinutes)}
              className="text-xs text-brand-700 hover:text-brand-900 font-medium flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply these estimates to this step
            </button>
          )}
        </div>
      )}

      {score && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-semibold text-purple-900">Automation Score</span>
            <span className={`text-lg font-bold ${
              score.score >= 8 ? 'text-emerald-600' :
              score.score >= 5 ? 'text-amber-600' : 'text-red-600'
            }`}>{score.score}/10</span>
          </div>
          {score.rationale && (
            <p className="text-xs text-purple-800">{score.rationale}</p>
          )}
          {score.quickWins && score.quickWins.length > 0 && (
            <div className="text-xs">
              <span className="text-purple-700 font-medium">Quick wins: </span>
              {score.quickWins.join('; ')}
            </div>
          )}
          {score.humanRequired && score.humanRequired.length > 0 && (
            <div className="text-xs flex items-start gap-1">
              <Shield className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-purple-700">Human needed:</strong> {score.humanRequired.join('; ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
