import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Loader2,
  Settings,
  Key,
  Cloud,
  TestTube,
  RefreshCw
} from 'lucide-react';
import { getElevenLabsService } from '../services/elevenLabsService';
import type { ElevenLabsHealthStatus } from '../services/elevenLabsService';

interface ElevenLabsSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ElevenLabsSetupWizard({ isOpen, onClose }: ElevenLabsSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [healthStatus, setHealthStatus] = useState<ElevenLabsHealthStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  useEffect(() => {
    if (isOpen) {
      checkHealth();
    }
  }, [isOpen]);

  const checkHealth = async () => {
    setTesting(true);
    try {
      const service = getElevenLabsService();
      const status = await service.checkHealth();
      setHealthStatus(status);

      if (status.edge_function_deployed && status.api_key_configured) {
        setCurrentStep(4);
      } else if (status.edge_function_deployed) {
        setCurrentStep(3);
      } else {
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || 'YOUR_API_KEY_HERE';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseProjectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'your-project';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">ElevenLabs Setup Wizard</h2>
            <p className="text-sm text-gray-600 mt-1">Configure voice generation integration</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      step < currentStep
                        ? 'bg-green-600 text-white'
                        : step === currentStep
                        ? 'bg-scripps-blue text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Verify Key</span>
              <span>Deploy Function</span>
              <span>Configure Secret</span>
              <span>Test</span>
            </div>
          </div>

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Key className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Step 1: Get Your ElevenLabs API Key</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    First, you need an ElevenLabs API key. If you don't have one yet:
                  </p>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside mb-3">
                    <li>Go to <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">elevenlabs.io</a> and sign up</li>
                    <li>Navigate to your Profile Settings</li>
                    <li>Copy your API key</li>
                    <li>Add it to your .env file as VITE_ELEVENLABS_API_KEY</li>
                  </ol>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-xs font-mono">VITE_ELEVENLABS_API_KEY</code>
                      {apiKey !== 'YOUR_API_KEY_HERE' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {apiKey !== 'YOUR_API_KEY_HERE'
                        ? '✓ API key found in environment'
                        : '✗ API key not configured in .env file'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={apiKey === 'YOUR_API_KEY_HERE'}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  apiKey !== 'YOUR_API_KEY_HERE'
                    ? 'bg-scripps-blue text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue to Deployment
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <Cloud className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-2">Step 2: Deploy Edge Function</h3>
                  <p className="text-sm text-purple-800 mb-3">
                    The ElevenLabs integration uses a Supabase Edge Function to keep your API key secure. You need to deploy it:
                  </p>

                  <div className="bg-white rounded-lg p-4 border border-purple-200 mb-3">
                    <h4 className="font-medium text-sm text-gray-900 mb-2">Using Supabase Dashboard:</h4>
                    <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                      <li>
                        Go to{' '}
                        <a
                          href={`https://supabase.com/dashboard/project/${supabaseProjectRef}/functions`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:underline inline-flex items-center gap-1"
                        >
                          Edge Functions
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Click "Deploy new function"</li>
                      <li>Name it: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">elevenlabs-proxy</code></li>
                      <li>Copy and paste the function code from <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">supabase/functions/elevenlabs-proxy/index.ts</code></li>
                      <li>Click "Deploy"</li>
                    </ol>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        Alternative: If you have Supabase CLI installed, you can run:{' '}
                        <code className="bg-amber-100 px-2 py-0.5 rounded">supabase functions deploy elevenlabs-proxy</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={async () => {
                    await checkHealth();
                    if (healthStatus?.edge_function_deployed) {
                      setCurrentStep(3);
                    }
                  }}
                  disabled={testing}
                  className="flex-1 py-3 bg-scripps-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Verify Deployment'
                  )}
                </button>
              </div>

              {healthStatus && !healthStatus.edge_function_deployed && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Edge function not detected</p>
                    <p className="text-xs mt-1">{healthStatus.error || 'Please deploy the function and try again.'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Settings className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">Step 3: Configure API Secret</h3>
                  <p className="text-sm text-green-800 mb-3">
                    Now you need to add your ElevenLabs API key as a secret in Supabase:
                  </p>

                  <div className="bg-white rounded-lg p-4 border border-green-200 mb-3">
                    <h4 className="font-medium text-sm text-gray-900 mb-3">Using Supabase Dashboard:</h4>
                    <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside mb-3">
                      <li>
                        Go to{' '}
                        <a
                          href={`https://supabase.com/dashboard/project/${supabaseProjectRef}/settings/functions`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline inline-flex items-center gap-1"
                        >
                          Project Settings → Edge Functions
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Scroll down to "Secrets" section</li>
                      <li>Click "Add new secret"</li>
                      <li>
                        Name: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">ELEVENLABS_API_KEY</code>
                      </li>
                      <li>Value: Your ElevenLabs API key (click to copy below)</li>
                    </ol>

                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Your API Key:</span>
                        <button
                          onClick={() => copyToClipboard(apiKey, 'api-key')}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedText === 'api-key' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <code className="text-xs bg-white px-3 py-2 rounded border border-gray-200 block font-mono break-all">
                        {apiKey}
                      </code>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        Alternative CLI command:{' '}
                        <code className="bg-amber-100 px-2 py-0.5 rounded">
                          supabase secrets set ELEVENLABS_API_KEY=your_key_here
                        </code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={async () => {
                    await checkHealth();
                    if (healthStatus?.api_key_configured) {
                      setCurrentStep(4);
                    }
                  }}
                  disabled={testing}
                  className="flex-1 py-3 bg-scripps-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Verify Configuration'
                  )}
                </button>
              </div>

              {healthStatus && !healthStatus.api_key_configured && healthStatus.edge_function_deployed && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">API key not configured</p>
                    <p className="text-xs mt-1">Please add the ELEVENLABS_API_KEY secret in Supabase and try again.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <TestTube className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Step 4: Test Connection</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    Let's verify that everything is working correctly:
                  </p>

                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-gray-900">Edge Function Deployed</span>
                        </div>
                        <span className="text-xs text-green-600">✓ Success</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {healthStatus?.api_key_configured ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm font-medium text-gray-900">API Key Configured</span>
                        </div>
                        <span className={`text-xs ${healthStatus?.api_key_configured ? 'text-green-600' : 'text-red-600'}`}>
                          {healthStatus?.api_key_configured ? '✓ Success' : '✗ Failed'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {healthStatus?.api_connectivity ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                          )}
                          <span className="text-sm font-medium text-gray-900">ElevenLabs API Connection</span>
                        </div>
                        <span className={`text-xs ${healthStatus?.api_connectivity ? 'text-green-600' : 'text-gray-500'}`}>
                          {healthStatus?.api_connectivity ? '✓ Connected' : 'Testing...'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {healthStatus?.api_key_configured && healthStatus?.api_connectivity && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-green-900">Setup Complete!</p>
                          <p className="text-sm text-green-800 mt-1">
                            Your ElevenLabs integration is now fully configured and ready to use. You can now generate voices and assign them to characters.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {!healthStatus?.api_key_configured && (
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Back to Configuration
                  </button>
                )}
                <button
                  onClick={checkHealth}
                  disabled={testing}
                  className="flex-1 py-3 border border-scripps-blue text-scripps-blue rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Retest Connection
                    </>
                  )}
                </button>
                {healthStatus?.api_key_configured && healthStatus?.api_connectivity && (
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
