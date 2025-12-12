import React, { useState, useEffect } from 'react';
import {
  Shield,
  Database,
  HardDrive,
  Archive,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Play
} from 'lucide-react';
import { monitoringService } from '../services/monitoringService';
import { backupService } from '../services/backupService';
import type { SystemHealth } from '../services/monitoringService';

interface SystemHealthWidgetProps {
  onNavigateToBackup?: () => void;
}

export function SystemHealthWidget({ onNavigateToBackup }: SystemHealthWidgetProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedWarning, setExpandedWarning] = useState<'database' | 'storage' | 'backups' | null>(null);
  const [runningIntegrityCheck, setRunningIntegrityCheck] = useState(false);
  const [integrityCheckResult, setIntegrityCheckResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      }
      setError(null);
      const healthData = await monitoringService.getSystemHealth();
      setHealth(healthData);
      setIntegrityCheckResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadHealth(true);
  };

  const handleRunIntegrityCheck = async () => {
    setRunningIntegrityCheck(true);
    setIntegrityCheckResult(null);
    try {
      await backupService.runIntegrityCheck();
      setIntegrityCheckResult('success');
      await loadHealth(true);
    } catch {
      setIntegrityCheckResult('error');
    } finally {
      setRunningIntegrityCheck(false);
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getStatusBadgeColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error Loading System Health</h3>
            <p className="text-sm text-red-700 mt-1">{error || 'Unknown error'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow p-6 border-2 ${getStatusColor(health.overall_status)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <h3 className="text-lg font-bold">System Health</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(health.overall_status)}`}>
            {health.overall_status.toUpperCase()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <button
          onClick={() => health.warnings?.database && setExpandedWarning(expandedWarning === 'database' ? null : 'database')}
          className={`flex items-center gap-3 text-left ${health.warnings?.database ? 'cursor-pointer hover:bg-white/30 rounded-lg p-1 -m-1 transition-colors' : ''}`}
          disabled={!health.warnings?.database}
        >
          <Database className="w-5 h-5" />
          <div className="flex-1">
            <div className="text-xs opacity-75 mb-1">Database</div>
            <div className="flex items-center gap-2">
              {getStatusIcon(health.checks.database)}
              <span className="text-sm font-medium">{health.checks.database}</span>
              {health.warnings?.database && (
                expandedWarning === 'database' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </div>
          </div>
        </button>

        <button
          onClick={() => health.warnings?.storage && setExpandedWarning(expandedWarning === 'storage' ? null : 'storage')}
          className={`flex items-center gap-3 text-left ${health.warnings?.storage ? 'cursor-pointer hover:bg-white/30 rounded-lg p-1 -m-1 transition-colors' : ''}`}
          disabled={!health.warnings?.storage}
        >
          <HardDrive className="w-5 h-5" />
          <div className="flex-1">
            <div className="text-xs opacity-75 mb-1">Storage</div>
            <div className="flex items-center gap-2">
              {getStatusIcon(health.checks.storage)}
              <span className="text-sm font-medium">{health.checks.storage}</span>
              {health.warnings?.storage && (
                expandedWarning === 'storage' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </div>
          </div>
        </button>

        <button
          onClick={() => health.warnings?.backups && setExpandedWarning(expandedWarning === 'backups' ? null : 'backups')}
          className={`flex items-center gap-3 text-left ${health.warnings?.backups ? 'cursor-pointer hover:bg-white/30 rounded-lg p-1 -m-1 transition-colors' : ''}`}
          disabled={!health.warnings?.backups}
        >
          <Archive className="w-5 h-5" />
          <div className="flex-1">
            <div className="text-xs opacity-75 mb-1">Backups</div>
            <div className="flex items-center gap-2">
              {getStatusIcon(health.checks.backups)}
              <span className="text-sm font-medium">{health.checks.backups}</span>
              {health.warnings?.backups && (
                expandedWarning === 'backups' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              )}
            </div>
          </div>
        </button>
      </div>

      {expandedWarning === 'database' && health.warnings?.database && (
        <div className="mb-4 p-4 bg-white/50 rounded-lg border border-yellow-300">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">Why am I seeing this warning?</h4>
              <p className="text-sm text-yellow-800">{health.warnings.database}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-4 pt-3 border-t border-yellow-200">
            <Info className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">What is an integrity check?</h4>
              <p className="text-sm text-yellow-800">
                An integrity check verifies that all your data (characters, assets, scripts, and their relationships)
                is consistent and uncorrupted in the database. It helps catch potential issues before they become problems.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunIntegrityCheck}
              disabled={runningIntegrityCheck}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {runningIntegrityCheck ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Check...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Integrity Check
                </>
              )}
            </button>
            {integrityCheckResult === 'success' && (
              <span className="flex items-center gap-1 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                Check completed successfully
              </span>
            )}
            {integrityCheckResult === 'error' && (
              <span className="flex items-center gap-1 text-sm text-red-700">
                <XCircle className="w-4 h-4" />
                Check failed. Please try again.
              </span>
            )}
          </div>
        </div>
      )}

      {expandedWarning === 'storage' && health.warnings?.storage && (
        <div className="mb-4 p-4 bg-white/50 rounded-lg border border-yellow-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">Why am I seeing this warning?</h4>
              <p className="text-sm text-yellow-800">{health.warnings.storage}</p>
            </div>
          </div>
        </div>
      )}

      {expandedWarning === 'backups' && health.warnings?.backups && (
        <div className="mb-4 p-4 bg-white/50 rounded-lg border border-yellow-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">Why am I seeing this warning?</h4>
              <p className="text-sm text-yellow-800">{health.warnings.backups}</p>
              <p className="text-sm text-yellow-800 mt-2">
                Use the "View Backup & Recovery" button below to create a recovery point.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-current/20 pt-4 mt-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="opacity-75 mb-1">Characters</div>
            <div className="font-bold text-lg">{health.statistics.total_characters}</div>
          </div>
          <div>
            <div className="opacity-75 mb-1">Storage Files</div>
            <div className="font-bold text-lg">{health.statistics.storage_files}</div>
          </div>
          <div>
            <div className="opacity-75 mb-1">Recent Backups</div>
            <div className="font-bold text-lg">{health.statistics.recent_backups}</div>
          </div>
        </div>
      </div>

      {health.statistics.failed_integrity_checks > 0 && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <span className="font-medium">{health.statistics.failed_integrity_checks}</span> failed
              integrity check{health.statistics.failed_integrity_checks !== 1 ? 's' : ''} in the last 24 hours
            </div>
          </div>
        </div>
      )}

      {onNavigateToBackup && (
        <button
          onClick={onNavigateToBackup}
          className="w-full mt-4 bg-white/50 hover:bg-white/80 text-current py-2 rounded-lg font-medium transition-colors"
        >
          View Backup & Recovery
        </button>
      )}

      <div className="text-xs opacity-50 text-center mt-3">
        Last checked: {new Date(health.last_check).toLocaleTimeString()}
      </div>
    </div>
  );
}
