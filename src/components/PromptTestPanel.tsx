import { useState } from 'react';
import { X, Play, Clock, Zap, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { testPromptWithSampleData } from '../services/promptEnhancementService';

interface PromptTestPanelProps {
  content: string;
  variables: Record<string, string>;
  onClose: () => void;
}

interface TestResult {
  renderedPrompt: string;
  testResponse: string;
  tokenUsage: { input: number; output: number };
  latencyMs: number;
}

export function PromptTestPanel({ content, variables, onClose }: PromptTestPanelProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setResult(null);

    try {
      const testResult = await testPromptWithSampleData(content, variables);
      setResult(testResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Play className="w-4 h-4 text-teal-600" />
          Test Prompt
        </h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!result ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Test your prompt by sending it to the AI and viewing the response. Variable values
                from the Variables tab will be used.
              </p>
            </div>

            {Object.keys(variables).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Variables Used</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                  {Object.entries(variables).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <code className="text-teal-600 font-mono">${'{'}
                        {key}
                        {'}'}</code>
                      <span className="text-gray-400">=</span>
                      <span className="text-gray-700 truncate flex-1">
                        {value || <span className="text-gray-400 italic">empty</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              onClick={handleTest}
              disabled={testing}
              className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {testing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Run Test
                </>
              )}
            </button>

            <div className="text-xs text-gray-500 text-center">
              This will make a real API call and may incur costs
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Test Complete</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs">Latency</span>
                </div>
                <div className="font-mono font-bold text-gray-900">
                  {formatLatency(result.latencyMs)}
                </div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-xs">Input</span>
                </div>
                <div className="font-mono font-bold text-gray-900">
                  {result.tokenUsage.input.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-xs">Output</span>
                </div>
                <div className="font-mono font-bold text-gray-900">
                  {result.tokenUsage.output.toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Rendered Prompt</h4>
                <button
                  onClick={() => handleCopy(result.renderedPrompt)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 font-mono text-xs max-h-32 overflow-auto text-gray-700">
                {result.renderedPrompt.substring(0, 500)}
                {result.renderedPrompt.length > 500 && '...'}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">AI Response</h4>
                <button
                  onClick={() => handleCopy(result.testResponse)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs max-h-64 overflow-auto">
                {result.testResponse}
              </div>
            </div>

            <button
              onClick={() => setResult(null)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Run Another Test
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <p className="text-xs text-gray-500 text-center">
          Tests use Gemini API for generation
        </p>
      </div>
    </div>
  );
}
