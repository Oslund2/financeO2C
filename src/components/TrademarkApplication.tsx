import { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Plus,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit3,
  Eye,
  Loader2,
  X,
  Search,
  Upload,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Type,
  Image as ImageIcon,
  Tag,
  Layers,
  DollarSign,
  Calendar,
  Building2,
  Users
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  getTrademarkApplications,
  getTrademarkApplication,
  createTrademarkApplication,
  updateTrademarkApplication,
  updateTrademarkStatus,
  deleteTrademarkApplication,
  getTrademarkSpecimens,
  getNiceClassifications,
  searchNiceClassifications,
  validateTrademarkCompleteness,
  calculateTrademarkFee,
  getRecommendedClasses,
  type TrademarkApplication,
  type TrademarkSpecimen,
  type NiceClassification,
  type MarkType,
  type FilingBasis,
  type OwnerType,
  type TrademarkStatus,
  type OwnerAddress
} from '../services/trademarkApplicationService';

type TabId = 'overview' | 'mark' | 'classification' | 'search' | 'specimens' | 'filing' | 'monitoring';

const STATUS_CONFIG: Record<TrademarkStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit3 },
  pending_review: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  filed: { label: 'Filed', color: 'bg-blue-100 text-blue-700', icon: Upload },
  published: { label: 'Published', color: 'bg-purple-100 text-purple-700', icon: Eye },
  opposed: { label: 'Opposed', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  registered: { label: 'Registered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  abandoned: { label: 'Abandoned', color: 'bg-gray-100 text-gray-500', icon: X },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: X },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: Clock }
};

const MARK_TYPE_CONFIG: Record<MarkType, { label: string; icon: typeof Type }> = {
  word_mark: { label: 'Word Mark', icon: Type },
  design_mark: { label: 'Design Mark', icon: ImageIcon },
  combined_mark: { label: 'Combined Mark', icon: Layers },
  sound_mark: { label: 'Sound Mark', icon: Tag },
  motion_mark: { label: 'Motion Mark', icon: Tag }
};

export function TrademarkApplication() {
  const { currentOrganization } = useOrganization();
  const [applications, setApplications] = useState<TrademarkApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<TrademarkApplication | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [classifications, setClassifications] = useState<NiceClassification[]>([]);
  const [specimens, setSpecimens] = useState<TrademarkSpecimen[]>([]);

  const [formData, setFormData] = useState({
    markType: 'word_mark' as MarkType,
    markText: '',
    markDescription: '',
    internationalClass: 41,
    goodsServicesDescription: '',
    filingBasis: 'use_in_commerce' as FilingBasis,
    firstUseDate: '',
    firstUseCommerceDate: '',
    ownerName: '',
    ownerType: 'individual' as OwnerType,
    ownerCitizenship: 'United States'
  });

  useEffect(() => {
    if (currentOrganization) {
      loadApplications();
      loadClassifications();
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (selectedApp) {
      loadSpecimens();
    }
  }, [selectedApp?.id]);

  const loadApplications = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const data = await getTrademarkApplications(currentOrganization.id);
      setApplications(data);
      if (data.length > 0 && !selectedApp) {
        setSelectedApp(data[0]);
      }
    } catch (err) {
      setError('Failed to load trademark applications');
    } finally {
      setLoading(false);
    }
  };

  const loadClassifications = async () => {
    try {
      const data = await getNiceClassifications();
      setClassifications(data);
    } catch (err) {
      console.error('Failed to load classifications:', err);
    }
  };

  const loadSpecimens = async () => {
    if (!selectedApp) return;
    try {
      const data = await getTrademarkSpecimens(selectedApp.id);
      setSpecimens(data);
    } catch (err) {
      console.error('Failed to load specimens:', err);
    }
  };

  const handleCreateApplication = async () => {
    if (!currentOrganization || !formData.markText || !formData.ownerName) {
      setError('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const newApp = await createTrademarkApplication(currentOrganization.id, {
        markType: formData.markType,
        markText: formData.markText,
        markDescription: formData.markDescription,
        internationalClass: formData.internationalClass,
        goodsServicesDescription: formData.goodsServicesDescription,
        filingBasis: formData.filingBasis,
        firstUseDate: formData.firstUseDate || undefined,
        firstUseCommerceDate: formData.firstUseCommerceDate || undefined,
        ownerName: formData.ownerName,
        ownerType: formData.ownerType,
        ownerCitizenship: formData.ownerCitizenship
      });

      setApplications(prev => [newApp, ...prev]);
      setSelectedApp(newApp);
      setShowCreateModal(false);
      resetFormData();
    } catch (err) {
      setError('Failed to create trademark application');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!selectedApp) return;

    setSaving(true);
    try {
      await deleteTrademarkApplication(selectedApp.id);
      setApplications(prev => prev.filter(a => a.id !== selectedApp.id));
      setSelectedApp(applications.length > 1 ? applications[0] : null);
      setShowDeleteModal(false);
    } catch (err) {
      setError('Failed to delete application');
    } finally {
      setSaving(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      markType: 'word_mark',
      markText: '',
      markDescription: '',
      internationalClass: 41,
      goodsServicesDescription: '',
      filingBasis: 'use_in_commerce',
      firstUseDate: '',
      firstUseCommerceDate: '',
      ownerName: '',
      ownerType: 'individual',
      ownerCitizenship: 'United States'
    });
  };

  const getCompletionStatus = () => {
    if (!selectedApp) return { isComplete: false, missingFields: [], percentage: 0 };
    const result = validateTrademarkCompleteness(selectedApp);
    const totalFields = 8;
    const completedFields = totalFields - result.missingFields.length;
    return {
      ...result,
      percentage: Math.round((completedFields / totalFields) * 100)
    };
  };

  const tabs: { id: TabId; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'mark', label: 'Mark Details', icon: Tag },
    { id: 'classification', label: 'Classification', icon: Layers },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'specimens', label: 'Specimens', icon: ImageIcon },
    { id: 'filing', label: 'Filing', icon: FileText },
    { id: 'monitoring', label: 'Monitoring', icon: Shield }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Trademark Applications</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {applications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No trademark applications yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first application
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {applications.map(app => {
                    const StatusIcon = STATUS_CONFIG[app.status].icon;
                    const MarkIcon = MARK_TYPE_CONFIG[app.mark_type].icon;
                    return (
                      <button
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedApp?.id === app.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <MarkIcon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {app.mark_text || 'Design Mark'}
                            </h4>
                            <p className="text-sm text-gray-500">Class {app.international_class}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${STATUS_CONFIG[app.status].color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {STATUS_CONFIG[app.status].label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {selectedApp ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedApp.mark_text || 'Design Mark'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {MARK_TYPE_CONFIG[selectedApp.mark_type].label} - Class {selectedApp.international_class}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex overflow-x-auto">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <OverviewTab
                    application={selectedApp}
                    completionStatus={getCompletionStatus()}
                    classifications={classifications}
                  />
                )}
                {activeTab === 'mark' && (
                  <MarkDetailsTab
                    application={selectedApp}
                    onUpdate={async (updates) => {
                      const updated = await updateTrademarkApplication(selectedApp.id, updates);
                      setSelectedApp(updated);
                      setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));
                    }}
                  />
                )}
                {activeTab === 'classification' && (
                  <ClassificationTab
                    application={selectedApp}
                    classifications={classifications}
                    onUpdate={async (updates) => {
                      const updated = await updateTrademarkApplication(selectedApp.id, updates);
                      setSelectedApp(updated);
                      setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));
                    }}
                  />
                )}
                {activeTab === 'search' && (
                  <SearchTab application={selectedApp} />
                )}
                {activeTab === 'specimens' && (
                  <SpecimensTab
                    application={selectedApp}
                    specimens={specimens}
                    onUpdate={loadSpecimens}
                  />
                )}
                {activeTab === 'filing' && (
                  <FilingTab application={selectedApp} />
                )}
                {activeTab === 'monitoring' && (
                  <MonitoringTab application={selectedApp} />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Application Selected</h3>
              <p className="text-gray-500 mb-6">Select an application from the list or create a new one</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Application
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateApplicationModal
          formData={formData}
          setFormData={setFormData}
          classifications={classifications}
          onClose={() => {
            setShowCreateModal(false);
            resetFormData();
          }}
          onSubmit={handleCreateApplication}
          saving={saving}
        />
      )}

      {showDeleteModal && selectedApp && (
        <DeleteConfirmModal
          markText={selectedApp.mark_text || 'Design Mark'}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteApplication}
          saving={saving}
        />
      )}
    </div>
  );
}

function OverviewTab({
  application,
  completionStatus,
  classifications
}: {
  application: TrademarkApplication;
  completionStatus: { isComplete: boolean; missingFields: string[]; percentage: number };
  classifications: NiceClassification[];
}) {
  const StatusIcon = STATUS_CONFIG[application.status].icon;
  const classification = classifications.find(c => c.class_number === application.international_class);
  const fee = calculateTrademarkFee('teas_plus', 1 + (application.additional_classes?.length || 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${STATUS_CONFIG[application.status].color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold text-gray-900">{STATUS_CONFIG[application.status].label}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Class</p>
              <p className="font-semibold text-gray-900">Class {application.international_class}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Filing Fee</p>
              <p className="font-semibold text-gray-900">${fee}</p>
            </div>
          </div>
        </div>
      </div>

      {!completionStatus.isComplete && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Missing Information</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Complete the following fields: {completionStatus.missingFields.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Mark Information</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Mark Type</dt>
              <dd className="font-medium text-gray-900">{MARK_TYPE_CONFIG[application.mark_type].label}</dd>
            </div>
            {application.mark_text && (
              <div>
                <dt className="text-sm text-gray-500">Mark Text</dt>
                <dd className="font-medium text-gray-900 text-lg">{application.mark_text}</dd>
              </div>
            )}
            {application.mark_description && (
              <div>
                <dt className="text-sm text-gray-500">Description</dt>
                <dd className="font-medium text-gray-900">{application.mark_description}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Filing Basis</dt>
              <dd className="font-medium text-gray-900 capitalize">{application.filing_basis.replace(/_/g, ' ')}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Owner Information</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Owner</dt>
              <dd className="font-medium text-gray-900">{application.owner_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Owner Type</dt>
              <dd className="font-medium text-gray-900 capitalize">{application.owner_type}</dd>
            </div>
            {application.owner_citizenship && (
              <div>
                <dt className="text-sm text-gray-500">Citizenship/State</dt>
                <dd className="font-medium text-gray-900">{application.owner_citizenship}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {classification && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Class {classification.class_number}: {classification.class_heading}
          </h4>
          <p className="text-sm text-blue-700">{classification.class_description}</p>
        </div>
      )}

      {application.serial_number && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">USPTO Information</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-green-700">Serial Number</dt>
              <dd className="font-mono font-semibold text-green-900">{application.serial_number}</dd>
            </div>
            {application.registration_number && (
              <div>
                <dt className="text-sm text-green-700">Registration Number</dt>
                <dd className="font-mono font-semibold text-green-900">{application.registration_number}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

function MarkDetailsTab({
  application,
  onUpdate
}: {
  application: TrademarkApplication;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (field: string) => {
    setSaving(true);
    try {
      await onUpdate({ [field]: editValue });
      setEditing(null);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Mark Preview</h3>
        {application.mark_type === 'word_mark' ? (
          <div className="p-8 bg-white border border-gray-200 rounded-lg text-center">
            <span className="text-4xl font-bold text-gray-900">{application.mark_text || 'YOUR MARK'}</span>
          </div>
        ) : application.mark_image_url ? (
          <div className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
            <img src={application.mark_image_url} alt="Mark" className="max-h-48" />
          </div>
        ) : (
          <div className="p-8 bg-white border border-dashed border-gray-300 rounded-lg text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500">No mark image uploaded</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {[
          { key: 'markText', label: 'Mark Text', value: application.mark_text },
          { key: 'markDescription', label: 'Mark Description', value: application.mark_description, multiline: true },
          { key: 'colorClaim', label: 'Color Claim', value: application.color_claim, multiline: true },
          { key: 'translation', label: 'Translation', value: application.translation },
          { key: 'transliteration', label: 'Transliteration', value: application.transliteration }
        ].map(field => (
          <div key={field.key} className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="block text-sm text-gray-500 mb-1">{field.label}</label>
              {editing === field.key ? (
                <div className="flex items-start gap-2">
                  {field.multiline ? (
                    <textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                  <button
                    onClick={() => handleSave(field.key)}
                    disabled={saving}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-gray-900">{field.value || <span className="text-gray-400 italic">Not specified</span>}</p>
              )}
            </div>
            {editing !== field.key && (
              <button
                onClick={() => {
                  setEditing(field.key);
                  setEditValue(String(field.value || ''));
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassificationTab({
  application,
  classifications,
  onUpdate
}: {
  application: TrademarkApplication;
  classifications: NiceClassification[];
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const currentClass = classifications.find(c => c.class_number === application.international_class);
  const filteredClasses = searchQuery
    ? classifications.filter(c =>
        c.class_heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.class_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.class_number.toString() === searchQuery
      )
    : classifications;

  const handleClassChange = async (classNumber: number) => {
    setSaving(true);
    try {
      await onUpdate({ internationalClass: classNumber });
    } catch (err) {
      console.error('Failed to update class:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {currentClass && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Current Classification: Class {currentClass.class_number}
          </h4>
          <p className="text-lg font-semibold text-blue-900">{currentClass.class_heading}</p>
          <p className="text-sm text-blue-700 mt-2">{currentClass.class_description}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Goods/Services Description</label>
        <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">
          {application.goods_services_description || <span className="text-gray-400 italic">Not specified</span>}
        </p>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-3">Nice Classification Browser</h4>
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search classes by name or number..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {filteredClasses.map(cls => (
            <button
              key={cls.class_number}
              onClick={() => handleClassChange(cls.class_number)}
              disabled={saving}
              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                cls.class_number === application.international_class ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  cls.class_number === application.international_class
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {cls.class_number}
                </span>
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900">{cls.class_heading}</h5>
                  <p className="text-sm text-gray-500 line-clamp-2">{cls.class_description}</p>
                </div>
                {cls.class_number === application.international_class && (
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchTab({ application }: { application: TrademarkApplication }) {
  const [searchQuery, setSearchQuery] = useState(application.mark_text || '');
  const [searching, setSearching] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Trademark Search</h4>
        <p className="text-sm text-gray-500 mb-4">
          Search the USPTO TESS database for potentially conflicting marks.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by mark text..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => {
              setSearching(true);
              setTimeout(() => setSearching(false), 2000);
            }}
            disabled={searching || !searchQuery}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Knockout Search</h4>
            <p className="text-sm text-gray-500">Quick search for exact matches</p>
          </div>
        </button>

        <button className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Search className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Comprehensive Search</h4>
            <p className="text-sm text-gray-500">Full phonetic and visual similarity search</p>
          </div>
        </button>
      </div>

      <div className="text-center py-8 text-gray-500">
        <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Enter a search query to check for similar marks.</p>
      </div>
    </div>
  );
}

function SpecimensTab({
  application,
  specimens,
  onUpdate
}: {
  application: TrademarkApplication;
  specimens: TrademarkSpecimen[];
  onUpdate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Specimen Requirements</h4>
        <p className="text-sm text-blue-700">
          {application.filing_basis === 'use_in_commerce'
            ? 'You must submit a specimen showing the mark as used in commerce for each class of goods/services.'
            : 'Specimens are required when filing a Statement of Use after the Notice of Allowance.'}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Uploaded Specimens</h4>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Upload className="w-4 h-4" />
          Upload Specimen
        </button>
      </div>

      {specimens.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No specimens uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {specimens.map(specimen => (
            <div key={specimen.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{specimen.file_name}</h5>
                  <p className="text-sm text-gray-500 capitalize">{specimen.specimen_type.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-500">Class {specimen.class_number}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  specimen.submission_status === 'accepted' ? 'bg-green-100 text-green-700' :
                  specimen.submission_status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {specimen.submission_status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilingTab({ application }: { application: TrademarkApplication }) {
  const fee = calculateTrademarkFee('teas_plus', 1 + (application.additional_classes?.length || 0));

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">File with USPTO</h4>
        <p className="text-sm text-blue-700">
          File your trademark application through the Trademark Electronic Application System (TEAS).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Filing Fee</h4>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-2xl">${fee}</p>
              <p className="text-sm text-gray-500">TEAS Plus filing</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Filing Type</h4>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">TEAS Plus</p>
              <p className="text-sm text-gray-500">Lowest filing fee option</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Filing Checklist</h4>
        <div className="space-y-2">
          {[
            { label: 'Mark description complete', done: !!application.mark_text || !!application.mark_image_url },
            { label: 'Goods/services identified', done: !!application.goods_services_description },
            { label: 'Owner information complete', done: !!application.owner_name && !!application.owner_address },
            { label: 'Filing basis selected', done: true },
            { label: 'Specimens uploaded (if required)', done: application.filing_basis !== 'use_in_commerce' },
            { label: 'Declaration signed', done: false }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {item.done ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
              <span className={item.done ? 'text-gray-900' : 'text-gray-500'}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonitoringTab({ application }: { application: TrademarkApplication }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Trademark Monitoring</h4>
        <p className="text-sm text-gray-500">
          Monitor for potentially conflicting trademark applications and protect your mark.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h5 className="font-medium text-gray-900">Maintenance Deadlines</h5>
          </div>
          {application.status === 'registered' ? (
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-gray-500">Section 8 Declaration</span>
                <span className="text-gray-900">Years 5-6</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-500">Renewal (Section 9)</span>
                <span className="text-gray-900">Years 9-10</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Mark must be registered to view maintenance deadlines.</p>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-gray-600" />
            <h5 className="font-medium text-gray-900">Watch Service</h5>
          </div>
          <p className="text-sm text-gray-500">
            Set up alerts for similar trademark applications in your class.
          </p>
          <button className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
            Enable Watching
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateApplicationModal({
  formData,
  setFormData,
  classifications,
  onClose,
  onSubmit,
  saving
}: {
  formData: {
    markType: MarkType;
    markText: string;
    markDescription: string;
    internationalClass: number;
    goodsServicesDescription: string;
    filingBasis: FilingBasis;
    firstUseDate: string;
    firstUseCommerceDate: string;
    ownerName: string;
    ownerType: OwnerType;
    ownerCitizenship: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  classifications: NiceClassification[];
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">New Trademark Application</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mark Type</label>
              <select
                value={formData.markType}
                onChange={e => setFormData(prev => ({ ...prev, markType: e.target.value as MarkType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="word_mark">Word Mark</option>
                <option value="design_mark">Design Mark</option>
                <option value="combined_mark">Combined Mark</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mark Text *</label>
              <input
                type="text"
                value={formData.markText}
                onChange={e => setFormData(prev => ({ ...prev, markText: e.target.value }))}
                placeholder="Enter mark text..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">International Class</label>
              <select
                value={formData.internationalClass}
                onChange={e => setFormData(prev => ({ ...prev, internationalClass: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {classifications.map(cls => (
                  <option key={cls.class_number} value={cls.class_number}>
                    Class {cls.class_number}: {cls.class_heading}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filing Basis</label>
              <select
                value={formData.filingBasis}
                onChange={e => setFormData(prev => ({ ...prev, filingBasis: e.target.value as FilingBasis }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="use_in_commerce">Use in Commerce (1(a))</option>
                <option value="intent_to_use">Intent to Use (1(b))</option>
                <option value="foreign_registration">Foreign Registration (44(e))</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Goods/Services Description</label>
              <textarea
                value={formData.goodsServicesDescription}
                onChange={e => setFormData(prev => ({ ...prev, goodsServicesDescription: e.target.value }))}
                placeholder="Describe the goods or services..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
              />
            </div>

            {formData.filingBasis === 'use_in_commerce' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Use Date</label>
                  <input
                    type="date"
                    value={formData.firstUseDate}
                    onChange={e => setFormData(prev => ({ ...prev, firstUseDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Use in Commerce</label>
                  <input
                    type="date"
                    value={formData.firstUseCommerceDate}
                    onChange={e => setFormData(prev => ({ ...prev, firstUseCommerceDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={e => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                placeholder="Enter owner name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Type</label>
              <select
                value={formData.ownerType}
                onChange={e => setFormData(prev => ({ ...prev, ownerType: e.target.value as OwnerType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="individual">Individual</option>
                <option value="corporation">Corporation</option>
                <option value="llc">LLC</option>
                <option value="partnership">Partnership</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || !formData.markText || !formData.ownerName}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Application
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  markText,
  onClose,
  onConfirm,
  saving
}: {
  markText: string;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Delete Application</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete the application for "{markText}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
