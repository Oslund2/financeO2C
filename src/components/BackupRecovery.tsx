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
  Activity,
  RotateCcw,
  X
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
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restorePointId, setRestorePointId] = useState<string | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<any>(null);

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

  const handleRestoreClick = (pointId: string) => {
    setRestorePointId(pointId);
    setShowRestoreModal(true);
    setRestoreConfirmation(false);
    setRestoreSuccess(null);
    setError(null);
  };

  const handleRestoreConfirm = async () => {
    if (!restorePointId || !restoreConfirmation) {
      setError('Please confirm that you understand the risks before restoring');
      return;
    }

    setRestoring(true);
    setError(null);
    try {
      const result = await backupService.restoreFromRecoveryPoint(restorePointId);
      setRestoreSuccess(result);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore from recovery point');
    } finally {
      setRestoring(false);
    }
  };

  const handleCloseRestoreModal = () => {
    setShowRestoreModal(false);
    setRestorePointId(null);
    setRestoreConfirmation(false);
    setRestoreSuccess(null);
    setError(null);
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
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreClick(point.id);
                          }}
                          disabled={point.status !== 'valid'}
                          className="ml-4 flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
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

      {showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <RotateCcw className="w-6 h-6 text-orange-600" />
                Restore from Recovery Point
              </h2>
              <button
                onClick={handleCloseRestoreModal}
                disabled={restoring}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {restoreSuccess ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-green-900 mb-2">Restoration Complete!</h3>
                        <p className="text-green-700 text-sm mb-4">
                          Your system has been successfully restored to the selected recovery point.
                        </p>
                        <div className="bg-white rounded border border-green-200 p-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Recovery Point:</span>
                            <span className="font-medium text-gray-900">{restoreSuccess.recovery_point_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tables Restored:</span>
                            <span className="font-medium text-gray-900">{restoreSuccess.tables_restored}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Storage Files Restored:</span>
                            <span className="font-medium text-gray-900">{restoreSuccess.storage_restoration?.files_restored || 0}</span>
                          </div>
                          {restoreSuccess.storage_restoration?.files_failed > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Files Failed:</span>
                              <span className="font-medium text-red-600">{restoreSuccess.storage_restoration.files_failed}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Safety Backup Created:</span>
                            <span className="font-medium text-gray-900 text-xs">{restoreSuccess.safety_backup_id}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseRestoreModal}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-red-900 mb-2">Warning: Data Will Be Overwritten</h3>
                        <p className="text-red-700 text-sm mb-3">
                          This action will restore your entire system to the state captured in the selected recovery point.
                          All current data will be replaced.
                        </p>
                        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                          <li>All series, characters, assets, and scripts will be replaced</li>
                          <li>Storage files will be restored from backup</li>
                          <li>This action cannot be undone (but a safety backup will be created first)</li>
                          <li>Any data created after this recovery point will be lost</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-blue-900 mb-2">Safety Features</h3>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                          <li>An automatic safety backup will be created before restoration begins</li>
                          <li>The entire restoration process is transactional (all or nothing)</li>
                          <li>If restoration fails, no changes will be made to your data</li>
                          <li>You can restore from the safety backup if needed</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-medium text-red-900">Error</h3>
                          <p className="text-red-700 text-sm">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">What will be restored:</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      {restorePointId && (() => {
                        const point = recoveryPoints.find(p => p.id === restorePointId);
                        if (!point) return null;
                        return (
                          <>
                            <div className="flex justify-between">
                              <span>Recovery Point:</span>
                              <span className="font-medium">{point.point_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Created:</span>
                              <span className="font-medium">{formatDate(point.created_at)}</span>
                            </div>
                            {point.description && (
                              <div className="pt-2 border-t border-gray-300">
                                <span className="text-gray-600">Description:</span>
                                <p className="mt-1 text-gray-900">{point.description}</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <label className="flex items-start gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={restoreConfirmation}
                      onChange={(e) => setRestoreConfirmation(e.target.checked)}
                      className="mt-1 w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">I understand the risks</div>
                      <div className="text-sm text-gray-600 mt-1">
                        I confirm that I want to restore from this recovery point and understand that current data will be overwritten.
                        A safety backup will be created automatically before restoration.
                      </div>
                    </div>
                  </label>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCloseRestoreModal}
                      disabled={restoring}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRestoreConfirm}
                      disabled={!restoreConfirmation || restoring}
                      className="flex-1 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {restoring ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-5 h-5" />
                          Restore System
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
