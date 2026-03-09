import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Flag,
  Quote,
  BarChart,
  MapPin,
  Users,
  GitBranch,
  FileText,
  Sparkles,
  Clock,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import {
  accuracyCheckService,
  AccuracyReport,
  AccuracyCheck,
  AccuracySummary,
} from '../services/accuracyCheckService';

interface AccuracyCheckPanelProps {
  scriptId: string;
  organizationId?: string;
  scriptContent?: Record<string, unknown>;
  historicalPeriod?: string;
  onRegenerateRequest?: () => void;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  verified: CheckCircle,
  needs_citation: AlertCircle,
  unverified: HelpCircle,
  disputed: XCircle,
  corrected: RefreshCw,
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  verified: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  needs_citation: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  unverified: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  disputed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  corrected: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const CHECK_TYPE_ICONS: Record<string, React.ElementType> = {
  date: Calendar,
  person: User,
  event: Flag,
  quote: Quote,
  statistic: BarChart,
  location: MapPin,
  fact: CheckCircle,
  relationship: Users,
  causation: GitBranch,
};

export default function AccuracyCheckPanel({
  scriptId,
  organizationId,
  scriptContent,
  historicalPeriod = 'General history',
  onRegenerateRequest,
}: AccuracyCheckPanelProps) {
  const [summary, setSummary] = useState<AccuracySummary | null>(null);
  const [report, setReport] = useState<AccuracyReport | null>(null);
  const [checks, setChecks] = useState<AccuracyCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['disputed', 'needs_citation'])
  );
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryData = await accuracyCheckService.getAccuracySummary(scriptId);
      setSummary(summaryData);

      if (summaryData.has_report && summaryData.report_id) {
        const [reportData, checksData] = await Promise.all([
          accuracyCheckService.getLatestReport(scriptId),
          accuracyCheckService.getReportChecks(summaryData.report_id),
        ]);
        setReport(reportData);
        setChecks(checksData);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as any)?.message || JSON.stringify(err) || 'Failed to load accuracy data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runAccuracyCheck = async () => {
    if (!scriptContent) {
      setError('Script content is required to run accuracy check');
      return;
    }

    setRunning(true);
    setError(null);

    try {
      await accuracyCheckService.performAccuracyCheck(
        scriptId,
        organizationId,
        scriptContent,
        historicalPeriod
      );
      await loadData();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as any)?.message || JSON.stringify(err) || 'Failed to run accuracy check';
      setError(msg);
    } finally {
      setRunning(false);
    }
  };

  const handleResolve = async (checkId: string, notes?: string) => {
    try {
      await accuracyCheckService.resolveCheck(checkId, notes);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve check');
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const groupedChecks = checks.reduce(
    (acc, check) => {
      const status = check.verification_status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(check);
      return acc;
    },
    {} as Record<string, AccuracyCheck[]>
  );

  const filteredChecks =
    filterStatus === 'all' ? checks : checks.filter((c) => c.verification_status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!summary?.has_report ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-gray-900 font-medium mb-1">No accuracy check yet</h3>
          <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
            Run an AI-powered accuracy check to verify historical claims in your
            documentary script and identify any facts that need citations or corrections.
          </p>
          <button
            onClick={runAccuracyCheck}
            disabled={running || !scriptContent}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Analyzing Script...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Accuracy Check
              </>
            )}
          </button>
          {!scriptContent && (
            <p className="text-xs text-gray-400 mt-2">
              Script content must be loaded to run accuracy check
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Accuracy Report</h3>
              <div className="flex items-center gap-2">
                {report?.completed_at && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(report.completed_at).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={runAccuracyCheck}
                  disabled={running}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
                  Re-check
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${getScoreColor(summary.overall_score || 0)}`}
                >
                  {summary.overall_score || 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Overall Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">
                  {summary.verified || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">Verified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-yellow-600">
                  {summary.needs_citation || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">Need Citation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-red-600">
                  {summary.disputed || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">Disputed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-600">
                  {summary.total_claims || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">Total Claims</div>
              </div>
            </div>

            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex">
              {summary.verified && summary.total_claims && (
                <div
                  className="bg-green-500 h-full"
                  style={{
                    width: `${(summary.verified / summary.total_claims) * 100}%`,
                  }}
                />
              )}
              {summary.needs_citation && summary.total_claims && (
                <div
                  className="bg-yellow-500 h-full"
                  style={{
                    width: `${(summary.needs_citation / summary.total_claims) * 100}%`,
                  }}
                />
              )}
              {summary.disputed && summary.total_claims && (
                <div
                  className="bg-red-500 h-full"
                  style={{
                    width: `${(summary.disputed / summary.total_claims) * 100}%`,
                  }}
                />
              )}
              {summary.unverified && summary.total_claims && (
                <div
                  className="bg-gray-400 h-full"
                  style={{
                    width: `${(summary.unverified / summary.total_claims) * 100}%`,
                  }}
                />
              )}
            </div>

            {report?.should_regenerate && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800 mb-1">
                      Script Regeneration Recommended
                    </h4>
                    <p className="text-sm text-amber-700 mb-3">
                      The accuracy check found issues that could be improved by
                      regenerating the script with corrections. The AI will preserve the
                      narrative while fixing disputed facts.
                    </p>
                    {onRegenerateRequest && (
                      <button
                        onClick={onRegenerateRequest}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Regenerate Script with Corrections
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Claims ({checks.length})</option>
              <option value="disputed">
                Disputed ({groupedChecks['disputed']?.length || 0})
              </option>
              <option value="needs_citation">
                Needs Citation ({groupedChecks['needs_citation']?.length || 0})
              </option>
              <option value="unverified">
                Unverified ({groupedChecks['unverified']?.length || 0})
              </option>
              <option value="verified">
                Verified ({groupedChecks['verified']?.length || 0})
              </option>
            </select>
          </div>

          {['disputed', 'needs_citation', 'unverified', 'verified'].map((status) => {
            const statusChecks =
              filterStatus === 'all'
                ? groupedChecks[status] || []
                : status === filterStatus
                  ? filteredChecks
                  : [];

            if (statusChecks.length === 0) return null;

            const StatusIcon = STATUS_ICONS[status];
            const colors = STATUS_COLORS[status];
            const isExpanded = expandedSections.has(status);

            return (
              <div key={status} className={`border rounded-lg ${colors.border}`}>
                <button
                  onClick={() => toggleSection(status)}
                  className={`w-full flex items-center justify-between p-4 ${colors.bg}`}
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-5 h-5 ${colors.text}`} />
                    <span className={`font-medium capitalize ${colors.text}`}>
                      {status.replace('_', ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${colors.bg} ${colors.text}`}
                    >
                      {statusChecks.length}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-3 bg-white">
                    {statusChecks.map((check) => {
                      const TypeIcon = CHECK_TYPE_ICONS[check.check_type] || FileText;
                      const confidence =
                        accuracyCheckService.calculateConfidenceLevel(
                          check.ai_confidence_score
                        );

                      return (
                        <div
                          key={check.id}
                          className={`border rounded-lg p-4 ${check.resolved ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <TypeIcon className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
                                  {check.check_type}
                                </span>
                                {check.location_act && (
                                  <span className="text-xs text-gray-500">
                                    Act {check.location_act}
                                    {check.location_scene && `, Scene ${check.location_scene}`}
                                  </span>
                                )}
                                {check.flagged_for_review && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                    Flagged
                                  </span>
                                )}
                              </div>

                              <p className="text-sm text-gray-900 font-medium mb-2">
                                "{check.checked_item}"
                              </p>

                              {check.ai_reasoning && (
                                <p className="text-sm text-gray-600 mb-2">
                                  {check.ai_reasoning}
                                </p>
                              )}

                              {check.suggested_correction && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                                  <p className="text-sm text-blue-800">
                                    <strong>Suggested correction:</strong>{' '}
                                    {check.suggested_correction}
                                  </p>
                                  {check.correction_source && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      Source: {check.correction_source}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1">
                                  <div
                                    className={`w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden`}
                                  >
                                    <div
                                      className={`h-full ${getScoreBgColor(check.ai_confidence_score)}`}
                                      style={{
                                        width: `${check.ai_confidence_score}%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`text-xs ${confidence.color === 'green' ? 'text-green-600' : confidence.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}
                                  >
                                    {check.ai_confidence_score}% confidence
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {!check.resolved ? (
                                <button
                                  onClick={() => handleResolve(check.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                  Resolve
                                </button>
                              ) : (
                                <span className="px-3 py-1.5 text-sm text-gray-500 flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" />
                                  Resolved
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
