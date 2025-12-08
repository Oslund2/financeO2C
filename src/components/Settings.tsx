import { useState, useEffect } from 'react';
import { Key, Database, Sparkles, ExternalLink, CheckCircle, XCircle, Info } from 'lucide-react';
import { getAPIKeyStatus, getConfigurationInstructions } from '../services/settingsService';

export function Settings() {
  const [apiStatus, setApiStatus] = useState<any>(null);

  useEffect(() => {
    checkAPIStatus();
  }, []);

  const checkAPIStatus = () => {
    const status = getAPIKeyStatus();
    setApiStatus(status);
  };

  const instructions = getConfigurationInstructions();

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Configure your AI services and application settings</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Using Bolt Secrets</h3>
              <p className="text-sm text-blue-800 mb-2">
                API keys are securely managed through Bolt Secrets. To configure your API credentials:
              </p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click the Secrets icon in the Bolt toolbar</li>
                <li>Add the required environment variables listed below</li>
                <li>Refresh this page to see updated status</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{instructions.vertexAI.title}</h2>
                <p className="text-sm text-gray-600">{instructions.vertexAI.description}</p>
              </div>
              <a
                href={instructions.vertexAI.setupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-scripps-blue hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Setup Guide
              </a>
            </div>

            <div className="space-y-4">
              {instructions.vertexAI.secrets.map((secret: any) => (
                <div key={secret.name} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {secret.name}
                        </code>
                        {secret.required && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{secret.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Example: {secret.example}</p>
                      {secret.default && (
                        <p className="text-xs text-gray-500">Default: {secret.default}</p>
                      )}
                    </div>
                    <div className="ml-4">
                      {apiStatus && secret.name === 'VITE_VERTEX_AI_PROJECT_ID' && apiStatus.vertexAI.projectId ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : apiStatus && secret.name === 'VITE_VERTEX_AI_LOCATION' && apiStatus.vertexAI.location ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : apiStatus && secret.name === 'VITE_VERTEX_AI_API_KEY' && apiStatus.vertexAI.apiKey ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : secret.required ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-300" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-scripps-yellow to-yellow-400 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{instructions.elevenLabs.title}</h2>
                <p className="text-sm text-gray-600">{instructions.elevenLabs.description}</p>
              </div>
              <a
                href={instructions.elevenLabs.setupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-scripps-blue hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Get API Key
              </a>
            </div>

            <div className="space-y-4">
              {instructions.elevenLabs.secrets.map((secret: any) => (
                <div key={secret.name} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {secret.name}
                        </code>
                        {secret.required && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{secret.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Example: {secret.example}</p>
                    </div>
                    <div className="ml-4">
                      {apiStatus?.elevenLabs.apiKey ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Database Status</h2>
                <p className="text-sm text-gray-600">Supabase connection information</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium">Connected</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Database is configured and ready to use
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
