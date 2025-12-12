import React, { useState, useEffect } from 'react';
import { Video, Save, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { lipSyncService } from '../services/lipSyncService';
import { SyncLabsProvider } from '../services/providers/syncLabsProvider';
import { VeedIoProvider } from '../services/providers/veedIoProvider';
import { useOrganization } from '../contexts/OrganizationContext';

interface ProviderConfig {
  providerName: 'sync_labs' | 'veed_io';
  apiKey: string;
  apiEndpoint: string;
  isEnabled: boolean;
  isDefault: boolean;
  priorityOrder: number;
}

export function LipSyncSettings() {
  const { currentOrganization } = useOrganization();
  const [syncLabsConfig, setSyncLabsConfig] = useState<ProviderConfig>({
    providerName: 'sync_labs',
    apiKey: '',
    apiEndpoint: 'https://api.synclabs.so/v1',
    isEnabled: false,
    isDefault: true,
    priorityOrder: 1,
  });

  const [veedIoConfig, setVeedIoConfig] = useState<ProviderConfig>({
    providerName: 'veed_io',
    apiKey: '',
    apiEndpoint: 'https://api.veed.io/v1',
    isEnabled: false,
    isDefault: false,
    priorityOrder: 2,
  });

  const [showSyncLabsKey, setShowSyncLabsKey] = useState(false);
  const [showVeedIoKey, setShowVeedIoKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (currentOrganization?.id) {
      loadConfigs();
    }
  }, [currentOrganization?.id]);

  async function loadConfigs() {
    if (!currentOrganization?.id) return;

    try {
      const configs = await lipSyncService.getProviderConfigs(currentOrganization.id);

      const syncLabsData = configs.find(c => c.providerName === 'sync_labs');
      if (syncLabsData) {
        setSyncLabsConfig({
          providerName: 'sync_labs',
          apiKey: syncLabsData.apiKey || '',
          apiEndpoint: syncLabsData.apiEndpoint || 'https://api.synclabs.so/v1',
          isEnabled: syncLabsData.isEnabled,
          isDefault: syncLabsData.isDefault,
          priorityOrder: syncLabsData.priorityOrder,
        });
      }

      const veedIoData = configs.find(c => c.providerName === 'veed_io');
      if (veedIoData) {
        setVeedIoConfig({
          providerName: 'veed_io',
          apiKey: veedIoData.apiKey || '',
          apiEndpoint: veedIoData.apiEndpoint || 'https://api.veed.io/v1',
          isEnabled: veedIoData.isEnabled,
          isDefault: veedIoData.isDefault,
          priorityOrder: veedIoData.priorityOrder,
        });
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  }

  async function handleSaveSyncLabs() {
    if (!currentOrganization?.id) return;

    setSaving(true);
    setMessage('');

    try {
      if (syncLabsConfig.apiKey) {
        const isValid = await SyncLabsProvider.testConnection(
          syncLabsConfig.apiKey,
          syncLabsConfig.apiEndpoint
        );

        if (!isValid) {
          setMessageType('error');
          setMessage('Invalid Sync Labs API key or endpoint');
          setSaving(false);
          return;
        }
      }

      await lipSyncService.saveProviderConfig({
        organizationId: currentOrganization.id,
        providerName: 'sync_labs',
        apiKey: syncLabsConfig.apiKey,
        apiEndpoint: syncLabsConfig.apiEndpoint,
        isEnabled: syncLabsConfig.isEnabled,
        isDefault: syncLabsConfig.isDefault,
        priorityOrder: syncLabsConfig.priorityOrder,
      });

      if (syncLabsConfig.isEnabled && syncLabsConfig.apiKey) {
        const provider = new SyncLabsProvider({
          apiKey: syncLabsConfig.apiKey,
          apiEndpoint: syncLabsConfig.apiEndpoint,
        });
        lipSyncService.registerProvider('sync_labs', provider);
      }

      setMessageType('success');
      setMessage('Sync Labs configuration saved successfully');
    } catch (error) {
      console.error('Error saving Sync Labs config:', error);
      setMessageType('error');
      setMessage('Error saving Sync Labs configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVeedIo() {
    if (!currentOrganization?.id) return;

    setSaving(true);
    setMessage('');

    try {
      if (veedIoConfig.apiKey) {
        const isValid = await VeedIoProvider.testConnection(
          veedIoConfig.apiKey,
          veedIoConfig.apiEndpoint
        );

        if (!isValid) {
          setMessageType('error');
          setMessage('Invalid VEED.IO API key or endpoint');
          setSaving(false);
          return;
        }
      }

      await lipSyncService.saveProviderConfig({
        organizationId: currentOrganization.id,
        providerName: 'veed_io',
        apiKey: veedIoConfig.apiKey,
        apiEndpoint: veedIoConfig.apiEndpoint,
        isEnabled: veedIoConfig.isEnabled,
        isDefault: veedIoConfig.isDefault,
        priorityOrder: veedIoConfig.priorityOrder,
      });

      if (veedIoConfig.isEnabled && veedIoConfig.apiKey) {
        const provider = new VeedIoProvider({
          apiKey: veedIoConfig.apiKey,
          apiEndpoint: veedIoConfig.apiEndpoint,
        });
        lipSyncService.registerProvider('veed_io', provider);
      }

      setMessageType('success');
      setMessage('VEED.IO configuration saved successfully');
    } catch (error) {
      console.error('Error saving VEED.IO config:', error);
      setMessageType('error');
      setMessage('Error saving VEED.IO configuration');
    } finally {
      setSaving(false);
    }
  }

  function handleSetDefault(provider: 'sync_labs' | 'veed_io') {
    if (provider === 'sync_labs') {
      setSyncLabsConfig({ ...syncLabsConfig, isDefault: true });
      setVeedIoConfig({ ...veedIoConfig, isDefault: false });
    } else {
      setSyncLabsConfig({ ...syncLabsConfig, isDefault: false });
      setVeedIoConfig({ ...veedIoConfig, isDefault: true });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <Video className="w-6 h-6" />
          Lip Sync Configuration
        </h2>
        <p className="text-gray-600">
          Configure cloud-based lip sync providers for generating realistic dialogue animations
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border flex items-center gap-2 ${
            messageType === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sync Labs</h3>
          {syncLabsConfig.isDefault && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              Default
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                type={showSyncLabsKey ? 'text' : 'password'}
                value={syncLabsConfig.apiKey}
                onChange={(e) =>
                  setSyncLabsConfig({ ...syncLabsConfig, apiKey: e.target.value })
                }
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your Sync Labs API key"
              />
              <button
                onClick={() => setShowSyncLabsKey(!showSyncLabsKey)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {showSyncLabsKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Endpoint
            </label>
            <input
              type="text"
              value={syncLabsConfig.apiEndpoint}
              onChange={(e) =>
                setSyncLabsConfig({ ...syncLabsConfig, apiEndpoint: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://api.synclabs.so/v1"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={syncLabsConfig.isEnabled}
                onChange={(e) =>
                  setSyncLabsConfig({ ...syncLabsConfig, isEnabled: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Enable this provider</span>
            </label>

            {!syncLabsConfig.isDefault && (
              <button
                onClick={() => handleSetDefault('sync_labs')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Set as default
              </button>
            )}
          </div>

          <button
            onClick={handleSaveSyncLabs}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Sync Labs Configuration
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">VEED.IO</h3>
          {veedIoConfig.isDefault && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              Default
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                type={showVeedIoKey ? 'text' : 'password'}
                value={veedIoConfig.apiKey}
                onChange={(e) =>
                  setVeedIoConfig({ ...veedIoConfig, apiKey: e.target.value })
                }
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your VEED.IO API key"
              />
              <button
                onClick={() => setShowVeedIoKey(!showVeedIoKey)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {showVeedIoKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Endpoint
            </label>
            <input
              type="text"
              value={veedIoConfig.apiEndpoint}
              onChange={(e) =>
                setVeedIoConfig({ ...veedIoConfig, apiEndpoint: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://api.veed.io/v1"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={veedIoConfig.isEnabled}
                onChange={(e) =>
                  setVeedIoConfig({ ...veedIoConfig, isEnabled: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Enable this provider</span>
            </label>

            {!veedIoConfig.isDefault && (
              <button
                onClick={() => handleSetDefault('veed_io')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Set as default
              </button>
            )}
          </div>

          <button
            onClick={handleSaveVeedIo}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save VEED.IO Configuration
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Usage Information</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>Sync Labs: Premium quality, approximately $0.02 per second of audio</li>
          <li>VEED.IO: Alternative provider, approximately $1.00 per minute</li>
          <li>Set a default provider for automatic job routing</li>
          <li>Enable multiple providers for automatic failover</li>
        </ul>
      </div>
    </div>
  );
}
