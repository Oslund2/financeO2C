import React, { useState, useEffect } from 'react';
import { Video, Loader2, CheckCircle2, XCircle, RefreshCw, DollarSign, Play, Pause } from 'lucide-react';
import { lipSyncService } from '../services/lipSyncService';
import { dialogueAudioService } from '../services/dialogueAudioService';
import { SyncLabsProvider } from '../services/providers/syncLabsProvider';
import { VeedIoProvider } from '../services/providers/veedIoProvider';
import { useOrganization } from '../contexts/OrganizationContext';

interface LipSyncManagerProps {
  episodeId: string;
  episodeName: string;
}

interface DialogueShot {
  id: string;
  shot_number: number;
  dialogue: string;
  has_dialogue: boolean;
  requires_lip_sync: boolean;
  lip_sync_status: string;
  lip_sync_video_url?: string;
  lip_sync_approved?: boolean;
  characters?: {
    id: string;
    name: string;
    voice_id?: string;
    chatterbox_voice_id?: string;
  };
  dialogue_audio_clips?: Array<{
    id: string;
    audio_url: string;
    duration_seconds: number;
  }>;
}

export function LipSyncManager({ episodeId, episodeName }: LipSyncManagerProps) {
  const { currentOrganization } = useOrganization();
  const [dialogueShots, setDialogueShots] = useState<DialogueShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [providersConfigured, setProvidersConfigured] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) {
      loadDialogueShots();
      checkProviderConfiguration();
      calculateTotalCost();
    }
  }, [episodeId, currentOrganization?.id]);

  useEffect(() => {
    calculateEstimatedCost();
  }, [selectedShots, dialogueShots]);

  async function loadDialogueShots() {
    try {
      setLoading(true);
      await dialogueAudioService.detectDialogueInShots(episodeId);
      const shots = await dialogueAudioService.getDialogueShots(episodeId);
      setDialogueShots(shots);
    } catch (error) {
      console.error('Error loading dialogue shots:', error);
      setStatusMessage('Error loading dialogue shots');
    } finally {
      setLoading(false);
    }
  }

  async function checkProviderConfiguration() {
    if (!currentOrganization?.id) return;

    try {
      const configs = await lipSyncService.getProviderConfigs(currentOrganization.id);
      const hasActiveProvider = configs.some(c => c.isEnabled && c.apiKey);
      setProvidersConfigured(hasActiveProvider);
    } catch (error) {
      console.error('Error checking providers:', error);
    }
  }

  async function calculateTotalCost() {
    try {
      const cost = await lipSyncService.getTotalCostByEpisode(episodeId);
      setTotalCost(cost);
    } catch (error) {
      console.error('Error calculating total cost:', error);
    }
  }

  async function calculateEstimatedCost() {
    if (!currentOrganization?.id || selectedShots.size === 0) {
      setEstimatedCost(0);
      return;
    }

    try {
      let totalDuration = 0;
      for (const shotId of selectedShots) {
        const shot = dialogueShots.find(s => s.id === shotId);
        if (shot?.dialogue_audio_clips?.[0]) {
          totalDuration += shot.dialogue_audio_clips[0].duration_seconds;
        } else if (shot?.dialogue) {
          const words = shot.dialogue.split(/\s+/).length;
          const minutes = words / 150;
          totalDuration += minutes * 60;
        }
      }

      const cost = await lipSyncService.estimateCost(currentOrganization.id, totalDuration);
      setEstimatedCost(cost);
    } catch (error) {
      console.error('Error estimating cost:', error);
    }
  }

  async function handleGenerateAudio() {
    if (!currentOrganization?.id) return;

    setProcessing(true);
    setStatusMessage('Generating audio for dialogue shots...');

    try {
      const result = await dialogueAudioService.batchGenerateAudio(episodeId, currentOrganization.id);

      if (result.errors.length > 0) {
        setStatusMessage(`Audio generated: ${result.success} successful, ${result.failed} failed. Check console for errors.`);
        console.error('Audio generation errors:', result.errors);
      } else {
        setStatusMessage(`Audio generated successfully for ${result.success} shots`);
      }

      await loadDialogueShots();
    } catch (error) {
      console.error('Error generating audio:', error);
      setStatusMessage('Error generating audio');
    } finally {
      setProcessing(false);
    }
  }

  async function handleProcessSelected() {
    if (!currentOrganization?.id || selectedShots.size === 0) return;

    setProcessing(true);
    setStatusMessage('Processing selected shots...');

    try {
      await initializeProviders();

      let processed = 0;
      let failed = 0;

      for (const shotId of selectedShots) {
        try {
          const shot = dialogueShots.find(s => s.id === shotId);
          if (!shot) continue;

          let audioClip = shot.dialogue_audio_clips?.[0];

          if (!audioClip) {
            const character = shot.characters;
            const voiceId = character?.voice_id || character?.chatterbox_voice_id;

            if (!voiceId) {
              failed++;
              continue;
            }

            const clipId = await dialogueAudioService.generateAudio({
              shotId: shot.id,
              episodeId,
              organizationId: currentOrganization.id,
              dialogue: shot.dialogue,
              characterId: character?.id,
              voiceId,
              voiceProvider: character?.voice_id ? 'elevenlabs' : 'chatterbox',
            });

            audioClip = await dialogueAudioService.getAudioClip(shot.id);
          }

          if (!audioClip) {
            failed++;
            continue;
          }

          const imageUrl = await dialogueAudioService.getCharacterImage(shot.characters?.id || '', shot.id);

          if (!imageUrl) {
            failed++;
            continue;
          }

          await lipSyncService.createLipSyncJob({
            audioUrl: audioClip.audio_url,
            imageUrl,
            organizationId: currentOrganization.id,
            shotId: shot.id,
            episodeId,
            audioClipId: audioClip.id,
            characterId: shot.characters?.id,
          });

          processed++;
        } catch (error) {
          console.error(`Error processing shot:`, error);
          failed++;
        }
      }

      setStatusMessage(`Processed ${processed} shots successfully${failed > 0 ? `, ${failed} failed` : ''}`);
      setSelectedShots(new Set());
      await loadDialogueShots();
      await calculateTotalCost();
    } catch (error) {
      console.error('Error processing shots:', error);
      setStatusMessage('Error processing shots');
    } finally {
      setProcessing(false);
    }
  }

  async function initializeProviders() {
    if (!currentOrganization?.id) return;

    const configs = await lipSyncService.getProviderConfigs(currentOrganization.id);

    for (const config of configs) {
      if (!config.isEnabled || !config.apiKey) continue;

      if (config.providerName === 'sync_labs') {
        const provider = new SyncLabsProvider({
          apiKey: config.apiKey,
          apiEndpoint: config.apiEndpoint,
        });
        lipSyncService.registerProvider('sync_labs', provider);
      } else if (config.providerName === 'veed_io') {
        const provider = new VeedIoProvider({
          apiKey: config.apiKey,
          apiEndpoint: config.apiEndpoint,
        });
        lipSyncService.registerProvider('veed_io', provider);
      }
    }
  }

  function toggleShotSelection(shotId: string) {
    const newSelection = new Set(selectedShots);
    if (newSelection.has(shotId)) {
      newSelection.delete(shotId);
    } else {
      newSelection.add(shotId);
    }
    setSelectedShots(newSelection);
  }

  function selectAll() {
    const allShots = dialogueShots
      .filter(s => s.has_dialogue && s.lip_sync_status !== 'completed')
      .map(s => s.id);
    setSelectedShots(new Set(allShots));
  }

  function deselectAll() {
    setSelectedShots(new Set());
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4" /> Completed</span>;
      case 'processing':
        return <span className="flex items-center gap-1 text-blue-600"><Loader2 className="w-4 h-4 animate-spin" /> Processing</span>;
      case 'failed':
        return <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" /> Failed</span>;
      case 'queued':
        return <span className="flex items-center gap-1 text-yellow-600"><Pause className="w-4 h-4" /> Queued</span>;
      default:
        return <span className="text-gray-500">Not Started</span>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Video className="w-6 h-6" />
              Lip Sync Manager
            </h2>
            <p className="text-gray-600 mt-1">Episode: {episodeName}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Cost</div>
            <div className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</div>
          </div>
        </div>

        {!providersConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800">
              No lip sync providers configured. Please configure at least one provider in Settings.
            </p>
          </div>
        )}

        {statusMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800">{statusMessage}</p>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            onClick={handleGenerateAudio}
            disabled={processing || !providersConfigured}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Generate All Audio
          </button>
          <button
            onClick={handleProcessSelected}
            disabled={processing || selectedShots.size === 0 || !providersConfigured}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            Process Selected ({selectedShots.size})
          </button>
          <button
            onClick={selectAll}
            disabled={processing}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            disabled={processing}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Deselect All
          </button>
        </div>

        {selectedShots.size > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700">
              <DollarSign className="w-5 h-5" />
              <span>Estimated Cost: ${estimatedCost.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Select
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shot
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Character
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dialogue
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Audio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dialogueShots.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No dialogue shots found in this episode
                </td>
              </tr>
            ) : (
              dialogueShots.map((shot) => (
                <tr key={shot.id} className={selectedShots.has(shot.id) ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedShots.has(shot.id)}
                      onChange={() => toggleShotSelection(shot.id)}
                      disabled={shot.lip_sync_status === 'completed'}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    Shot {shot.shot_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {shot.characters?.name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                    {shot.dialogue}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {shot.dialogue_audio_clips?.[0] ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Generated
                      </span>
                    ) : (
                      <span className="text-gray-400">Not generated</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getStatusBadge(shot.lip_sync_status)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {shot.lip_sync_video_url && (
                      <a
                        href={shot.lip_sync_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Video
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
