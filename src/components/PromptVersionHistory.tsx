import { useState } from 'react';
import {
  X,
  Clock,
  CheckCircle,
  GitCompare,
  Upload,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus
} from 'lucide-react';
import { deployVersion, compareVersions, type PromptVersion, type VersionDiff } from '../services/promptLibraryService';

interface PromptVersionHistoryProps {
  templateId: string;
  versions: PromptVersion[];
  currentVersion: PromptVersion | null;
  onSelectVersion: (version: PromptVersion) => void;
  onClose: () => void;
  onVersionDeployed: () => void;
}

export function PromptVersionHistory({
  versions,
  currentVersion,
  onSelectVersion,
  onClose,
  onVersionDeployed
}: PromptVersionHistoryProps) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [comparing, setComparing] = useState<{ v1: PromptVersion; v2: PromptVersion } | null>(null);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);

  const handleCompare = (version: PromptVersion) => {
    if (!currentVersion) return;

    const deployedVersion = versions.find((v) => v.is_deployed);
    if (!deployedVersion) return;

    const v1 = deployedVersion;
    const v2 = version;

    setComparing({ v1, v2 });
    setDiff(compareVersions(v1.prompt_content, v2.prompt_content));
  };

  const handleDeploy = async (version: PromptVersion) => {
    setDeploying(version.id);
    try {
      await deployVersion(version.id);
      onVersionDeployed();
    } catch (error) {
      console.error('Failed to deploy version:', error);
    } finally {
      setDeploying(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-600" />
          Version History
        </h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {comparing && diff ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Comparing v{comparing.v1.version_number} with v{comparing.v2.version_number}
            </div>
            <button
              onClick={() => {
                setComparing(null);
                setDiff(null);
              }}
              className="text-sm text-teal-600 hover:underline"
            >
              Back to list
            </button>
          </div>

          <div className="space-y-3">
            {diff.deletions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                  <Minus className="w-3 h-3" />
                  Removed Lines ({diff.deletions.length})
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  {diff.deletions.map((line, i) => (
                    <div
                      key={i}
                      className="font-mono text-xs text-red-800 bg-red-100 px-2 py-1 rounded"
                    >
                      - {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diff.additions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Added Lines ({diff.additions.length})
                </h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                  {diff.additions.map((line, i) => (
                    <div
                      key={i}
                      className="font-mono text-xs text-green-800 bg-green-100 px-2 py-1 rounded"
                    >
                      + {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diff.changes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-700 mb-2">
                  Modified Lines ({diff.changes.length})
                </h4>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  {diff.changes.map((change, i) => (
                    <div key={i} className="space-y-1">
                      <div className="font-mono text-xs text-red-700 bg-red-100 px-2 py-1 rounded line-through">
                        {change.before}
                      </div>
                      <div className="font-mono text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        {change.after}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diff.additions.length === 0 &&
              diff.deletions.length === 0 &&
              diff.changes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>No differences found</p>
                </div>
              )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-2">
            {versions.map((version) => {
              const isExpanded = expandedVersion === version.id;
              const isDeployed = version.is_deployed;
              const isDeploying = deploying === version.id;

              return (
                <div
                  key={version.id}
                  className={`border rounded-lg overflow-hidden transition-colors ${
                    isDeployed
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <button
                    onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isDeployed
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {version.version_number}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Version {version.version_number}
                          </span>
                          {isDeployed && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Deployed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(version.created_at)}</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      {version.change_notes && (
                        <p className="text-sm text-gray-600 mt-3 mb-3 italic">
                          "{version.change_notes}"
                        </p>
                      )}

                      <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs max-h-40 overflow-auto mb-3">
                        {version.prompt_content.substring(0, 500)}
                        {version.prompt_content.length > 500 && '...'}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectVersion(version)}
                          className="flex-1 px-3 py-1.5 text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Load
                        </button>
                        {!isDeployed && (
                          <>
                            <button
                              onClick={() => handleCompare(version)}
                              className="flex-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-1"
                            >
                              <GitCompare className="w-3.5 h-3.5" />
                              Compare
                            </button>
                            <button
                              onClick={() => handleDeploy(version)}
                              disabled={isDeploying}
                              className="flex-1 px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              {isDeploying ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              Deploy
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {versions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No version history available</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <p className="text-xs text-gray-500 text-center">
          {versions.length} version{versions.length !== 1 ? 's' : ''} saved
        </p>
      </div>
    </div>
  );
}
