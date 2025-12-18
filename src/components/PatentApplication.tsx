import { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  List,
  Image,
  BookOpen,
  Download,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit3,
  Eye,
  Copy,
  Loader2,
  FileCheck,
  Scroll,
  X,
  AlertTriangle,
  ExternalLink,
  Search,
  Globe,
  Sparkles,
  TrendingUp,
  Target,
  Award,
  BarChart3,
  Lightbulb,
  FileImage,
  Printer
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  getPatentApplications,
  getPatentApplication,
  createPatentApplication,
  updatePatentApplication,
  deletePatentApplication,
  generateDefaultSpecification,
  generateDefaultAbstract,
  countWords,
  validateAbstract,
  getFilingTypeLabel,
  getStatusLabel,
  getStatusColor,
  type PatentApplication,
  type PatentApplicationWithDetails,
  type PatentClaim,
  type PatentDrawing
} from '../services/patentApplicationService';
import {
  generateClaimsForApplication,
  formatClaimForDisplay,
  getClaimTypeLabel,
  getCategoryLabel,
  validateClaims,
  countClaimsByType
} from '../services/patentClaimsService';
import {
  generateDrawingsForApplication,
  svgToDataUrl,
  formatDrawingsDescriptionSection
} from '../services/patentDrawingsService';
import {
  generateCompletePatentApplication,
  type PatentGenerationProgress
} from '../services/patentWorkflowOrchestrator';
import {
  searchPriorArt,
  getPriorArtResults
} from '../services/patentPriorArtSearchService';
import {
  performNoveltyAnalysis,
  getNoveltyAnalysis
} from '../services/patentNoveltyAnalysisService';
import {
  generateSelfPatentApplication,
  checkExistingSelfPatent,
  type SelfPatentProgress
} from '../services/selfPatentGenerationService';
import jsPDF from 'jspdf';

type TabId = 'overview' | 'specification' | 'claims' | 'drawings' | 'abstract' | 'prior-art' | 'analysis' | 'export';

export function PatentApplication() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [applications, setApplications] = useState<PatentApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<PatentApplicationWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState(false);
  const [editingAbstract, setEditingAbstract] = useState(false);
  const [tempSpec, setTempSpec] = useState('');
  const [tempAbstract, setTempAbstract] = useState('');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState<PatentGenerationProgress | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selfPatentGenerating, setSelfPatentGenerating] = useState(false);
  const [selfPatentProgress, setSelfPatentProgress] = useState<SelfPatentProgress | null>(null);
  const [showSelfPatentModal, setShowSelfPatentModal] = useState(false);

  const convertSvgToPng = (svgContent: string, width: number = 800, height: number = 600): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = width;
      canvas.height = height;

      const img = new window.Image();
      img.onload = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load SVG image'));
      img.src = svgToDataUrl(svgContent);
    });
  };

  useEffect(() => {
    if (currentOrganization) {
      loadApplications();
    }
  }, [currentOrganization]);

  const loadApplications = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    setError(null);
    try {
      const apps = await getPatentApplications(currentOrganization.id);
      setApplications(apps);
      if (apps.length > 0 && !selectedApp) {
        await loadApplication(apps[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const loadApplication = async (appId: string) => {
    setLoading(true);
    try {
      const app = await getPatentApplication(appId);
      setSelectedApp(app);
      if (app) {
        setTempSpec(app.specification || '');
        setTempAbstract(app.abstract || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApplication = async (data: {
    title: string;
    inventionDescription: string;
    technicalField: string;
    problemSolved: string;
  }) => {
    if (!currentOrganization) return;
    setSaving(true);
    try {
      const app = await createPatentApplication(currentOrganization.id, {
        title: data.title,
        inventionDescription: data.inventionDescription,
        technicalField: data.technicalField,
        problemSolved: data.problemSolved,
        specification: generateDefaultSpecification(),
        abstract: generateDefaultAbstract()
      });
      await loadApplications();
      await loadApplication(app.id);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create application');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      await deletePatentApplication(selectedApp.id);
      setSelectedApp(null);
      setShowDeleteModal(false);
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete application');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSpecification = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      await updatePatentApplication(selectedApp.id, { specification: tempSpec });
      setSelectedApp({ ...selectedApp, specification: tempSpec });
      setEditingSpec(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save specification');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAbstract = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      await updatePatentApplication(selectedApp.id, { abstract: tempAbstract });
      setSelectedApp({ ...selectedApp, abstract: tempAbstract });
      setEditingAbstract(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save abstract');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateClaims = async () => {
    if (!selectedApp) return;
    setGenerating(true);
    try {
      const claims = await generateClaimsForApplication(selectedApp.id);
      setSelectedApp({ ...selectedApp, claims });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate claims');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateDrawings = async () => {
    if (!selectedApp || !currentOrganization) return;
    setGenerating(true);
    try {
      const drawings = await generateDrawingsForApplication(selectedApp.id, currentOrganization.id);
      setSelectedApp({ ...selectedApp, drawings });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate drawings');
    } finally {
      setGenerating(false);
    }
  };

  const handleAIGeneration = async () => {
    if (!selectedApp || !currentOrganization || !user) return;
    setAiGenerating(true);
    setShowAiModal(true);
    setError(null);

    try {
      const result = await generateCompletePatentApplication(
        {
          applicationId: selectedApp.id,
          organizationId: currentOrganization.id,
          userId: user.id,
          title: selectedApp.title,
          description: selectedApp.summary_invention || '',
          skipPriorArtSearch: false,
          useAIClaims: true
        },
        (progress) => {
          setAiProgress(progress);
        }
      );

      await loadApplication(selectedApp.id);
      setShowAiModal(false);
      setAiProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate patent application');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSelfPatentGeneration = async () => {
    if (!currentOrganization || !user) return;

    setSelfPatentGenerating(true);
    setShowSelfPatentModal(true);
    setError(null);

    try {
      // Check if self-patent already exists
      const existingId = await checkExistingSelfPatent(currentOrganization.id);
      if (existingId) {
        setError('A patent for this application already exists. Loading it now...');
        await loadApplication(existingId);
        setShowSelfPatentModal(false);
        setSelfPatentProgress(null);
        return;
      }

      const result = await generateSelfPatentApplication(
        currentOrganization.id,
        user.id,
        (progress) => {
          setSelfPatentProgress(progress);
        }
      );

      if (result.success && result.applicationId) {
        await loadApplications();
        await loadApplication(result.applicationId);
        setShowSelfPatentModal(false);
        setSelfPatentProgress(null);
      } else {
        throw new Error(result.error || 'Failed to generate self-patent application');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate self-patent application');
    } finally {
      setSelfPatentGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedApp) return;

    setExporting(true);
    try {
      const drawingsWithImages: Map<number, string> = new Map();
      if (selectedApp.drawings.length > 0) {
        for (const drawing of selectedApp.drawings) {
          if (drawing.svg_content) {
            try {
              const pngDataUrl = await convertSvgToPng(drawing.svg_content, 800, 600);
              drawingsWithImages.set(drawing.figure_number, pngDataUrl);
            } catch {
              console.warn(`Failed to convert drawing ${drawing.figure_number} to PNG`);
            }
          }
        }
      }

      const pdf = new jsPDF('p', 'pt', 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 72;
      const maxWidth = pageWidth - margin * 2;
      let yPos = margin;

      pdf.setFont('times', 'bold');
      pdf.setFontSize(14);
      pdf.text(selectedApp.title.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
      yPos += 30;

      pdf.setFont('times', 'normal');
      pdf.setFontSize(12);

      if (selectedApp.inventor_name) {
        pdf.text(`Inventor: ${selectedApp.inventor_name}`, margin, yPos);
        yPos += 18;
      }
      pdf.text(`Citizenship: ${selectedApp.inventor_citizenship}`, margin, yPos);
      yPos += 30;

      if (selectedApp.abstract) {
        pdf.setFont('times', 'bold');
        pdf.text('ABSTRACT', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;
        pdf.setFont('times', 'normal');
        const abstractLines = pdf.splitTextToSize(selectedApp.abstract, maxWidth);
        pdf.text(abstractLines, margin, yPos);
        yPos += abstractLines.length * 14 + 30;
      }

      if (selectedApp.specification) {
        if (yPos > 600) {
          pdf.addPage();
          yPos = margin;
        }
        const specLines = selectedApp.specification.split('\n');
        for (const line of specLines) {
          if (yPos > 700) {
            pdf.addPage();
            yPos = margin;
          }
          if (line.match(/^[A-Z\s]+$/) && line.trim().length > 0) {
            pdf.setFont('times', 'bold');
            yPos += 10;
            pdf.text(line, margin, yPos);
            pdf.setFont('times', 'normal');
            yPos += 18;
          } else {
            const wrapped = pdf.splitTextToSize(line, maxWidth);
            pdf.text(wrapped, margin, yPos);
            yPos += wrapped.length * 14;
          }
        }
      }

      if (selectedApp.claims.length > 0) {
        pdf.addPage();
        yPos = margin;
        pdf.setFont('times', 'bold');
        pdf.setFontSize(14);
        pdf.text('CLAIMS', pageWidth / 2, yPos, { align: 'center' });
        yPos += 30;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(12);

        for (const claim of selectedApp.claims.sort((a, b) => a.claim_number - b.claim_number)) {
          if (yPos > 650) {
            pdf.addPage();
            yPos = margin;
          }
          const claimText = `${claim.claim_number}. ${claim.claim_text}`;
          const wrapped = pdf.splitTextToSize(claimText, maxWidth);
          pdf.text(wrapped, margin, yPos);
          yPos += wrapped.length * 14 + 20;
        }
      }

      if (selectedApp.drawings.length > 0) {
        for (const drawing of selectedApp.drawings.sort((a, b) => a.figure_number - b.figure_number)) {
          pdf.addPage();
          pdf.setFont('times', 'bold');
          pdf.setFontSize(12);
          pdf.text(`FIG. ${drawing.figure_number} - ${drawing.title}`, pageWidth / 2, margin, { align: 'center' });

          const pngDataUrl = drawingsWithImages.get(drawing.figure_number);
          if (pngDataUrl) {
            const imgMaxWidth = maxWidth;
            const imgMaxHeight = pageHeight - margin * 2 - 100;
            const aspectRatio = 800 / 600;
            let imgWidth = imgMaxWidth;
            let imgHeight = imgWidth / aspectRatio;
            if (imgHeight > imgMaxHeight) {
              imgHeight = imgMaxHeight;
              imgWidth = imgHeight * aspectRatio;
            }
            const imgX = (pageWidth - imgWidth) / 2;
            const imgY = margin + 30;
            pdf.addImage(pngDataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight);
          }

          pdf.setFont('times', 'normal');
          pdf.setFontSize(10);
          if (drawing.description) {
            const descLines = pdf.splitTextToSize(drawing.description, maxWidth);
            const descY = pngDataUrl ? margin + 30 + (pageHeight - margin * 2 - 100) + 20 : margin + 50;
            pdf.text(descLines, margin, Math.min(descY, 680));
          }
        }
      }

      pdf.save(`${selectedApp.title.replace(/\s+/g, '_')}_Patent_Application.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'specification', label: 'Specification', icon: FileText },
    { id: 'claims', label: 'Claims', icon: List },
    { id: 'drawings', label: 'Drawings', icon: Image },
    { id: 'abstract', label: 'Abstract', icon: BookOpen },
    { id: 'prior-art', label: 'Prior Art', icon: Scroll },
    { id: 'analysis', label: 'AI Analysis', icon: BarChart3 },
    { id: 'export', label: 'Export', icon: Download }
  ];

  if (loading && applications.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading patent applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            IP Protection
          </h1>
          <p className="text-gray-600 mt-1">Manage patent applications and intellectual property documentation</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleSelfPatentGeneration}
            disabled={selfPatentGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {selfPatentGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Patent for This App
              </>
            )}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Application
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Applications</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {applications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No applications yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Create your first application
                  </button>
                </div>
              ) : (
                applications.map(app => (
                  <button
                    key={app.id}
                    onClick={() => loadApplication(app.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedApp?.id === app.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <p className="font-medium text-gray-900 truncate">{app.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Updated {new Date(app.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {selectedApp ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <OverviewTab
                    application={selectedApp}
                    onUpdate={async (updates) => {
                      await updatePatentApplication(selectedApp.id, updates);
                      setSelectedApp({ ...selectedApp, ...updates });
                    }}
                    onDelete={() => setShowDeleteModal(true)}
                    onAIGenerate={handleAIGeneration}
                    aiGenerating={aiGenerating}
                  />
                )}

                {activeTab === 'specification' && (
                  <SpecificationTab
                    specification={editingSpec ? tempSpec : selectedApp.specification || ''}
                    editing={editingSpec}
                    saving={saving}
                    onEdit={() => {
                      setTempSpec(selectedApp.specification || '');
                      setEditingSpec(true);
                    }}
                    onChange={setTempSpec}
                    onSave={handleSaveSpecification}
                    onCancel={() => setEditingSpec(false)}
                    onRegenerate={() => setTempSpec(generateDefaultSpecification())}
                  />
                )}

                {activeTab === 'claims' && (
                  <ClaimsTab
                    claims={selectedApp.claims}
                    generating={generating}
                    onGenerate={handleGenerateClaims}
                  />
                )}

                {activeTab === 'drawings' && (
                  <DrawingsTab
                    drawings={selectedApp.drawings}
                    generating={generating}
                    onGenerate={handleGenerateDrawings}
                  />
                )}

                {activeTab === 'abstract' && (
                  <AbstractTab
                    abstract={editingAbstract ? tempAbstract : selectedApp.abstract || ''}
                    editing={editingAbstract}
                    saving={saving}
                    onEdit={() => {
                      setTempAbstract(selectedApp.abstract || '');
                      setEditingAbstract(true);
                    }}
                    onChange={setTempAbstract}
                    onSave={handleSaveAbstract}
                    onCancel={() => setEditingAbstract(false)}
                    onRegenerate={() => setTempAbstract(generateDefaultAbstract())}
                  />
                )}

                {activeTab === 'prior-art' && (
                  <PriorArtTab application={selectedApp} />
                )}

                {activeTab === 'analysis' && (
                  <AnalysisTab application={selectedApp} />
                )}

                {activeTab === 'export' && (
                  <ExportTab
                    application={selectedApp}
                    onExportPDF={handleExportPDF}
                    exporting={exporting}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Application Selected</h3>
              <p className="text-gray-600 mb-4">Select an application from the list or create a new one.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Application
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateApplicationModal
          saving={saving}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateApplication}
        />
      )}

      {showDeleteModal && selectedApp && (
        <DeleteConfirmModal
          title={selectedApp.title}
          saving={saving}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteApplication}
        />
      )}

      {showAiModal && (
        <AIGenerationProgressModal
          progress={aiProgress}
          onClose={() => {
            if (!aiGenerating) {
              setShowAiModal(false);
              setAiProgress(null);
            }
          }}
        />
      )}

      {showSelfPatentModal && (
        <SelfPatentProgressModal
          progress={selfPatentProgress}
          onClose={() => {
            if (!selfPatentGenerating) {
              setShowSelfPatentModal(false);
              setSelfPatentProgress(null);
            }
          }}
        />
      )}
    </div>
  );
}

function OverviewTab({
  application,
  onUpdate,
  onDelete,
  onAIGenerate,
  aiGenerating
}: {
  application: PatentApplicationWithDetails;
  onUpdate: (updates: Partial<PatentApplication>) => Promise<void>;
  onDelete: () => void;
  onAIGenerate: () => void;
  aiGenerating: boolean;
}) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(application.title);
  const [inventorName, setInventorName] = useState(application.inventor_name || '');
  const [filingType, setFilingType] = useState(application.filing_type);
  const [status, setStatus] = useState(application.status);
  const [inventionDescription, setInventionDescription] = useState(application.invention_description || '');
  const [technicalField, setTechnicalField] = useState(application.technical_field || '');
  const [problemSolved, setProblemSolved] = useState(application.problem_solved || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        title,
        inventor_name: inventorName || null,
        filing_type: filingType,
        status,
        invention_description: inventionDescription || null,
        technical_field: technicalField || null,
        problem_solved: problemSolved || null
      });
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const claimCounts = countClaimsByType(application.claims);
  const claimValidation = validateClaims(application.claims);

  const getApprovalScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-emerald-600 bg-emerald-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    if (score >= 20) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getApprovalLabel = (score: number) => {
    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Application Overview</h2>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onAIGenerate}
                disabled={aiGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 shadow-md"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {application.auto_generated ? 'Regenerate with AI' : 'Generate with AI'}
                  </>
                )}
              </button>
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            {editMode ? (
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-900">{application.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inventor Name</label>
            {editMode ? (
              <input
                type="text"
                value={inventorName}
                onChange={e => setInventorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter inventor name"
              />
            ) : (
              <p className="text-gray-900">{application.inventor_name || 'Not specified'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Citizenship</label>
            <p className="text-gray-900">{application.inventor_citizenship}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filing Type</label>
            {editMode ? (
              <select
                value={filingType}
                onChange={e => setFilingType(e.target.value as PatentApplication['filing_type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="provisional">Provisional Application</option>
                <option value="non_provisional">Non-Provisional Application</option>
                <option value="continuation">Continuation Application</option>
                <option value="cip">Continuation-in-Part (CIP)</option>
                <option value="divisional">Divisional Application</option>
              </select>
            ) : (
              <p className="text-gray-900">{getFilingTypeLabel(application.filing_type)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            {editMode ? (
              <select
                value={status}
                onChange={e => setStatus(e.target.value as PatentApplication['status'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="ready_to_file">Ready to File</option>
                <option value="filed">Filed</option>
                <option value="pending">Pending at USPTO</option>
                <option value="granted">Granted</option>
                <option value="rejected">Rejected</option>
                <option value="abandoned">Abandoned</option>
              </select>
            ) : (
              <span className={`inline-flex px-3 py-1 rounded-full text-sm ${getStatusColor(application.status)}`}>
                {getStatusLabel(application.status)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {application.approval_score !== null && application.approval_score !== undefined && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  Patent Strength
                </h3>
                {application.auto_generated && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    AI Enhanced
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Approval Probability</span>
                    <span className={`text-2xl font-bold ${getApprovalScoreColor(application.approval_score)}`}>
                      {Math.round(application.approval_score)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        application.approval_score >= 80 ? 'bg-green-500' :
                        application.approval_score >= 60 ? 'bg-emerald-500' :
                        application.approval_score >= 40 ? 'bg-yellow-500' :
                        application.approval_score >= 20 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${application.approval_score}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-sm font-medium ${getApprovalScoreColor(application.approval_score)}`}>
                      {getApprovalLabel(application.approval_score)}
                    </span>
                    {application.approval_confidence && (
                      <span className="text-xs text-gray-500">
                        {Math.round(application.approval_confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {application.novelty_score ? Math.round(application.novelty_score) : '-'}
                    </div>
                    <div className="text-xs text-gray-600">Novelty Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {application.claims?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Total Claims</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Application Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Version</span>
                <span className="font-medium">{application.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Claims</span>
                <span className="font-medium">{claimCounts.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Independent Claims</span>
                <span className="font-medium">{claimCounts.independent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dependent Claims</span>
                <span className="font-medium">{claimCounts.dependent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Drawings</span>
                <span className="font-medium">{application.drawings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Abstract Words</span>
                <span className="font-medium">{countWords(application.abstract || '')}/150</span>
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-4 ${claimValidation.valid ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {claimValidation.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              <h3 className="font-medium text-gray-900">Claims Validation</h3>
            </div>
            {claimValidation.valid ? (
              <p className="text-sm text-green-700">All claims are properly formatted</p>
            ) : (
              <ul className="text-sm text-yellow-700 space-y-1">
                {claimValidation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="text-sm text-gray-500">
            <p>Created: {new Date(application.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(application.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Invention Details</h3>
          {!application.invention_description && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Required for AI generation</span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invention Description</label>
            {editMode ? (
              <textarea
                value={inventionDescription}
                onChange={e => setInventionDescription(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your invention in detail - what it does, how it works, what makes it novel..."
              />
            ) : (
              <div className={`p-3 rounded-lg ${application.invention_description ? 'bg-gray-50' : 'bg-amber-50 border border-amber-200'}`}>
                {application.invention_description ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{application.invention_description}</p>
                ) : (
                  <p className="text-amber-700 text-sm">No invention description provided. Click Edit to add one for accurate AI generation.</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technical Field</label>
              {editMode ? (
                <input
                  type="text"
                  value={technicalField}
                  onChange={e => setTechnicalField(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Computer-implemented methods, Data processing"
                />
              ) : (
                <p className="text-gray-700">{application.technical_field || 'Not specified'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Problem Solved</label>
              {editMode ? (
                <input
                  type="text"
                  value={problemSolved}
                  onChange={e => setProblemSolved(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What technical problem does this invention solve?"
                />
              ) : (
                <p className="text-gray-700">{application.problem_solved || 'Not specified'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecificationTab({
  specification,
  editing,
  saving,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onRegenerate
}: {
  specification: string;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRegenerate: () => void;
}) {
  const isTemplate = specification === generateDefaultSpecification();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Specification</h2>
          {isTemplate && !editing && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
              <Sparkles className="w-3 h-3" />
              Template
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => onChange('')}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={onRegenerate}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Template
              </button>
              <button onClick={onCancel} className="px-3 py-1.5 text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          value={specification}
          onChange={e => onChange(e.target.value)}
          className="w-full h-[600px] px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{specification || 'No specification yet'}</pre>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Word count: {countWords(specification).toLocaleString()}
      </p>
    </div>
  );
}

function ClaimsTab({
  claims,
  generating,
  onGenerate
}: {
  claims: PatentClaim[];
  generating: boolean;
  onGenerate: () => void;
}) {
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

  const sortedClaims = [...claims].sort((a, b) => a.claim_number - b.claim_number);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Patent Claims</h2>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Generate Claims
            </>
          )}
        </button>
      </div>

      {claims.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <List className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 mb-4">No claims generated yet</p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Generate Default Claims
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedClaims.map(claim => (
            <div key={claim.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedClaim(expandedClaim === claim.id ? null : claim.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium text-sm">
                    {claim.claim_number}
                  </span>
                  <div className="text-left">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      claim.claim_type === 'independent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {getClaimTypeLabel(claim.claim_type)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 ml-2">
                      {getCategoryLabel(claim.category)}
                    </span>
                  </div>
                </div>
                {expandedClaim === claim.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {expandedClaim === claim.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 mt-4 bg-gray-50 p-4 rounded-lg">
                    {formatClaimForDisplay(claim)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DrawingsTab({
  drawings,
  generating,
  onGenerate
}: {
  drawings: PatentDrawing[];
  generating: boolean;
  onGenerate: () => void;
}) {
  const [selectedDrawing, setSelectedDrawing] = useState<PatentDrawing | null>(null);

  const sortedDrawings = [...drawings].sort((a, b) => a.figure_number - b.figure_number);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Patent Drawings</h2>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Generate Drawings
            </>
          )}
        </button>
      </div>

      {drawings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileImage className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium text-gray-900 mb-2">No Patent Drawings Yet</p>
          <p className="text-sm text-gray-600 mb-4">
            Click "Generate Drawings" to automatically create technical diagrams for your patent application
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sortedDrawings.map(drawing => (
            <div
              key={drawing.id}
              className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 cursor-pointer transition-colors"
              onClick={() => setSelectedDrawing(drawing)}
            >
              <div className="aspect-[4/3] bg-white rounded overflow-hidden mb-2">
                {drawing.svg_content && (
                  <img src={svgToDataUrl(drawing.svg_content)} alt={`FIG. ${drawing.figure_number}`} className="w-full h-full object-contain" />
                )}
              </div>
              <p className="text-sm font-medium text-gray-900">FIG. {drawing.figure_number}</p>
              <p className="text-xs text-gray-600 truncate">{drawing.title}</p>
            </div>
          ))}
        </div>
      )}

      {selectedDrawing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDrawing(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">FIG. {selectedDrawing.figure_number} - {selectedDrawing.title}</h3>
              <button onClick={() => setSelectedDrawing(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {selectedDrawing.svg_content && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <img src={svgToDataUrl(selectedDrawing.svg_content)} alt={`FIG. ${selectedDrawing.figure_number}`} className="w-full" />
                </div>
              )}
              {selectedDrawing.description && (
                <p className="text-sm text-gray-700">{selectedDrawing.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AbstractTab({
  abstract,
  editing,
  saving,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onRegenerate
}: {
  abstract: string;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRegenerate: () => void;
}) {
  const validation = validateAbstract(abstract);
  const isTemplate = abstract === generateDefaultAbstract();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Abstract</h2>
          {isTemplate && !editing && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
              <Sparkles className="w-3 h-3" />
              Template
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => onChange('')}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={onRegenerate}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Template
              </button>
              <button onClick={onCancel} className="px-3 py-1.5 text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving || !validation.valid}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className={`text-sm px-3 py-2 rounded-lg ${validation.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        {validation.message}
      </div>

      {editing ? (
        <textarea
          value={abstract}
          onChange={e => onChange(e.target.value)}
          className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter patent abstract (max 150 words)"
        />
      ) : (
        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-gray-800">{abstract || 'No abstract yet'}</p>
        </div>
      )}
    </div>
  );
}

function PriorArtTab({ application }: { application: PatentApplicationWithDetails }) {
  const { currentOrganization } = useOrganization();
  const [priorArtResults, setPriorArtResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPriorArtResults();
  }, [application.id]);

  const loadPriorArtResults = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading prior art results for application:', application.id);
      const results = await getPriorArtResults(application.id);
      console.log('Loaded prior art results:', results.length);
      setPriorArtResults(results);
    } catch (err) {
      console.error('Failed to load prior art results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prior art results');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPriorArt = async () => {
    if (!currentOrganization) {
      setError('No organization selected');
      return;
    }

    setSearching(true);
    setError(null);
    try {
      await searchPriorArt(
        currentOrganization.id,
        application.id,
        {
          title: application.title,
          description: application.summary_invention || application.abstract || 'AI-powered animation production and patent management system',
          maxResults: 10
        }
      );
      await loadPriorArtResults();
    } catch (err) {
      console.error('Failed to search prior art:', err);
      setError(err instanceof Error ? err.message : 'Failed to search prior art');
    } finally {
      setSearching(false);
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600 bg-red-50';
    if (score >= 0.6) return 'text-orange-600 bg-orange-50';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.8) return 'Very High';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Moderate';
    return 'Low';
  };

  const patentDatabases = [
    {
      name: 'Google Patents',
      url: 'https://patents.google.com/',
      description: 'User-friendly search across US, EU, WIPO, and other patent offices worldwide',
      recommended: true
    },
    {
      name: 'USPTO Patent Public Search',
      url: 'https://ppubs.uspto.gov/pubwebapp/',
      description: 'Official USPTO search for all US patents and published applications'
    },
    {
      name: 'USPTO Basic Search',
      url: 'https://ppubs.uspto.gov/pubwebapp/static/pages/ppubsbasic.html',
      description: 'Simplified USPTO search by keywords, inventor, or patent number'
    },
    {
      name: 'Espacenet (EPO)',
      url: 'https://worldwide.espacenet.com/',
      description: 'European Patent Office database with 150+ million documents worldwide'
    },
    {
      name: 'WIPO PatentScope',
      url: 'https://patentscope.wipo.int/search/en/search.jsf',
      description: 'World Intellectual Property Organization international patent database'
    }
  ];

  const literatureDatabases = [
    {
      name: 'Google Scholar',
      url: 'https://scholar.google.com/',
      description: 'Academic papers, theses, books, and conference papers',
      recommended: true
    },
    {
      name: 'IEEE Xplore',
      url: 'https://ieeexplore.ieee.org/',
      description: 'Technical literature for engineering and technology inventions'
    },
    {
      name: 'PubMed',
      url: 'https://pubmed.ncbi.nlm.nih.gov/',
      description: 'Biomedical and life sciences literature from NCBI'
    },
    {
      name: 'arXiv',
      url: 'https://arxiv.org/',
      description: 'Preprints in physics, mathematics, computer science, and more'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Prior Art Analysis</h2>
        <button
          onClick={handleSearchPriorArt}
          disabled={searching}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              {priorArtResults.length > 0 ? 'Search Again' : 'Search Prior Art'}
            </>
          )}
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Important Notice</p>
            <p className="text-sm text-yellow-700 mt-1">
              AI-discovered prior art should be reviewed by a patent attorney during the formal filing process.
              These results help identify potential conflicts and inform differentiation strategies.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Search Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : priorArtResults.length > 0 ? (
        <>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">AI-Discovered Prior Art</h3>
                <p className="text-sm text-blue-700">Found {priorArtResults.length} relevant patents</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {priorArtResults.map((result) => (
              <div key={result.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {result.patent_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRelevanceColor(result.relevance_score)}`}>
                          {getRelevanceLabel(result.relevance_score)}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 line-clamp-2">{result.title}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Relevance:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              result.relevance_score >= 0.8 ? 'bg-red-500' :
                              result.relevance_score >= 0.6 ? 'bg-orange-500' :
                              result.relevance_score >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${result.relevance_score * 100}%` }}
                          />
                        </div>
                        <span className="font-medium">{Math.round(result.relevance_score * 100)}%</span>
                      </div>
                    </div>
                    {result.similarity_score && (
                      <div>
                        <span className="text-gray-500">Similarity:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${result.similarity_score * 100}%` }}
                            />
                          </div>
                          <span className="font-medium">{Math.round(result.similarity_score * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-3">{result.abstract}</p>

                  {result.key_claims && result.key_claims.length > 0 && (
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Key Claims:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {result.key_claims.slice(0, 2).map((claim: string, i: number) => (
                          <li key={i} className="line-clamp-1">• {claim}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {expandedResult === result.id ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show Details
                      </>
                    )}
                  </button>

                  {expandedResult === result.id && (
                    <div className="border-t border-gray-200 pt-3 space-y-3">
                      {result.filing_date && (
                        <div>
                          <span className="text-xs font-medium text-gray-700">Filing Date:</span>
                          <p className="text-sm text-gray-600">{new Date(result.filing_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {result.assignee && (
                        <div>
                          <span className="text-xs font-medium text-gray-700">Assignee:</span>
                          <p className="text-sm text-gray-600">{result.assignee}</p>
                        </div>
                      )}
                      {result.differentiation_analysis && (
                        <div>
                          <span className="text-xs font-medium text-gray-700">Differentiation Analysis:</span>
                          <p className="text-sm text-gray-600 mt-1">{result.differentiation_analysis}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">No Prior Art Results Yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Click "Search Prior Art" to automatically discover relevant patents using AI
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Search Resources</h3>
        </div>

        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Patent Databases
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {patentDatabases.map((db) => (
                <a
                  key={db.name}
                  href={db.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-3 bg-white rounded-lg border transition-all hover:shadow-md hover:border-blue-300 ${
                    db.recommended ? 'ring-2 ring-blue-400 ring-offset-1' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900 text-sm">{db.name}</span>
                        {db.recommended && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{db.description}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Non-Patent Literature Databases
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {literatureDatabases.map((db) => (
                <a
                  key={db.name}
                  href={db.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-3 bg-white rounded-lg border transition-all hover:shadow-md hover:border-blue-300 ${
                    db.recommended ? 'ring-2 ring-blue-400 ring-offset-1' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900 text-sm">{db.name}</span>
                        {db.recommended && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{db.description}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-gray-400" />
            Patent References
          </h3>
          {application.prior_art_patents.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No patent references added yet</p>
          ) : (
            <ul className="space-y-2">
              {application.prior_art_patents.map((ref, i) => (
                <li key={i} className="text-sm">
                  {ref.reference_number} - {ref.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-400" />
            Non-Patent Literature
          </h3>
          {application.prior_art_literature.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No literature references added yet</p>
          ) : (
            <ul className="space-y-2">
              {application.prior_art_literature.map((ref, i) => (
                <li key={i} className="text-sm">
                  {ref.title} {ref.authors && `- ${ref.authors}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ExportTab({
  application,
  onExportPDF,
  exporting
}: {
  application: PatentApplicationWithDetails;
  onExportPDF: () => void;
  exporting: boolean;
}) {
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handleCopyText = () => {
    let text = `${application.title}\n\n`;
    text += `Inventor: ${application.inventor_name || 'Not specified'}\n`;
    text += `Citizenship: ${application.inventor_citizenship}\n\n`;
    text += `ABSTRACT\n\n${application.abstract || ''}\n\n`;
    text += `SPECIFICATION\n\n${application.specification || ''}\n\n`;
    text += `CLAIMS\n\n`;
    application.claims
      .sort((a, b) => a.claim_number - b.claim_number)
      .forEach(claim => {
        text += `${claim.claim_number}. ${claim.claim_text}\n\n`;
      });
    navigator.clipboard.writeText(text);
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const drawingsDescription = formatDrawingsDescriptionSection(application.drawings);
  const sortedClaims = [...application.claims].sort((a, b) => a.claim_number - b.claim_number);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Export Application</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Printer className="w-10 h-10 text-blue-600" />
          <div className="text-center">
            <p className="font-medium text-gray-900">Print Application</p>
            <p className="text-sm text-gray-500">Print complete filing document</p>
          </div>
        </button>

        <button
          onClick={onExportPDF}
          disabled={exporting}
          className={`flex flex-col items-center gap-3 p-6 border-2 rounded-xl transition-colors ${
            exporting
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {exporting ? (
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          ) : (
            <Download className="w-10 h-10 text-blue-600" />
          )}
          <div className="text-center">
            <p className="font-medium text-gray-900">{exporting ? 'Generating PDF...' : 'Export PDF'}</p>
            <p className="text-sm text-gray-500">{exporting ? 'Converting drawings to images' : 'Complete application document'}</p>
          </div>
        </button>

        <button
          onClick={handleCopyText}
          className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Copy className="w-10 h-10 text-blue-600" />
          <div className="text-center">
            <p className="font-medium text-gray-900">Copy Text</p>
            <p className="text-sm text-gray-500">Copy all text to clipboard</p>
          </div>
        </button>

        <button
          onClick={() => {
            const blob = new Blob([application.specification || ''], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'specification.txt';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <FileText className="w-10 h-10 text-blue-600" />
          <div className="text-center">
            <p className="font-medium text-gray-900">Specification TXT</p>
            <p className="text-sm text-gray-500">Download specification only</p>
          </div>
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Elements Included in Print/Export</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Title: {application.title}
          </li>
          <li className="flex items-center gap-2">
            {application.inventor_name ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            Inventor: {application.inventor_name || 'Not specified'}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Citizenship: {application.inventor_citizenship}
          </li>
          <li className="flex items-center gap-2">
            {application.abstract ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            Abstract ({countWords(application.abstract || '')} words)
          </li>
          <li className="flex items-center gap-2">
            {application.specification ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            Specification ({countWords(application.specification || '').toLocaleString()} words)
          </li>
          <li className="flex items-center gap-2">
            {application.claims.length > 0 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            Claims ({application.claims.length} total)
          </li>
          <li className="flex items-center gap-2">
            {application.drawings.length > 0 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            Drawings ({application.drawings.length} figures)
          </li>
        </ul>
      </div>

      <div id="patent-print-content" className="hidden print:block print:!visible">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{application.title}</h1>
          <p className="text-lg">Inventor: {application.inventor_name || 'Not specified'}</p>
          <p>Citizenship: {application.inventor_citizenship}</p>
          <p className="text-sm text-gray-600 mt-2">Filing Type: {application.filing_type === 'provisional' ? 'Provisional Patent Application' : 'Non-Provisional Patent Application'}</p>
        </div>

        {application.abstract && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">ABSTRACT</h2>
            <p className="text-justify whitespace-pre-wrap">{application.abstract}</p>
          </div>
        )}

        {application.specification && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">SPECIFICATION</h2>
            <div className="text-justify whitespace-pre-wrap">{application.specification}</div>
          </div>
        )}

        {sortedClaims.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">CLAIMS</h2>
            <div className="space-y-4">
              {sortedClaims.map(claim => (
                <p key={claim.id} className="text-justify">
                  <strong>{claim.claim_number}.</strong> {claim.claim_text}
                </p>
              ))}
            </div>
          </div>
        )}

        {application.drawings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b-2 border-black pb-2">BRIEF DESCRIPTION OF THE DRAWINGS</h2>
            <div className="whitespace-pre-wrap">{drawingsDescription}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateApplicationModal({
  saving,
  onClose,
  onCreate
}: {
  saving: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    inventionDescription: string;
    technicalField: string;
    problemSolved: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [inventionDescription, setInventionDescription] = useState('');
  const [technicalField, setTechnicalField] = useState('');
  const [problemSolved, setProblemSolved] = useState('');

  const canCreate = title.trim() && inventionDescription.trim().length >= 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Patent Application</h2>
            <p className="text-sm text-gray-500 mt-1">Describe your invention to generate an accurate patent specification</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invention Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., System and Method for Automated Document Processing"
            />
            <p className="text-xs text-gray-500 mt-1">A concise title describing your invention</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invention Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={inventionDescription}
              onChange={e => setInventionDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe your invention in detail. Include:
- What it does and how it works
- The key technical components or steps
- What makes it novel or different from existing solutions
- Any specific algorithms, data structures, or methods used"
            />
            <p className="text-xs text-gray-500 mt-1">
              {inventionDescription.length} characters (minimum 100 required)
              {inventionDescription.length < 100 && inventionDescription.length > 0 && (
                <span className="text-amber-600 ml-2">Need {100 - inventionDescription.length} more</span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technical Field</label>
            <input
              type="text"
              value={technicalField}
              onChange={e => setTechnicalField(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Computer-implemented methods, Data processing systems"
            />
            <p className="text-xs text-gray-500 mt-1">The technical domain of your invention</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Problem Solved</label>
            <textarea
              value={problemSolved}
              onChange={e => setProblemSolved(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What technical problem does your invention solve? What limitations of existing solutions does it address?"
            />
            <p className="text-xs text-gray-500 mt-1">The technical problem your invention addresses</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Important</p>
                <p>The patent specification will be generated based on your invention description. Be as detailed and specific as possible to ensure accurate results.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              onClick={() => onCreate({ title, inventionDescription, technicalField, problemSolved })}
              disabled={saving || !canCreate}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  title,
  saving,
  onClose,
  onConfirm
}: {
  title: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Delete Application</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete "{title}"? This action cannot be undone and all claims and drawings will be permanently removed.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AIGenerationProgressModal({
  progress,
  onClose
}: {
  progress: PatentGenerationProgress | null;
  onClose: () => void;
}) {
  const steps = [
    { label: 'Extracting Features', icon: Lightbulb },
    { label: 'Searching Prior Art', icon: Search },
    { label: 'Analyzing Differentiation', icon: Target },
    { label: 'Analyzing Novelty', icon: BarChart3 },
    { label: 'Generating Specification', icon: FileText },
    { label: 'Generating Claims', icon: List },
    { label: 'Creating Drawings', icon: Image }
  ];

  const currentStepIndex = progress ? progress.step : -1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">Generating Patent Application</h2>
            {progress && (
              <p className="text-sm text-gray-600">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isComplete = currentStepIndex > index;
            const isCurrent = currentStepIndex === index;
            const isPending = currentStepIndex < index;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isCurrent ? 'bg-blue-50 border border-blue-200' :
                  isComplete ? 'bg-green-50 border border-green-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCurrent ? 'bg-blue-500' :
                  isComplete ? 'bg-green-500' :
                  'bg-gray-300'
                }`}>
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  isCurrent ? 'text-blue-900' :
                  isComplete ? 'text-green-900' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {progress?.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-900">Error</span>
            </div>
            <p className="text-sm text-red-700">An error occurred during generation. Please try again.</p>
          </div>
        )}

        {progress?.status === 'completed' && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisTab({ application }: { application: PatentApplicationWithDetails }) {
  const [noveltyAnalysis, setNoveltyAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNoveltyAnalysis();
  }, [application.id]);

  const loadNoveltyAnalysis = async () => {
    setLoading(true);
    try {
      const analysis = await getNoveltyAnalysis(application.id);
      setNoveltyAnalysis(analysis);
    } catch (err) {
      console.error('Failed to load novelty analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!noveltyAnalysis) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">AI Analysis</h2>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">No Analysis Available Yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Generate the patent application with AI to see detailed novelty and feature analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">AI Analysis</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Overall Novelty</p>
              <p className="text-3xl font-bold text-blue-900">
                {noveltyAnalysis.overall_novelty_score ? Math.round(noveltyAnalysis.overall_novelty_score) : '-'}
              </p>
            </div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{ width: `${noveltyAnalysis.overall_novelty_score || 0}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-700 font-medium">Confidence</p>
              <p className="text-3xl font-bold text-emerald-900">
                {noveltyAnalysis.confidence_score ? Math.round(noveltyAnalysis.confidence_score * 100) : '-'}%
              </p>
            </div>
          </div>
          <div className="w-full bg-emerald-200 rounded-full h-2 mt-3">
            <div
              className="h-2 rounded-full bg-emerald-600"
              style={{ width: `${(noveltyAnalysis.confidence_score || 0) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-700 font-medium">Features Found</p>
              <p className="text-3xl font-bold text-purple-900">
                {noveltyAnalysis.key_features?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {noveltyAnalysis.patentability_assessment && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            Patentability Assessment
          </h3>
          <p className="text-gray-700 leading-relaxed">{noveltyAnalysis.patentability_assessment}</p>
        </div>
      )}

      {noveltyAnalysis.key_features && noveltyAnalysis.key_features.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            Key Features & Novelty Scores
          </h3>
          <div className="space-y-4">
            {noveltyAnalysis.key_features.map((feature: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h4 className="font-medium text-gray-900 flex-1">{feature.feature_name || `Feature ${index + 1}`}</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(feature.novelty_score || 0)}`}>
                    {feature.novelty_score ? Math.round(feature.novelty_score) : 0}/100
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (feature.novelty_score || 0) >= 80 ? 'bg-green-500' :
                      (feature.novelty_score || 0) >= 60 ? 'bg-blue-500' :
                      (feature.novelty_score || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${feature.novelty_score || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {noveltyAnalysis.strengths && noveltyAnalysis.strengths.length > 0 && (
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Strengths
            </h3>
            <ul className="space-y-2">
              {noveltyAnalysis.strengths.map((strength: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-green-800">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {noveltyAnalysis.weaknesses && noveltyAnalysis.weaknesses.length > 0 && (
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
            <h3 className="font-semibold text-orange-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {noveltyAnalysis.weaknesses.map((weakness: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {noveltyAnalysis.recommendations && noveltyAnalysis.recommendations.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {noveltyAnalysis.recommendations.map((rec: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="text-blue-600 mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SelfPatentProgressModal({
  progress,
  onClose
}: {
  progress: SelfPatentProgress | null;
  onClose: () => void;
}) {
  const getStageIcon = (stage: SelfPatentProgress['stage']) => {
    switch (stage) {
      case 'analyzing': return FileText;
      case 'extracting': return Search;
      case 'generating': return Sparkles;
      case 'creating': return Plus;
      case 'processing': return Loader2;
      case 'complete': return CheckCircle;
      default: return FileText;
    }
  };

  const getStageColor = (stage: SelfPatentProgress['stage']) => {
    switch (stage) {
      case 'analyzing': return 'from-blue-500 to-cyan-500';
      case 'extracting': return 'from-cyan-500 to-teal-500';
      case 'generating': return 'from-teal-500 to-emerald-500';
      case 'creating': return 'from-emerald-500 to-green-500';
      case 'processing': return 'from-green-500 to-lime-500';
      case 'complete': return 'from-lime-500 to-green-600';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const Icon = progress ? getStageIcon(progress.stage) : Sparkles;
  const colorGradient = progress ? getStageColor(progress.stage) : 'from-emerald-500 to-teal-500';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-16 h-16 bg-gradient-to-br ${colorGradient} rounded-2xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Self-Examining Patent Generator</h2>
            <p className="text-sm text-gray-600 mt-1">
              Analyzing the entire codebase to generate a comprehensive patent application
            </p>
          </div>
        </div>

        {progress && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="text-lg font-semibold text-gray-900 mb-1">
                    {progress.message}
                  </div>
                  {progress.details && (
                    <div className="text-sm text-gray-600">
                      {progress.details}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-emerald-600 ml-4">
                  {progress.percentage}%
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className={`h-full bg-gradient-to-r ${colorGradient} transition-all duration-500 ease-out rounded-full`}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Lightbulb className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-emerald-900 text-lg">
                    What's happening?
                  </h3>
                  <div className="text-sm text-emerald-800 space-y-2 leading-relaxed">
                    <p>
                      The system is performing a comprehensive self-examination of the entire application:
                    </p>
                    <ul className="space-y-1.5 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">✓</span>
                        <span>Scanning <strong>132 TypeScript files</strong> containing all source code</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">✓</span>
                        <span>Analyzing <strong>83 database migrations</strong> covering the entire schema</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">✓</span>
                        <span>Extracting technical features from <strong>40+ specialized services</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">✓</span>
                        <span>Identifying novel algorithms, data structures, and integrations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">✓</span>
                        <span>Generating specification, claims, and drawings automatically</span>
                      </li>
                    </ul>
                    <p className="pt-2 font-medium">
                      This process typically takes 2-3 minutes and requires no manual input.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {progress.stage === 'complete' && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 shadow-lg font-medium"
                >
                  <CheckCircle className="w-5 h-5" />
                  View Patent Application
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
