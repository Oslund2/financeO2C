import React, { useState, useEffect } from 'react';
import { Key, Check, X, Loader, Globe, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { heygenVideoTranslationService, type HeyGenConfig } from '../services/heygenVideoTranslationService';
import { heygenConfigService, type HeyGenUsageStats } from '../services/heygenConfigService';
import { useNotification } from '../contexts/NotificationContext';

interface HeyGenConfigPanelProps {
  organizationId: string;
}

export function HeyGenConfigPanel({ organizationId }: HeyGenConfigPanelProps) {
  const [config, setConfig] = useState<Partial<HeyGenConfig>>({
    apiKey: '',
    apiEndpoint: 'https://api.heygen.com',
    serviceTier: 'scale',
    isEnabled: true,
    rateLimitPerMinute: 10,
  });
  const [usageStats, setUsageStats] = useState<HeyGenUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadConfig();
    loadUsageStats();
  }, [organizationId]);

  const loadConfig = async () => {
    try {
      const data = await heygenVideoTranslationService.getConfig(organizationId);
      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadUsageStats = async () => {
    try {
      const stats = await heygenConfigService.getUsageStats(organizationId);
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  const handleSave = async () => {
    if (!config.apiKey) {
      showNotification('error', 'API key is required');
      return;
    }

    if (!heygenConfigService.validateApiKey(config.apiKey)) {
      showNotification('error', 'Invalid API key format');
      return;
    }

    setLoading(true);
    try {
      await heygenVideoTranslationService.saveConfig({
        ...config,
        organizationId,
      });
      showNotification('success', 'HeyGen configuration saved successfully');
      await loadConfig();
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.apiKey) {
      showNotification('error', 'Please enter an API key first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await heygenVideoTranslationService.saveConfig({
        ...config,
        organizationId,
      });

      const result = await heygenVideoTranslationService.testConnection(organizationId);
      setTestResult(result ? 'success' : 'failed');

      if (result) {
        showNotification('success', 'Connection test successful!');
      } else {
        showNotification('error', 'Connection test failed. Please check your API key.');
      }
    } catch (error) {
      setTestResult('failed');
      showNotification('error', error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">HeyGen Video Translation Configuration</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key *
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="Enter your HeyGen API key"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleTestConnection}
                disabled={testing || !config.apiKey}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : testResult === 'success' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Valid
                  </>
                ) : testResult === 'failed' ? (
                  <>
                    <X className="w-4 h-4" />
                    Failed
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Get your API key from the{' '}
              <a
                href="https://app.heygen.com/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                HeyGen Dashboard
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Endpoint
            </label>
            <input
              type="text"
              value={config.apiEndpoint || ''}
              onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Tier
            </label>
            <select
              value={config.serviceTier || 'scale'}
              onChange={(e) => setConfig({ ...config, serviceTier: e.target.value as 'scale' | 'enterprise' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="scale">Scale</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Limit (requests per minute)
            </label>
            <input
              type="number"
              value={config.rateLimitPerMinute || 10}
              onChange={(e) => setConfig({ ...config, rateLimitPerMinute: parseInt(e.target.value) })}
              min="1"
              max="60"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Quota (minutes, optional)
            </label>
            <input
              type="number"
              value={config.monthlyQuotaMinutes || ''}
              onChange={(e) => setConfig({ ...config, monthlyQuotaMinutes: parseInt(e.target.value) || undefined })}
              placeholder="Leave empty for unlimited"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isEnabled"
              checked={config.isEnabled ?? true}
              onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isEnabled" className="text-sm text-gray-700">
              Enable HeyGen video translation
            </label>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Key className="w-5 h-5" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>

      {usageStats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Minutes Used</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {usageStats.minutesUsedThisMonth.toFixed(1)}
              </div>
              {usageStats.monthlyQuotaMinutes && (
                <div className="text-xs text-blue-700 mt-1">
                  of {usageStats.monthlyQuotaMinutes} minutes ({usageStats.percentageUsed.toFixed(1)}%)
                </div>
              )}
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Cost</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                ${usageStats.totalCost.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Completed Jobs</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {usageStats.completedJobs}
              </div>
              <div className="text-xs text-purple-700 mt-1">
                of {usageStats.totalJobs} total jobs
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <X className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Failed Jobs</span>
              </div>
              <div className="text-2xl font-bold text-red-900">
                {usageStats.failedJobs}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
