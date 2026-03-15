import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { SavingsResult, PhaseBreakdown, Assumptions } from '../types';
import { generateSavingsNarrative } from '../lib/claude';

interface AISavingsNarrativeProps {
  savings: SavingsResult;
  assumptions: Assumptions;
  breakdown: PhaseBreakdown[];
}

export function AISavingsNarrative({ savings, assumptions, breakdown }: AISavingsNarrativeProps) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateSavingsNarrative(savings, assumptions, breakdown);
      setNarrative(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate narrative. Ensure ANTHROPIC_API_KEY is set in Netlify.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (narrative) {
      navigator.clipboard.writeText(narrative);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <h3 className="font-semibold text-surface-900 text-sm">AI Executive Summary</h3>
          <span className="text-[10px] text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded-full">Claude</span>
        </div>
        <div className="flex items-center gap-1.5">
          {narrative && (
            <button
              onClick={copyToClipboard}
              className="text-xs text-surface-400 hover:text-surface-600 flex items-center gap-1 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
            ) : narrative ? (
              <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Generate Summary</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700 mb-3">
          {error}
        </div>
      )}

      {narrative ? (
        <div className="prose prose-sm max-w-none text-surface-700 text-sm leading-relaxed whitespace-pre-wrap">
          {narrative}
        </div>
      ) : !loading && (
        <p className="text-sm text-surface-400">
          Click "Generate Summary" to create an AI-written executive narrative based on your
          current savings calculations. Perfect for the finance meeting.
        </p>
      )}
    </div>
  );
}
