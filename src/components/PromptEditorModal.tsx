import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Save,
  History,
  Sparkles,
  Play,
  AlertTriangle,
  CheckCircle,
  Copy,
  Eye,
  Code,
  Variable,
  FileText,
  ChevronRight
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  createPromptVersion,
  deployVersion,
  getVersionHistory,
  type PromptTemplate,
  type PromptVersion,
  type PromptVariable,
  extractVariablesFromTemplate,
  estimateTokenCount
} from '../services/promptLibraryService';
import { PromptVersionHistory } from './PromptVersionHistory';
import { PromptEnhancementPanel } from './PromptEnhancementPanel';
import { PromptTestPanel } from './PromptTestPanel';

interface PromptEditorModalProps {
  prompt: PromptTemplate;
  onClose: () => void;
  onSave: () => void;
  initialSidePanel?: SidePanel;
}

type EditorTab = 'editor' | 'variables' | 'preview';
type SidePanel = 'none' | 'history' | 'enhance' | 'test';

export function PromptEditorModal({ prompt, onClose, onSave, initialSidePanel = 'none' }: PromptEditorModalProps) {
  const { currentOrganization } = useOrganization();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [activeTab, setActiveTab] = useState<EditorTab>('editor');
  const [sidePanel, setSidePanel] = useState<SidePanel>(initialSidePanel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<PromptVersion | null>(null);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    loadVersions();
  }, [prompt.id]);

  const loadVersions = async () => {
    try {
      const { versions: versionList } = await getVersionHistory(prompt.id, 50);
      setVersions(versionList);

      const deployed = versionList.find((v) => v.is_deployed);
      if (deployed) {
        setCurrentVersion(deployed);
        setContent(deployed.prompt_content);
        setOriginalContent(deployed.prompt_content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history');
    }
  };

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      setHasUnsavedChanges(newContent !== originalContent);
    },
    [originalContent]
  );

  const handleSaveVersion = async (deploy: boolean = false) => {
    if (!currentOrganization || !content.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const newVersion = await createPromptVersion(
        prompt.id,
        content,
        changeNotes || undefined,
        prompt.variables_schema
      );

      if (deploy) {
        await deployVersion(newVersion.id);
        setSuccess('Version saved and deployed successfully');
      } else {
        setSuccess('Version saved successfully');
      }

      setOriginalContent(content);
      setHasUnsavedChanges(false);
      setChangeNotes('');
      await loadVersions();

      setTimeout(() => {
        setSuccess(null);
        if (deploy) {
          onSave();
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save version');
    } finally {
      setSaving(false);
    }
  };

  const handleVersionSelect = (version: PromptVersion) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        'You have unsaved changes. Loading a different version will discard them. Continue?'
      );
      if (!confirm) return;
    }

    setContent(version.prompt_content);
    setOriginalContent(version.is_deployed ? version.prompt_content : originalContent);
    setCurrentVersion(version);
    setHasUnsavedChanges(!version.is_deployed);
    setSidePanel('none');
  };

  const handleEnhancementAccepted = (enhancedContent: string) => {
    setContent(enhancedContent);
    setHasUnsavedChanges(true);
    setSidePanel('none');
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    onClose();
  };

  const detectedVariables = extractVariablesFromTemplate(content);
  const tokenCount = estimateTokenCount(content);

  const renderPreview = () => {
    let preview = content;
    for (const [key, value] of Object.entries(previewVariables)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      preview = preview.replace(regex, value || `[${key}]`);
    }
    return preview;
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative flex flex-1 m-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-teal-600" />
              <div>
                <h2 className="font-semibold text-gray-900">{prompt.prompt_name}</h2>
                <p className="text-sm text-gray-500">
                  {prompt.category} | {prompt.prompt_key}
                </p>
              </div>
              {hasUnsavedChanges && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                  Unsaved
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidePanel(sidePanel === 'history' ? 'none' : 'history')}
                className={`p-2 rounded-lg transition-colors ${
                  sidePanel === 'history'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Version History"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSidePanel(sidePanel === 'enhance' ? 'none' : 'enhance')}
                className={`p-2 rounded-lg transition-colors ${
                  sidePanel === 'enhance'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="AI Enhancement"
              >
                <Sparkles className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSidePanel(sidePanel === 'test' ? 'none' : 'test')}
                className={`p-2 rounded-lg transition-colors ${
                  sidePanel === 'test'
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Test Prompt"
              >
                <Play className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-2" />
              <button
                onClick={handleClose}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {(error || success) && (
            <div
              className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 ${
                error
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}
            >
              {error ? (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm">{error || success}</span>
            </div>
          )}

          <div className="flex border-b border-gray-200">
            {[
              { key: 'editor', label: 'Editor', icon: Code },
              { key: 'variables', label: 'Variables', icon: Variable },
              { key: 'preview', label: 'Preview', icon: Eye }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as EditorTab)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'editor' && (
              <div className="h-full flex flex-col">
                <textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="flex-1 w-full p-4 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  placeholder="Enter prompt content..."
                  spellCheck={false}
                />
                <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>{content.length} characters</span>
                    <span>~{tokenCount} tokens</span>
                    <span>{detectedVariables.length} variables</span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(content)}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'variables' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Detected Variables</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Variables use the format ${'{'}variable_name{'}'}. Set sample values to preview
                    how the prompt will render.
                  </p>

                  {detectedVariables.length === 0 ? (
                    <p className="text-gray-500 text-sm">No variables detected in the prompt.</p>
                  ) : (
                    <div className="space-y-3">
                      {detectedVariables.map((varName) => {
                        const schema = prompt.variables_schema?.find(
                          (v: PromptVariable) => v.name === varName
                        );
                        return (
                          <div key={varName} className="flex items-start gap-3">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                ${'{'}
                                {varName}
                                {'}'}
                                {schema?.required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </label>
                              {schema?.description && (
                                <p className="text-xs text-gray-500 mb-1">{schema.description}</p>
                              )}
                              <input
                                type="text"
                                value={previewVariables[varName] || ''}
                                onChange={(e) =>
                                  setPreviewVariables((prev) => ({
                                    ...prev,
                                    [varName]: e.target.value
                                  }))
                                }
                                placeholder={schema?.example || `Enter ${varName}...`}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {prompt.variables_schema && prompt.variables_schema.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Schema Documentation</h3>
                    <div className="space-y-2">
                      {prompt.variables_schema.map((v: PromptVariable) => (
                        <div
                          key={v.name}
                          className="flex items-start gap-2 text-sm text-blue-800"
                        >
                          <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <code className="font-mono bg-blue-100 px-1 rounded">
                              {v.name}
                            </code>
                            <span className="text-blue-600 ml-1">({v.type})</span>
                            {v.required && (
                              <span className="text-red-600 ml-1">(required)</span>
                            )}
                            {v.description && (
                              <span className="text-blue-700 ml-1">- {v.description}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="h-full">
                <div className="p-4 bg-gray-900 text-gray-100 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-auto h-full">
                  {renderPreview()}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="Change notes (optional)..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                onClick={() => handleSaveVersion(false)}
                disabled={saving || !hasUnsavedChanges}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={() => handleSaveVersion(true)}
                disabled={saving || !hasUnsavedChanges}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save & Deploy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {sidePanel !== 'none' && (
          <div className="w-96 border-l border-gray-200 flex flex-col bg-gray-50">
            {sidePanel === 'history' && (
              <PromptVersionHistory
                templateId={prompt.id}
                versions={versions}
                currentVersion={currentVersion}
                onSelectVersion={handleVersionSelect}
                onClose={() => setSidePanel('none')}
                onVersionDeployed={loadVersions}
              />
            )}
            {sidePanel === 'enhance' && (
              <PromptEnhancementPanel
                content={content}
                promptKey={prompt.prompt_key}
                category={prompt.category}
                onAccept={handleEnhancementAccepted}
                onClose={() => setSidePanel('none')}
              />
            )}
            {sidePanel === 'test' && (
              <PromptTestPanel
                content={content}
                variables={previewVariables}
                onClose={() => setSidePanel('none')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
