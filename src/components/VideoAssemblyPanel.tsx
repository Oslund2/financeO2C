import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Film,
  Play,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Clock,
  Video,
  Image,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Scissors,
} from 'lucide-react';
import {
  VideoAssembly,
  AssemblySettings,
  triggerAssembly,
  syncAssemblyStatus,
  getAssembliesForEpisode,
  getAssemblySettings,
  saveAssemblySettings,
} from '../services/videoAssemblyService';

interface VideoAssemblyPanelProps {
  episodeId: string;
  seriesId: string;
  organizationId: string;
  episodeTitle?: string;
}

const POLL_INTERVAL_MS = 8000;

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCost(usd?: number): string {
  if (usd == null) return '--';
  return `$${usd.toFixed(4)}`;
}

function StatusBadge({ status }: { status: VideoAssembly['status'] }) {
  const configs: Record<VideoAssembly['status'], { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-600', icon: <Clock className="w-3 h-3" /> },
    building_timeline: { label: 'Building Timeline', className: 'bg-blue-100 text-blue-700', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    rendering: { label: 'Rendering', className: 'bg-amber-100 text-amber-700', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed: { label: 'Complete', className: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const cfg = configs[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SourceBar({ assembly }: { assembly: VideoAssembly }) {
  const total = assembly.totalShots || 1;
  const lipsyncPct = (assembly.shotsWithLipsync / total) * 100;
  const veo3Pct = (assembly.shotsWithVideo / total) * 100;
  const stillPct = (assembly.shotsAsStills / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex h-2 rounded-full overflow-hidden gap-px bg-gray-100">
        {lipsyncPct > 0 && (
          <div className="bg-purple-500" style={{ width: `${lipsyncPct}%` }} title={`Lip-sync: ${assembly.shotsWithLipsync} shots`} />
        )}
        {veo3Pct > 0 && (
          <div className="bg-blue-500" style={{ width: `${veo3Pct}%` }} title={`Veo3 video: ${assembly.shotsWithVideo} shots`} />
        )}
        {stillPct > 0 && (
          <div className="bg-gray-400" style={{ width: `${stillPct}%` }} title={`Still image: ${assembly.shotsAsStills} shots`} />
        )}
      </div>
      <div className="flex gap-3 text-xs text-gray-500">
        {assembly.shotsWithLipsync > 0 && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />{assembly.shotsWithLipsync} lip-sync</span>
        )}
        {assembly.shotsWithVideo > 0 && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{assembly.shotsWithVideo} Veo3</span>
        )}
        {assembly.shotsAsStills > 0 && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />{assembly.shotsAsStills} still</span>
        )}
      </div>
    </div>
  );
}

function AssemblyCard({
  assembly,
  onRefresh,
  isPolling,
}: {
  assembly: VideoAssembly;
  onRefresh: (id: string) => void;
  isPolling: boolean;
}) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-sm text-gray-900">
            {assembly.assemblyType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} v{assembly.version}
          </span>
          <StatusBadge status={assembly.status} />
        </div>
        <div className="flex items-center gap-2">
          {(assembly.status === 'rendering' || assembly.status === 'building_timeline') && (
            <button
              onClick={() => onRefresh(assembly.id)}
              disabled={isPolling}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
            </button>
          )}
          {assembly.outputUrl && (
            <a
              href={assembly.outputUrl}
              download
              className="text-blue-600 hover:text-blue-700"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Duration</p>
          <p className="font-medium">{formatDuration(assembly.outputDurationSeconds)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Shots</p>
          <p className="font-medium">{assembly.totalShots}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Cost</p>
          <p className="font-medium">{formatCost(assembly.actualCostUsd ?? assembly.costEstimateUsd)}</p>
        </div>
      </div>

      {assembly.totalShots > 0 && <SourceBar assembly={assembly} />}

      {assembly.errorMessage && (
        <div className="flex gap-2 p-2 bg-red-50 rounded text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{assembly.errorMessage}</span>
        </div>
      )}

      {assembly.outputUrl && (
        <div className="space-y-2">
          <button
            onClick={() => setShowVideo(v => !v)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Play className="w-3 h-3" />
            {showVideo ? 'Hide preview' : 'Preview rough cut'}
          </button>
          {showVideo && (
            <video
              src={assembly.outputUrl}
              controls
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: 360 }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  onSave,
  onClose,
}: {
  settings: Partial<AssemblySettings>;
  onSave: (s: Partial<AssemblySettings>) => Promise<void>;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<Partial<AssemblySettings>>(settings);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(local);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-gray-900 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Assembly Settings
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Shotstack API Key */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Shotstack API Key</label>
          <input
            type="password"
            value={local.shotstackApiKey || ''}
            onChange={e => setLocal(p => ({ ...p, shotstackApiKey: e.target.value || undefined }))}
            placeholder={import.meta.env.VITE_SHOTSTACK_API_KEY ? '(using VITE_SHOTSTACK_API_KEY from .env)' : 'Enter your Shotstack API key…'}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          <p className="text-xs text-gray-400 mt-0.5">
            Get a free key at{' '}
            <a href="https://shotstack.io" target="_blank" rel="noreferrer" className="underline">shotstack.io</a>
            {' '}· Or set <code className="bg-gray-100 px-1 rounded">VITE_SHOTSTACK_API_KEY</code> in your .env
          </p>
        </div>

        {/* Sandbox mode */}
        <div className="col-span-2 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <input
            type="checkbox"
            id="shotstackSandbox"
            checked={local.shotstackSandbox ?? false}
            onChange={e => setLocal(p => ({ ...p, shotstackSandbox: e.target.checked }))}
            className="mt-0.5 rounded"
          />
          <div>
            <label htmlFor="shotstackSandbox" className="text-xs font-medium text-amber-800 cursor-pointer">
              Sandbox mode (stage endpoint)
            </label>
            <p className="text-xs text-amber-700 mt-0.5">
              Use the Shotstack stage API — free but adds a watermark. Use sandbox keys here; production keys go to the live endpoint.
            </p>
          </div>
        </div>

        {/* Transition */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Transition</label>
          <select
            value={local.defaultTransition || 'cut'}
            onChange={e => setLocal(p => ({ ...p, defaultTransition: e.target.value as any }))}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="cut">Cut</option>
            <option value="fade">Fade</option>
            <option value="dissolve">Dissolve</option>
            <option value="wipe">Wipe</option>
          </select>
        </div>

        {/* Output Resolution */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Resolution</label>
          <select
            value={local.outputResolution || '1920x1080'}
            onChange={e => setLocal(p => ({ ...p, outputResolution: e.target.value as any }))}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="1920x1080">1920×1080 (HD)</option>
            <option value="1280x720">1280×720 (720p)</option>
            <option value="3840x2160">3840×2160 (4K)</option>
          </select>
        </div>

        {/* FPS */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Frame Rate</label>
          <select
            value={local.outputFps || 24}
            onChange={e => setLocal(p => ({ ...p, outputFps: Number(e.target.value) as any }))}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value={24}>24 fps</option>
            <option value={25}>25 fps</option>
            <option value={30}>30 fps</option>
          </select>
        </div>

        {/* Dialogue Volume */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Dialogue Volume ({Math.round((local.dialogueVolume ?? 1) * 100)}%)
          </label>
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={local.dialogueVolume ?? 1}
            onChange={e => setLocal(p => ({ ...p, dialogueVolume: Number(e.target.value) }))}
            className="w-full"
          />
        </div>

        {/* Music URL */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Background Music URL (optional)</label>
          <input
            type="url"
            value={local.backgroundMusicUrl || ''}
            onChange={e => setLocal(p => ({ ...p, backgroundMusicUrl: e.target.value || undefined }))}
            placeholder="https://..."
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>

        {local.backgroundMusicUrl && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Music Volume ({Math.round((local.musicVolume ?? 0.15) * 100)}%)
            </label>
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={local.musicVolume ?? 0.15}
              onChange={e => setLocal(p => ({ ...p, musicVolume: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
        )}

        {/* Slate toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="addSlate"
            checked={local.addSlate || false}
            onChange={e => setLocal(p => ({ ...p, addSlate: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor="addSlate" className="text-xs text-gray-700">Add title slate</label>
        </div>

        {/* End card toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="addEndCard"
            checked={local.addEndCard || false}
            onChange={e => setLocal(p => ({ ...p, addEndCard: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor="addEndCard" className="text-xs text-gray-700">Add end card</label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function VideoAssemblyPanel({
  episodeId,
  seriesId,
  organizationId,
  episodeTitle,
}: VideoAssemblyPanelProps) {
  const [assemblies, setAssemblies] = useState<VideoAssembly[]>([]);
  const [settings, setSettings] = useState<Partial<AssemblySettings>>({});
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assemblyType, setAssemblyType] = useState<'rough_cut' | 'final_cut'>('rough_cut');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [assemblyList, savedSettings] = await Promise.all([
        getAssembliesForEpisode(episodeId),
        getAssemblySettings(organizationId),
      ]);
      setAssemblies(assemblyList);
      if (savedSettings) setSettings(savedSettings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [episodeId, organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll in-progress assemblies
  useEffect(() => {
    const inProgress = assemblies.find(
      a => a.status === 'rendering' || a.status === 'building_timeline'
    );
    if (!inProgress) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    if (pollRef.current) return; // already polling

    pollRef.current = setInterval(async () => {
      setPollingId(inProgress.id);
      try {
        const newStatus = await syncAssemblyStatus(inProgress.id);
        if (newStatus === 'completed' || newStatus === 'failed') {
          await loadData();
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        } else {
          // Refresh just this record
          setAssemblies(prev =>
            prev.map(a => a.id === inProgress.id ? { ...a, status: newStatus } : a)
          );
        }
      } catch {
        // silent — will retry next interval
      } finally {
        setPollingId(null);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [assemblies, loadData]);

  async function handleTrigger() {
    setError(null);
    setTriggering(true);
    try {
      await triggerAssembly(episodeId, seriesId, organizationId, { assemblyType });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTriggering(false);
    }
  }

  async function handleManualRefresh(id: string) {
    setPollingId(id);
    try {
      await syncAssemblyStatus(id);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPollingId(null);
    }
  }

  async function handleSaveSettings(newSettings: Partial<AssemblySettings>) {
    await saveAssemblySettings(organizationId, newSettings);
    setSettings(newSettings);
  }

  const hasActiveAssembly = assemblies.some(
    a => a.status === 'rendering' || a.status === 'building_timeline'
  );
  const hasApiKey = !!settings.shotstackApiKey;

  const latestCompleted = assemblies.find(a => a.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading assembly status...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-600" />
            Video Assembly
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Assemble rendered shots into a complete rough cut episode
          </p>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          <Settings className="w-4 h-4" />
          Settings
          {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* API key warning */}
      {!hasApiKey && (
        <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Shotstack API key required</p>
            <p className="text-xs mt-0.5">
              Open Settings above and enter your Shotstack API key to enable video assembly.
              Get a free key at{' '}
              <a href="https://shotstack.io" target="_blank" rel="noreferrer" className="underline">
                shotstack.io
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Source legend */}
      <div className="flex gap-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><Video className="w-3 h-3 text-purple-500" /> Lip-sync video (best quality)</span>
        <span className="flex items-center gap-1.5"><Video className="w-3 h-3 text-blue-500" /> Veo3 rendered video</span>
        <span className="flex items-center gap-1.5"><Image className="w-3 h-3 text-gray-400" /> Storyboard still (fallback)</span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Latest completed — quick access */}
      {latestCompleted?.outputUrl && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-800 font-medium">
              <CheckCircle className="w-4 h-4" />
              Rough cut ready — {formatDuration(latestCompleted.outputDurationSeconds)}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={latestCompleted.outputUrl}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800"
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            </div>
          </div>
          <video src={latestCompleted.outputUrl} controls className="w-full rounded bg-black" style={{ maxHeight: 300 }} />
        </div>
      )}

      {/* Trigger new assembly */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={assemblyType}
          onChange={e => setAssemblyType(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={hasActiveAssembly || triggering}
        >
          <option value="rough_cut">Rough Cut</option>
          <option value="final_cut">Final Cut</option>
        </select>
        <button
          onClick={handleTrigger}
          disabled={!hasApiKey || hasActiveAssembly || triggering}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {triggering ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Building timeline...</>
          ) : hasActiveAssembly ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Rendering in progress...</>
          ) : (
            <><Layers className="w-4 h-4" /> Assemble {assemblyType === 'rough_cut' ? 'Rough Cut' : 'Final Cut'}</>
          )}
        </button>
        {assemblies.length > 0 && (
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        )}
      </div>

      {/* Assembly history */}
      {assemblies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Assembly History ({assemblies.length})
          </h3>
          {assemblies.map(assembly => (
            <AssemblyCard
              key={assembly.id}
              assembly={assembly}
              onRefresh={handleManualRefresh}
              isPolling={pollingId === assembly.id}
            />
          ))}
        </div>
      )}

      {assemblies.length === 0 && !loading && (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No assemblies yet.</p>
          <p className="text-xs mt-1">Click "Assemble Rough Cut" above to generate your first edit.</p>
        </div>
      )}

      {/* FFmpeg Editor cross-reference */}
      {latestCompleted && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <Scissors className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-900">Want smarter editing?</p>
            <p className="text-xs text-indigo-700 mt-0.5">
              Use the <strong>FFmpeg Editor</strong> in the sidebar for intelligent cuts, transitions, audio mixing, and format-aware pacing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
