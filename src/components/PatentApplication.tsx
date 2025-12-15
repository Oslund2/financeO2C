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
  Globe
} from 'lucide-react';
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
  generateAllDrawings,
  svgToDataUrl,
  formatDrawingsDescriptionSection
} from '../services/patentDrawingsService';
import jsPDF from 'jspdf';

type TabId = 'overview' | 'specification' | 'claims' | 'drawings' | 'abstract' | 'prior-art' | 'export';

export function PatentApplication() {
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

  const handleCreateApplication = async (title: string) => {
    if (!currentOrganization) return;
    setSaving(true);
    try {
      const app = await createPatentApplication(currentOrganization.id, {
        title,
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
    if (!selectedApp) return;
    setGenerating(true);
    try {
      const drawings = await generateDrawingsForApplication(selectedApp.id);
      setSelectedApp({ ...selectedApp, drawings });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate drawings');
    } finally {
      setGenerating(false);
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Application
        </button>
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
    </div>
  );
}

function OverviewTab({
  application,
  onUpdate,
  onDelete
}: {
  application: PatentApplicationWithDetails;
  onUpdate: (updates: Partial<PatentApplication>) => Promise<void>;
  onDelete: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(application.title);
  const [inventorName, setInventorName] = useState(application.inventor_name || '');
  const [filingType, setFilingType] = useState(application.filing_type);
  const [status, setStatus] = useState(application.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        title,
        inventor_name: inventorName || null,
        filing_type: filingType,
        status
      });
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const claimCounts = countClaimsByType(application.claims);
  const claimValidation = validateClaims(application.claims);

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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Specification</h2>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={onRegenerate}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Default
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
  const previewDrawings = drawings.length === 0 ? generateAllDrawings() : [];

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
        <div className="space-y-4">
          <div className="text-center py-6 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-yellow-800">Drawings not saved yet. Preview shown below.</p>
            <button
              onClick={onGenerate}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Save Drawings to Application
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previewDrawings.map(({ svg, definition }) => (
              <div
                key={definition.figureNumber}
                className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 cursor-pointer transition-colors"
                onClick={() => setSelectedDrawing({
                  id: `preview-${definition.figureNumber}`,
                  application_id: '',
                  figure_number: definition.figureNumber,
                  title: definition.title,
                  description: definition.description,
                  svg_content: svg,
                  image_url: null,
                  drawing_type: definition.drawingType,
                  callouts: [],
                  created_at: '',
                  updated_at: ''
                })}
              >
                <div className="aspect-[4/3] bg-white rounded overflow-hidden mb-2">
                  <img src={svgToDataUrl(svg)} alt={`FIG. ${definition.figureNumber}`} className="w-full h-full object-contain" />
                </div>
                <p className="text-sm font-medium text-gray-900">FIG. {definition.figureNumber}</p>
                <p className="text-xs text-gray-600 truncate">{definition.title}</p>
              </div>
            ))}
          </div>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Abstract</h2>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={onRegenerate}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
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
      <h2 className="text-xl font-semibold text-gray-900">Prior Art References</h2>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Important Notice</p>
            <p className="text-sm text-yellow-700 mt-1">
              Prior art references should be reviewed by a patent attorney during the formal filing process.
              Use the search resources below to research existing patents and publications related to your invention.
            </p>
          </div>
        </div>
      </div>

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

  const drawingsDescription = formatDrawingsDescriptionSection(application.drawings);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Export Application</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <h3 className="font-medium text-gray-900 mb-2">Application Contents</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Title and inventor information
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
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState('AI-Powered Animation Production System and Method');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Patent Application</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Application Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter patent title"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              onClick={() => onCreate(title)}
              disabled={saving || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
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
