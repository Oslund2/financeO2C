import { useState, useEffect } from 'react';
import {
  Copyright,
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
  Globe,
  Bot,
  Upload,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileCheck,
  Users,
  Calendar,
  DollarSign,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  Film,
  Music,
  Type
} from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  getCopyrightRegistrations,
  getCopyrightRegistration,
  createCopyrightRegistration,
  updateCopyrightRegistration,
  updateCopyrightStatus,
  deleteCopyrightRegistration,
  getCopyrightDeposits,
  validateRegistrationCompleteness,
  getRequiredForm,
  calculateCopyrightFee,
  generateCopyrightNotice,
  type CopyrightRegistration,
  type CopyrightRegistrationType,
  type CopyrightWorkType,
  type CopyrightStatus,
  type PublicationStatus,
  type AuthorType
} from '../services/copyrightApplicationService';
import {
  getAIAuthorshipDocumentation,
  createAIAuthorshipDocumentation,
  updateAIAuthorshipDocumentation,
  getAIToolRegistry,
  generateHumanAuthorshipStatement,
  generateAIDisclosureStatement,
  validateDocumentationCompleteness,
  analyzeAIContribution,
  type AIAuthorshipDocumentation,
  type AIToolInfo
} from '../services/aiAuthorshipService';
import {
  getInternationalRegistrations,
  getCopyrightTreaties,
  getBerneMembers,
  analyzeProtection,
  getProtectionSummary,
  type InternationalCopyrightRegistration,
  type CopyrightTreaty,
  type ProtectionAnalysis
} from '../services/internationalCopyrightService';

type TabId = 'overview' | 'works' | 'ai-documentation' | 'registration' | 'search' | 'international' | 'export';

const WORK_TYPE_ICONS: Record<CopyrightWorkType, typeof FileText> = {
  dramatic_work: Film,
  visual_art: ImageIcon,
  literary_work: BookOpen,
  audiovisual: Film,
  motion_picture: Film,
  sound_recording: Music,
  compilation: FileText
};

const STATUS_CONFIG: Record<CopyrightStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit3 },
  pending_review: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: Upload },
  under_examination: { label: 'Under Examination', color: 'bg-purple-100 text-purple-700', icon: Search },
  registered: { label: 'Registered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  abandoned: { label: 'Abandoned', color: 'bg-gray-100 text-gray-500', icon: X }
};

export function CopyrightApplication() {
  const { currentOrganization } = useOrganization();
  const [registrations, setRegistrations] = useState<CopyrightRegistration[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<CopyrightRegistration | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [aiDocumentation, setAiDocumentation] = useState<AIAuthorshipDocumentation | null>(null);
  const [internationalRegistrations, setInternationalRegistrations] = useState<InternationalCopyrightRegistration[]>([]);
  const [treaties, setTreaties] = useState<CopyrightTreaty[]>([]);
  const [aiTools, setAiTools] = useState<AIToolInfo[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workDetails: true,
    author: false,
    claimant: false,
    aiContent: false,
    publication: false
  });

  const [formData, setFormData] = useState({
    title: '',
    registrationType: 'script' as CopyrightRegistrationType,
    workType: 'dramatic_work' as CopyrightWorkType,
    description: '',
    yearOfCompletion: new Date().getFullYear(),
    creationDate: '',
    publicationStatus: 'unpublished' as PublicationStatus,
    publicationDate: '',
    publicationCountry: 'United States',
    authorName: '',
    authorCitizenship: 'United States',
    authorType: 'individual' as AuthorType,
    containsAIGeneratedContent: false,
    aiContributionPercentage: 0,
    aiToolsUsed: [] as string[]
  });

  useEffect(() => {
    if (currentOrganization) {
      loadRegistrations();
      loadReferenceData();
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (selectedRegistration) {
      loadRegistrationDetails();
    }
  }, [selectedRegistration?.id]);

  const loadRegistrations = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const data = await getCopyrightRegistrations(currentOrganization.id);
      setRegistrations(data);
      if (data.length > 0 && !selectedRegistration) {
        setSelectedRegistration(data[0]);
      }
    } catch (err) {
      setError('Failed to load copyright registrations');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [treatiesData, aiToolsData] = await Promise.all([
        getCopyrightTreaties(),
        getAIToolRegistry()
      ]);
      setTreaties(treatiesData);
      setAiTools(aiToolsData);
    } catch (err) {
      console.error('Failed to load reference data:', err);
    }
  };

  const loadRegistrationDetails = async () => {
    if (!selectedRegistration) return;
    try {
      const [aiDoc, intlRegs] = await Promise.all([
        selectedRegistration.contains_ai_generated_content
          ? getAIAuthorshipDocumentation(selectedRegistration.id)
          : Promise.resolve(null),
        getInternationalRegistrations(selectedRegistration.id)
      ]);
      setAiDocumentation(aiDoc);
      setInternationalRegistrations(intlRegs);
    } catch (err) {
      console.error('Failed to load registration details:', err);
    }
  };

  const handleCreateRegistration = async () => {
    if (!currentOrganization || !formData.title || !formData.authorName) {
      setError('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const newRegistration = await createCopyrightRegistration(currentOrganization.id, {
        title: formData.title,
        registrationType: formData.registrationType,
        workType: formData.workType,
        description: formData.description,
        yearOfCompletion: formData.yearOfCompletion,
        creationDate: formData.creationDate || undefined,
        publicationStatus: formData.publicationStatus,
        publicationDate: formData.publicationDate || undefined,
        publicationCountry: formData.publicationCountry,
        authorName: formData.authorName,
        authorCitizenship: formData.authorCitizenship,
        authorType: formData.authorType,
        containsAIGeneratedContent: formData.containsAIGeneratedContent,
        aiContributionPercentage: formData.aiContributionPercentage,
        aiToolsUsed: formData.aiToolsUsed
      });

      setRegistrations(prev => [newRegistration, ...prev]);
      setSelectedRegistration(newRegistration);
      setShowCreateModal(false);
      resetFormData();
    } catch (err) {
      setError('Failed to create copyright registration');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRegistration = async () => {
    if (!selectedRegistration) return;

    setSaving(true);
    try {
      await deleteCopyrightRegistration(selectedRegistration.id);
      setRegistrations(prev => prev.filter(r => r.id !== selectedRegistration.id));
      setSelectedRegistration(registrations.length > 1 ? registrations[0] : null);
      setShowDeleteModal(false);
    } catch (err) {
      setError('Failed to delete registration');
    } finally {
      setSaving(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      title: '',
      registrationType: 'script',
      workType: 'dramatic_work',
      description: '',
      yearOfCompletion: new Date().getFullYear(),
      creationDate: '',
      publicationStatus: 'unpublished',
      publicationDate: '',
      publicationCountry: 'United States',
      authorName: '',
      authorCitizenship: 'United States',
      authorType: 'individual',
      containsAIGeneratedContent: false,
      aiContributionPercentage: 0,
      aiToolsUsed: []
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getCompletionStatus = () => {
    if (!selectedRegistration) return { isComplete: false, missingFields: [], percentage: 0 };
    const result = validateRegistrationCompleteness(selectedRegistration);
    const totalFields = 10;
    const completedFields = totalFields - result.missingFields.length;
    return {
      ...result,
      percentage: Math.round((completedFields / totalFields) * 100)
    };
  };

  const tabs: { id: TabId; label: string; icon: typeof Copyright }[] = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'works', label: 'Work Details', icon: FileText },
    { id: 'ai-documentation', label: 'AI Documentation', icon: Bot },
    { id: 'registration', label: 'Registration', icon: FileCheck },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'international', label: 'International', icon: Globe },
    { id: 'export', label: 'Export', icon: Download }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
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
              <h3 className="font-semibold text-gray-900">Copyright Registrations</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {registrations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Copyright className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No copyright registrations yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Create your first registration
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {registrations.map(reg => {
                    const StatusIcon = STATUS_CONFIG[reg.status].icon;
                    const WorkTypeIcon = WORK_TYPE_ICONS[reg.work_type];
                    return (
                      <button
                        key={reg.id}
                        onClick={() => setSelectedRegistration(reg)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedRegistration?.id === reg.id ? 'bg-teal-50 border-l-4 border-teal-600' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <WorkTypeIcon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{reg.title}</h4>
                            <p className="text-sm text-gray-500 capitalize">{reg.registration_type}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${STATUS_CONFIG[reg.status].color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {STATUS_CONFIG[reg.status].label}
                              </span>
                              {reg.contains_ai_generated_content && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                                  <Bot className="w-3 h-3" />
                                  AI
                                </span>
                              )}
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
          {selectedRegistration ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedRegistration.title}</h2>
                    <p className="text-sm text-gray-500">
                      {getRequiredForm(selectedRegistration.work_type)} - {selectedRegistration.author_name}
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
                          ? 'border-teal-600 text-teal-600'
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
                    registration={selectedRegistration}
                    completionStatus={getCompletionStatus()}
                    aiDocumentation={aiDocumentation}
                    internationalCount={internationalRegistrations.length}
                  />
                )}
                {activeTab === 'works' && (
                  <WorkDetailsTab
                    registration={selectedRegistration}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    onUpdate={async (updates) => {
                      const updated = await updateCopyrightRegistration(selectedRegistration.id, updates);
                      setSelectedRegistration(updated);
                      setRegistrations(prev => prev.map(r => r.id === updated.id ? updated : r));
                    }}
                  />
                )}
                {activeTab === 'ai-documentation' && (
                  <AIDocumentationTab
                    registration={selectedRegistration}
                    documentation={aiDocumentation}
                    aiTools={aiTools}
                    onUpdate={loadRegistrationDetails}
                  />
                )}
                {activeTab === 'registration' && (
                  <RegistrationTab registration={selectedRegistration} />
                )}
                {activeTab === 'search' && (
                  <SearchTab registration={selectedRegistration} />
                )}
                {activeTab === 'international' && (
                  <InternationalTab
                    registration={selectedRegistration}
                    registrations={internationalRegistrations}
                    treaties={treaties}
                  />
                )}
                {activeTab === 'export' && (
                  <ExportTab registration={selectedRegistration} />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Copyright className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Registration Selected</h3>
              <p className="text-gray-500 mb-6">Select a registration from the list or create a new one</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Registration
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateRegistrationModal
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowCreateModal(false);
            resetFormData();
          }}
          onSubmit={handleCreateRegistration}
          saving={saving}
          aiTools={aiTools}
        />
      )}

      {showDeleteModal && selectedRegistration && (
        <DeleteConfirmModal
          title={selectedRegistration.title}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteRegistration}
          saving={saving}
        />
      )}
    </div>
  );
}

function OverviewTab({
  registration,
  completionStatus,
  aiDocumentation,
  internationalCount
}: {
  registration: CopyrightRegistration;
  completionStatus: { isComplete: boolean; missingFields: string[]; percentage: number };
  aiDocumentation: AIAuthorshipDocumentation | null;
  internationalCount: number;
}) {
  const StatusIcon = STATUS_CONFIG[registration.status].icon;
  const copyrightNotice = generateCopyrightNotice(
    registration.year_of_completion || new Date().getFullYear(),
    registration.claimant_name || registration.author_name
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${STATUS_CONFIG[registration.status].color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold text-gray-900">{STATUS_CONFIG[registration.status].label}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <FileCheck className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completion</p>
              <p className="font-semibold text-gray-900">{completionStatus.percentage}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal-600 h-2 rounded-full transition-all"
              style={{ width: `${completionStatus.percentage}%` }}
            />
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">International</p>
              <p className="font-semibold text-gray-900">{internationalCount} countries</p>
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
          <h3 className="font-semibold text-gray-900">Work Information</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Title</dt>
              <dd className="font-medium text-gray-900">{registration.title}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Work Type</dt>
              <dd className="font-medium text-gray-900 capitalize">{registration.work_type.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Required Form</dt>
              <dd className="font-medium text-gray-900">{getRequiredForm(registration.work_type)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Year of Completion</dt>
              <dd className="font-medium text-gray-900">{registration.year_of_completion || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Publication Status</dt>
              <dd className="font-medium text-gray-900 capitalize">{registration.publication_status.replace(/_/g, ' ')}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Author & Claimant</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Author</dt>
              <dd className="font-medium text-gray-900">{registration.author_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Author Type</dt>
              <dd className="font-medium text-gray-900 capitalize">{registration.author_type.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Citizenship</dt>
              <dd className="font-medium text-gray-900">{registration.author_citizenship || 'Not specified'}</dd>
            </div>
            {registration.claimant_name && (
              <div>
                <dt className="text-sm text-gray-500">Claimant</dt>
                <dd className="font-medium text-gray-900">{registration.claimant_name}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {registration.contains_ai_generated_content && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">AI-Generated Content</h4>
              <p className="text-sm text-purple-700 mt-1">
                This work contains AI-generated content ({registration.ai_contribution_percentage}% AI contribution).
                {!aiDocumentation?.certification_statement && (
                  <span className="text-purple-900 font-medium"> Human authorship documentation required.</span>
                )}
              </p>
              {registration.ai_tools_used && registration.ai_tools_used.length > 0 && (
                <p className="text-sm text-purple-700 mt-1">
                  Tools used: {registration.ai_tools_used.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Copyright Notice</h4>
        <p className="font-mono text-sm bg-white p-3 rounded border border-gray-200">{copyrightNotice}</p>
      </div>
    </div>
  );
}

function WorkDetailsTab({
  registration,
  expandedSections,
  toggleSection,
  onUpdate
}: {
  registration: CopyrightRegistration;
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
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

  const sections = [
    {
      id: 'workDetails',
      title: 'Work Details',
      icon: FileText,
      fields: [
        { key: 'title', label: 'Title', value: registration.title },
        { key: 'description', label: 'Description', value: registration.description, multiline: true },
        { key: 'yearOfCompletion', label: 'Year of Completion', value: registration.year_of_completion },
        { key: 'creationDate', label: 'Creation Date', value: registration.creation_date, type: 'date' }
      ]
    },
    {
      id: 'author',
      title: 'Author Information',
      icon: Users,
      fields: [
        { key: 'authorName', label: 'Author Name', value: registration.author_name },
        { key: 'authorCitizenship', label: 'Citizenship', value: registration.author_citizenship },
        { key: 'authorDomicile', label: 'Domicile', value: registration.author_domicile },
        { key: 'natureOfAuthorship', label: 'Nature of Authorship', value: registration.nature_of_authorship, multiline: true }
      ]
    },
    {
      id: 'publication',
      title: 'Publication Information',
      icon: Calendar,
      fields: [
        { key: 'publicationDate', label: 'Publication Date', value: registration.publication_date, type: 'date' },
        { key: 'publicationCountry', label: 'Publication Country', value: registration.publication_country },
        { key: 'publicationDetails', label: 'Publication Details', value: registration.publication_details, multiline: true }
      ]
    },
    {
      id: 'claimant',
      title: 'Claimant Information',
      icon: Users,
      fields: [
        { key: 'claimantName', label: 'Claimant Name', value: registration.claimant_name },
        { key: 'transferStatement', label: 'Transfer Statement', value: registration.transfer_statement, multiline: true }
      ]
    }
  ];

  return (
    <div className="space-y-4">
      {sections.map(section => (
        <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <section.icon className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">{section.title}</span>
            </div>
            {expandedSections[section.id] ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {expandedSections[section.id] && (
            <div className="p-4 space-y-4">
              {section.fields.map(field => (
                <div key={field.key} className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-500 mb-1">{field.label}</label>
                    {editing === field.key ? (
                      <div className="flex items-start gap-2">
                        {field.multiline ? (
                          <textarea
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[100px]"
                          />
                        ) : field.type === 'date' ? (
                          <input
                            type="date"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        )}
                        <button
                          onClick={() => handleSave(field.key)}
                          disabled={saving}
                          className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
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
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AIDocumentationTab({
  registration,
  documentation,
  aiTools,
  onUpdate
}: {
  registration: CopyrightRegistration;
  documentation: AIAuthorshipDocumentation | null;
  aiTools: AIToolInfo[];
  onUpdate: () => void;
}) {
  const { currentOrganization } = useOrganization();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    aiToolName: '',
    aiToolProvider: '',
    conceptDevelopment: '',
    creativeDirection: '',
    characterDevelopment: '',
    narrativeStructure: '',
    dialogueRefinement: '',
    modificationPercentage: 0
  });

  if (!registration.contains_ai_generated_content) {
    return (
      <div className="text-center py-12">
        <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Content Declared</h3>
        <p className="text-gray-500">
          This work does not contain AI-generated content. No documentation required.
        </p>
      </div>
    );
  }

  const handleCreateDocumentation = async () => {
    if (!currentOrganization || !formData.aiToolName) return;

    setSaving(true);
    try {
      await createAIAuthorshipDocumentation(currentOrganization.id, {
        registrationId: registration.id,
        aiToolName: formData.aiToolName,
        aiToolProvider: formData.aiToolProvider,
        conceptDevelopment: formData.conceptDevelopment,
        creativeDirection: formData.creativeDirection,
        characterDevelopment: formData.characterDevelopment,
        narrativeStructure: formData.narrativeStructure,
        dialogueRefinement: formData.dialogueRefinement,
        modificationPercentage: formData.modificationPercentage
      });
      onUpdate();
      setCreating(false);
    } catch (err) {
      console.error('Failed to create documentation:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!documentation && !creating) {
    return (
      <div className="text-center py-12">
        <Bot className="w-16 h-16 mx-auto mb-4 text-purple-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">AI Authorship Documentation Required</h3>
        <p className="text-gray-500 mb-6">
          Document the human creative contributions to this AI-assisted work.
        </p>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Documentation
        </button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Document Human Creative Contributions</h3>
          <button
            onClick={() => setCreating(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI Tool Used *</label>
            <select
              value={formData.aiToolName}
              onChange={e => {
                const tool = aiTools.find(t => t.tool_name === e.target.value);
                setFormData(prev => ({
                  ...prev,
                  aiToolName: e.target.value,
                  aiToolProvider: tool?.provider || ''
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select AI tool...</option>
              {aiTools.map(tool => (
                <option key={`${tool.tool_name}-${tool.provider}`} value={tool.tool_name}>
                  {tool.tool_name} ({tool.provider})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Human Modification %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.modificationPercentage}
              onChange={e => setFormData(prev => ({ ...prev, modificationPercentage: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Human Creative Contributions</h4>
          <p className="text-sm text-gray-500">
            Document the creative decisions and contributions made by the human author.
            These elements are essential for establishing copyright protection.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concept Development</label>
            <textarea
              value={formData.conceptDevelopment}
              onChange={e => setFormData(prev => ({ ...prev, conceptDevelopment: e.target.value }))}
              placeholder="Describe the original concept, premise, and creative vision..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Creative Direction</label>
            <textarea
              value={formData.creativeDirection}
              onChange={e => setFormData(prev => ({ ...prev, creativeDirection: e.target.value }))}
              placeholder="Describe the artistic vision and creative choices..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Character Development</label>
            <textarea
              value={formData.characterDevelopment}
              onChange={e => setFormData(prev => ({ ...prev, characterDevelopment: e.target.value }))}
              placeholder="Describe character personalities, relationships, and arcs..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Narrative Structure</label>
            <textarea
              value={formData.narrativeStructure}
              onChange={e => setFormData(prev => ({ ...prev, narrativeStructure: e.target.value }))}
              placeholder="Describe plot structure, scene sequencing, and story organization..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dialogue Refinement</label>
            <textarea
              value={formData.dialogueRefinement}
              onChange={e => setFormData(prev => ({ ...prev, dialogueRefinement: e.target.value }))}
              placeholder="Describe dialogue modifications, character voice development..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setCreating(false)}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateDocumentation}
            disabled={saving || !formData.aiToolName}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Documentation
          </button>
        </div>
      </div>
    );
  }

  if (documentation) {
    const analysis = analyzeAIContribution(documentation);
    const validation = validateDocumentationCompleteness(documentation);
    const authorshipStatement = generateHumanAuthorshipStatement(documentation);
    const disclosureStatement = generateAIDisclosureStatement(documentation);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">AI Authorship Documentation</h3>
          <span className={`px-3 py-1 rounded-full text-sm ${
            documentation.copyright_office_compliant
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {documentation.copyright_office_compliant ? 'Compliant' : 'Review Required'}
          </span>
        </div>

        {!validation.isComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Documentation Incomplete</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Missing: {validation.missingFields.join(', ')}
                </p>
                {validation.recommendations.length > 0 && (
                  <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                    {validation.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">AI Tool Information</h4>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Tool</dt>
                <dd className="font-medium text-gray-900">
                  {documentation.ai_tool_name}
                  {documentation.ai_tool_provider && ` (${documentation.ai_tool_provider})`}
                </dd>
              </div>
              {documentation.ai_tool_version && (
                <div>
                  <dt className="text-sm text-gray-500">Version</dt>
                  <dd className="font-medium text-gray-900">{documentation.ai_tool_version}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">Human Modifications</dt>
                <dd className="font-medium text-gray-900">{documentation.modification_percentage}%</dd>
              </div>
            </dl>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Contribution Analysis</h4>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Human</span>
                  <span className="text-gray-900 font-medium">{analysis.overallScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-600 h-2 rounded-full"
                    style={{ width: `${analysis.overallScore}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {analysis.overallScore >= 50
                ? 'Sufficient human creative contribution for copyright protection.'
                : 'Consider documenting additional human creative contributions.'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Generated Statements</h4>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Human Authorship Statement</h5>
            <p className="text-gray-600 text-sm">{authorshipStatement}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">AI Disclosure Statement</h5>
            <p className="text-gray-600 text-sm">{disclosureStatement}</p>
          </div>
        </div>

        {documentation.certification_statement && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Certified</h4>
                <p className="text-sm text-green-700 mt-1">
                  Certified by {documentation.certifier_name} on {documentation.certification_date}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function RegistrationTab({ registration }: { registration: CopyrightRegistration }) {
  const fee = calculateCopyrightFee('online', registration.author_type === 'individual', false);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Registration with US Copyright Office</h4>
        <p className="text-sm text-blue-700">
          Register your work with the US Copyright Office to establish a public record and gain additional legal protections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Required Form</h4>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <FileText className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{getRequiredForm(registration.work_type)}</p>
              <p className="text-sm text-gray-500 capitalize">{registration.work_type.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Filing Fee</h4>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <DollarSign className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">${fee}</p>
              <p className="text-sm text-gray-500">Online filing (eCO)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Registration Checklist</h4>
        <div className="space-y-2">
          {[
            { label: 'Complete work information', done: !!registration.title && !!registration.work_type },
            { label: 'Author information', done: !!registration.author_name },
            { label: 'Claimant information', done: !!registration.claimant_name || registration.author_name === registration.claimant_name },
            { label: 'Publication status', done: true },
            { label: 'AI disclosure (if applicable)', done: !registration.contains_ai_generated_content || !!registration.ai_disclosure_statement },
            { label: 'Deposit materials prepared', done: false }
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

      {registration.registration_number && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Registration Complete</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-green-700">Registration Number</dt>
              <dd className="font-mono font-semibold text-green-900">{registration.registration_number}</dd>
            </div>
            {registration.registration_date && (
              <div>
                <dt className="text-sm text-green-700">Registration Date</dt>
                <dd className="font-semibold text-green-900">{registration.registration_date}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

function SearchTab({ registration }: { registration: CopyrightRegistration }) {
  const [searchQuery, setSearchQuery] = useState(registration.title);
  const [searching, setSearching] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Search Copyright Records</h4>
        <p className="text-sm text-gray-500 mb-4">
          Search the Copyright Office catalog for similar works to assess potential conflicts.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, or keyword..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            onClick={() => {
              setSearching(true);
              setTimeout(() => setSearching(false), 2000);
            }}
            disabled={searching || !searchQuery}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      <div className="text-center py-8 text-gray-500">
        <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Enter a search query to find similar works in the Copyright Office catalog.</p>
      </div>
    </div>
  );
}

function InternationalTab({
  registration,
  registrations,
  treaties
}: {
  registration: CopyrightRegistration;
  registrations: InternationalCopyrightRegistration[];
  treaties: CopyrightTreaty[];
}) {
  const berneMembers = treaties.filter(t => t.berne_member);
  const analyses = treaties
    .filter(t => t.berne_member)
    .slice(0, 10)
    .map(t => analyzeProtection(t, registration.creation_date || new Date().toISOString()));
  const summary = getProtectionSummary(analyses);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Berne Convention Protection</h4>
        <p className="text-sm text-blue-700">
          As a work created in a Berne Convention member country, your work receives automatic copyright protection
          in {berneMembers.length}+ member countries without registration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <Globe className="w-8 h-8 mx-auto mb-2 text-teal-600" />
          <p className="text-2xl font-bold text-gray-900">{berneMembers.length}+</p>
          <p className="text-sm text-gray-500">Countries with automatic protection</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
          <p className="text-2xl font-bold text-gray-900">{summary.strongEnforcement}</p>
          <p className="text-sm text-gray-500">Strong enforcement jurisdictions</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
          <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
          <p className="text-sm text-gray-500">Active registrations</p>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-3">Protection by Country</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Treaty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enforcement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {treaties.slice(0, 15).map(treaty => {
                const intlReg = registrations.find(r => r.country_code === treaty.country_code);
                return (
                  <tr key={treaty.country_code} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{treaty.country_name}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {treaty.berne_member && <span className="text-sm text-gray-600">Berne</span>}
                      {treaty.wipo_wct_member && <span className="text-sm text-gray-600 ml-2">WCT</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {treaty.term_of_protection_years} years
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        treaty.enforcement_strength === 'very_strong' ? 'bg-green-100 text-green-700' :
                        treaty.enforcement_strength === 'strong' ? 'bg-blue-100 text-blue-700' :
                        treaty.enforcement_strength === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {treaty.enforcement_strength.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {intlReg ? (
                        <span className="text-sm text-green-600">Registered</span>
                      ) : treaty.berne_member ? (
                        <span className="text-sm text-blue-600">Auto-protected</span>
                      ) : (
                        <span className="text-sm text-gray-400">Not protected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ExportTab({ registration }: { registration: CopyrightRegistration }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = (format: string) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert(`Export to ${format} would be generated here`);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleExport('PDF')}
          disabled={exporting}
          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
        >
          <div className="p-3 bg-red-100 rounded-lg">
            <FileText className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Export Application PDF</h4>
            <p className="text-sm text-gray-500">Complete application for offline review</p>
          </div>
        </button>

        <button
          onClick={() => handleExport('eCO')}
          disabled={exporting}
          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
        >
          <div className="p-3 bg-blue-100 rounded-lg">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">eCO-Ready Export</h4>
            <p className="text-sm text-gray-500">Formatted for Copyright Office electronic filing</p>
          </div>
        </button>

        <button
          onClick={() => handleExport('Deposit')}
          disabled={exporting}
          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
        >
          <div className="p-3 bg-teal-100 rounded-lg">
            <Download className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Deposit Package</h4>
            <p className="text-sm text-gray-500">Prepare deposit materials for submission</p>
          </div>
        </button>

        <button
          onClick={() => handleExport('Notice')}
          disabled={exporting}
          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
        >
          <div className="p-3 bg-purple-100 rounded-lg">
            <Type className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Copyright Notice</h4>
            <p className="text-sm text-gray-500">Generate copyright notice text</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function CreateRegistrationModal({
  formData,
  setFormData,
  onClose,
  onSubmit,
  saving,
  aiTools
}: {
  formData: {
    title: string;
    registrationType: CopyrightRegistrationType;
    workType: CopyrightWorkType;
    description: string;
    yearOfCompletion: number;
    creationDate: string;
    publicationStatus: PublicationStatus;
    publicationDate: string;
    publicationCountry: string;
    authorName: string;
    authorCitizenship: string;
    authorType: AuthorType;
    containsAIGeneratedContent: boolean;
    aiContributionPercentage: number;
    aiToolsUsed: string[];
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  aiTools: AIToolInfo[];
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">New Copyright Registration</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter work title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Type</label>
              <select
                value={formData.registrationType}
                onChange={e => setFormData(prev => ({ ...prev, registrationType: e.target.value as CopyrightRegistrationType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="script">Script</option>
                <option value="character">Character</option>
                <option value="series">Series</option>
                <option value="episode">Episode</option>
                <option value="collection">Collection</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
              <select
                value={formData.workType}
                onChange={e => setFormData(prev => ({ ...prev, workType: e.target.value as CopyrightWorkType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="dramatic_work">Dramatic Work (Form PA)</option>
                <option value="visual_art">Visual Art (Form VA)</option>
                <option value="literary_work">Literary Work (Form TX)</option>
                <option value="audiovisual">Audiovisual (Form PA)</option>
                <option value="motion_picture">Motion Picture (Form PA)</option>
                <option value="sound_recording">Sound Recording (Form SR)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author Name *</label>
              <input
                type="text"
                value={formData.authorName}
                onChange={e => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                placeholder="Enter author name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author Type</label>
              <select
                value={formData.authorType}
                onChange={e => setFormData(prev => ({ ...prev, authorType: e.target.value as AuthorType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="individual">Individual</option>
                <option value="work_for_hire">Work for Hire</option>
                <option value="joint_work">Joint Work</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year of Completion</label>
              <input
                type="number"
                value={formData.yearOfCompletion}
                onChange={e => setFormData(prev => ({ ...prev, yearOfCompletion: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publication Status</label>
              <select
                value={formData.publicationStatus}
                onChange={e => setFormData(prev => ({ ...prev, publicationStatus: e.target.value as PublicationStatus }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="unpublished">Unpublished</option>
                <option value="published">Published</option>
                <option value="published_with_notice">Published with Notice</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.containsAIGeneratedContent}
                  onChange={e => setFormData(prev => ({ ...prev, containsAIGeneratedContent: e.target.checked }))}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">Contains AI-generated content</span>
              </label>
            </div>

            {formData.containsAIGeneratedContent && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Contribution %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.aiContributionPercentage}
                    onChange={e => setFormData(prev => ({ ...prev, aiContributionPercentage: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Tools Used</label>
                  <select
                    multiple
                    value={formData.aiToolsUsed}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      aiToolsUsed: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[100px]"
                  >
                    {aiTools.map(tool => (
                      <option key={`${tool.tool_name}-${tool.provider}`} value={tool.tool_name}>
                        {tool.tool_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
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
            disabled={saving || !formData.title || !formData.authorName}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Registration
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  title,
  onClose,
  onConfirm,
  saving
}: {
  title: string;
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
            <h2 className="text-xl font-semibold text-gray-900">Delete Registration</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete "{title}"? This action cannot be undone.
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
