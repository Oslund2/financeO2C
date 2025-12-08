import React, { useState, useEffect } from 'react';
import {
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  History,
  Shield,
  Download,
  RefreshCw,
  Archive,
  Activity
} from 'lucide-react';
import { backupService } from '../services/backupService';
import type {
  RecoveryPoint,
  IntegrityCheck,
  BackupSchedule
} from '../services/backupService';

export default function BackupRecovery() {
  const [activeTab, setActiveTab] = useState<'recovery' | 'integrity' | 'schedules' | 'audit'>('recovery');
  const [recoveryPoints, setRecoveryPoints] = useState<RecoveryPoint[]>([]);
  const [integrityChecks, setIntegrityChecks] = useState<IntegrityCheck[]>([]);
  const [backupSchedules, setBackupSchedules] = useState<BackupSchedule[]>([]);
  const [auditLog, setAuditLog] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<RecoveryPoint | null>(null);
  const [newPointName, setNewPointName] = useState('');
  const [newPointDesc, setNewPointDesc] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case 'recovery':
          const points = await backupService.listRecoveryPoints();
          setRecoveryPoints(points);
          break;
        case 'integrity':
          const checks = await backupService.getIntegrityChecks(50);
          setIntegrityChecks(checks);
          break;
        case 'schedules':
          const schedules = await backupService.getBackupSchedules();
          setBackupSchedules(schedules);
          break;
        case 'audit':
          const logs = await backupService.getAuditLog(undefined, undefined, 100);
          setAuditLog(logs);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecoveryPoint = async () => {
    if (!newPointName.trim()) {
      setError('Recovery point name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await backupService.createRecoveryPoint(newPointName, newPointDesc);
      setNewPointName('');
      setNewPointDesc('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recovery point');
    } finally {
      setLoading(false);
    }
  };

  const handleRunIntegrityCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      await backupService.runIntegrityCheck();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run integrity check');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await backupService.updateBackupSchedule(scheduleId, { enabled });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
      case 'valid':
      case 'active':
        return 'text-green-600';
      case 'failed':
      case 'invalid':
        return 'text-red-600';
      case 'warning':
      case 'expired':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
      case 'invalid':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Backup & Recovery</h1>
        <p className="text-gray-600">
          Manage system backups, recovery points, and data integrity monitoring
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'recovery', label: 'Recovery Points', icon: Archive },
              { id: 'integrity', label: 'Integrity Checks', icon: Shield },
              { id: 'schedules', label: 'Backup Schedules', icon: Clock },
              { id: 'audit', label: 'Audit Log', icon: History }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`px-6 py-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'recovery' && (
            <div>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Create New Recovery Point
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Recovery point name"
                    value={newPointName}
                    onChange={(e) => setNewPointName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newPointDesc}
                    onChange={(e) => setNewPointDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleCreateRecoveryPoint}
                    disabled={loading || !newPointName.trim()}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Create Recovery Point
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Available Recovery Points</h3>
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : recoveryPoints.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No recovery points found
                  </div>
                ) : (
                  recoveryPoints.map((point) => (
                    <div
                      key={point.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => setSelectedPoint(point)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{point.point_name}</h4>
                            {getStatusIcon(point.status)}
                            <span className={`text-sm ${getStatusColor(point.status)}`}>
                              {point.status}
                            </span>
                          </div>
                          {point.description && (
                            <p className="text-sm text-gray-600 mb-2">{point.description}</p>
                          )}
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Created: {formatDate(point.created_at)}</div>
                            {point.created_by && <div>By: {point.created_by}</div>}
                            {point.expires_at && (
                              <div>Expires: {formatDate(point.expires_at)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'integrity' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="font-medium text-gray-900">Data Integrity Status</h3>
                <button
                  onClick={handleRunIntegrityCheck}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  Run Integrity Check
                </button>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : integrityChecks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No integrity checks found. Run your first check above.
                  </div>
                ) : (
                  integrityChecks.map((check) => (
                    <div
                      key={check.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(check.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{check.check_type}</h4>
                            <span className={`text-sm ${getStatusColor(check.status)}`}>
                              {check.status}
                            </span>
                          </div>
                          {check.target_table && (
                            <div className="text-sm text-gray-600 mb-2">
                              Table: {check.target_table}
                            </div>
                          )}
                          {check.issues_found && check.issues_found.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
                              <h5 className="font-medium text-red-900 text-sm mb-2">
                                Issues Found:
                              </h5>
                              <ul className="text-sm text-red-700 space-y-1">
                                {check.issues_found.map((issue: any, idx) => (
                                  <li key={idx}>
                                    {issue.issue} {issue.count && `(${issue.count})`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Checked: {formatDate(check.checked_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedules' && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Automated Backup Schedules</h3>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : backupSchedules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No backup schedules configured
                  </div>
                ) : (
                  backupSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {schedule.schedule_name}
                          </h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Type: {schedule.schedule_type}</div>
                            <div>Frequency: {schedule.frequency}</div>
                            <div>Retention: {schedule.retention_days} days</div>
                            {schedule.last_run_at && (
                              <div>Last run: {formatDate(schedule.last_run_at)}</div>
                            )}
                            {schedule.next_run_at && (
                              <div>Next run: {formatDate(schedule.next_run_at)}</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleSchedule(schedule.id, !schedule.enabled)}
                          className={`px-4 py-2 rounded-lg font-medium ${
                            schedule.enabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {schedule.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Recent Changes</h3>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : auditLog.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No audit logs found</div>
                ) : (
                  auditLog.map((log) => (
                    <div
                      key={log.id}
                      className="border border-gray-200 rounded-lg p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium text-gray-900">{log.table_name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                log.operation === 'INSERT'
                                  ? 'bg-green-100 text-green-800'
                                  : log.operation === 'UPDATE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {log.operation}
                            </span>
                          </div>
                          {log.change_description && (
                            <div className="text-gray-600 mb-1">{log.change_description}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            {formatDate(log.changed_at)}
                            {log.changed_by && ` • ${log.changed_by}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
