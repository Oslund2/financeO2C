import { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Download,
  FileText,
  Users,
  MapPin,
  Tag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
  Calendar,
  Shield,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import type {
  PatentApplicationWithDetails,
  EntityStatus,
  InventorInfo,
  CorrespondenceAddressInfo,
  FilingChecklistStatus
} from '../services/patentApplicationService';
import { updatePatentApplication, countWords } from '../services/patentApplicationService';
import {
  calculateFilingFee,
  getEntityStatusDescription,
  formatCurrency,
  estimatePageCount,
  calculateFilingDeadlines,
  compareEntityFees,
  type FeeBreakdown
} from '../services/filingFeeService';
import {
  suggestCPCClassifications,
  updatePatentClassifications,
  getCPCReferenceData,
  COMMON_SOFTWARE_CPC_CLASSES,
  type CPCClassificationResult,
  type CPCReferenceData
} from '../services/cpcClassificationService';
import {
  downloadCoverSheet,
  validateCoverSheetData,
  createDefaultInventor,
  createDefaultCorrespondenceAddress,
  type CoverSheetData
} from '../services/coverSheetService';

interface PatentFilingTabProps {
  application: PatentApplicationWithDetails;
  onUpdate: (updates: Partial<PatentApplicationWithDetails>) => Promise<void>;
}

export function PatentFilingTab({ application, onUpdate }: PatentFilingTabProps) {
  const [activeSection, setActiveSection] = useState<string>('checklist');
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);
  const [entityStatus, setEntityStatus] = useState<EntityStatus>(application.entity_status || 'regular');
  const [inventors, setInventors] = useState<InventorInfo[]>(application.inventors || []);
  const [correspondenceAddress, setCorrespondenceAddress] = useState<CorrespondenceAddressInfo>(
    application.correspondence_address || createDefaultCorrespondenceAddress()
  );
  const [editingInventors, setEditingInventors] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classificationLoading, setClassificationLoading] = useState(false);
  const [cpcData, setCpcData] = useState<CPCReferenceData[]>([]);
  const [classifications, setClassifications] = useState<CPCClassificationResult | null>(null);
  const [showCpcDropdown, setShowCpcDropdown] = useState(false);

  useEffect(() => {
    calculateFees();
    loadCPCData();
    if (application.cpc_classifications?.primaryDetails) {
      setClassifications({
        primary: application.cpc_classifications.primaryDetails,
        secondary: application.cpc_classifications.secondaryDetails || [],
        aiSuggested: application.cpc_classifications.ai_suggested,
        confidence: application.cpc_classifications.confidence,
        analysisRationale: application.cpc_classifications.rationale
      });
    }
  }, [application, entityStatus]);

  const loadCPCData = async () => {
    const data = await getCPCReferenceData();
    setCpcData(data);
  };

  const calculateFees = () => {
    const pageCount = estimatePageCount(
      countWords(application.specification || ''),
      countWords(application.abstract || ''),
      application.claims.length,
      application.drawings.length
    );

    const fees = calculateFilingFee({
      filingType: application.filing_type,
      entityStatus,
      pageCount,
      totalClaims: application.claims.length,
      independentClaims: application.claims.filter(c => c.claim_type === 'independent').length,
      multipleDependent: false
    });

    setFeeBreakdown(fees);
  };

  const handleSuggestClassification = async () => {
    setClassificationLoading(true);
    try {
      const claimsText = application.claims.map(c => c.claim_text).join('\n\n');
      const result = await suggestCPCClassifications(
        application.title,
        application.invention_description || application.summary_invention || '',
        application.technical_field,
        claimsText
      );
      setClassifications(result);
      await updatePatentClassifications(application.id, result);
      await onUpdate({
        cpc_classifications: {
          primary: result.primary?.code || null,
          primaryDetails: result.primary || undefined,
          secondary: result.secondary.map(s => s.code),
          secondaryDetails: result.secondary,
          ai_suggested: result.aiSuggested,
          confidence: result.confidence,
          rationale: result.analysisRationale
        }
      });
    } catch (error) {
      console.error('Failed to suggest classification:', error);
    } finally {
      setClassificationLoading(false);
    }
  };

  const handleSelectCPC = async (code: string) => {
    const ref = cpcData.find(r => r.code === code);
    if (!ref) return;

    const newPrimary = {
      code: ref.code,
      title: ref.title,
      description: ref.description || undefined,
      level: ref.level,
      category: ref.category,
      confidence: 1.0
    };

    const newResult: CPCClassificationResult = {
      primary: newPrimary,
      secondary: classifications?.secondary || [],
      aiSuggested: false,
      confidence: 1.0,
      analysisRationale: 'Manually selected by user'
    };

    setClassifications(newResult);
    setShowCpcDropdown(false);
    await updatePatentClassifications(application.id, newResult);
    await onUpdate({
      cpc_classifications: {
        primary: newPrimary.code,
        primaryDetails: newPrimary,
        secondary: newResult.secondary.map(s => s.code),
        secondaryDetails: newResult.secondary,
        ai_suggested: false,
        confidence: 1.0,
        rationale: 'Manually selected by user'
      }
    });
  };

  const handleSaveEntityStatus = async () => {
    setSaving(true);
    try {
      await onUpdate({ entity_status: entityStatus });
      calculateFees();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInventors = async () => {
    setSaving(true);
    try {
      await onUpdate({ inventors });
      setEditingInventors(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    setSaving(true);
    try {
      await onUpdate({ correspondence_address: correspondenceAddress });
      setEditingAddress(false);
    } finally {
      setSaving(false);
    }
  };

  const addInventor = () => {
    setInventors([...inventors, createDefaultInventor()]);
  };

  const removeInventor = (id: string) => {
    setInventors(inventors.filter(inv => inv.id !== id));
  };

  const updateInventor = (id: string, updates: Partial<InventorInfo>) => {
    setInventors(inventors.map(inv =>
      inv.id === id ? { ...inv, ...updates } : inv
    ));
  };

  const handleDownloadCoverSheet = () => {
    const data: CoverSheetData = {
      title: application.title,
      inventors: inventors.length > 0 ? inventors : [{
        id: '1',
        fullName: application.inventor_name || 'Unknown',
        residence: { city: '', state: '', country: 'US' },
        citizenship: application.inventor_citizenship || 'US Citizen'
      }],
      correspondenceAddress,
      entityStatus,
      governmentInterest: application.government_interest || undefined
    };
    downloadCoverSheet(data, 'pdf');
  };

  const checklist = buildChecklist(application, inventors, correspondenceAddress, classifications);
  const deadlines = calculateFilingDeadlines(
    application.provisional_filing_date ? new Date(application.provisional_filing_date) : null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Filing Preparation</h2>
        <div className="flex items-center gap-2">
          {checklist.readyToFile ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Ready to File
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              Incomplete
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {['checklist', 'inventors', 'classification', 'fees', 'instructions'].map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === section
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {activeSection === 'checklist' && (
        <FilingChecklist
          checklist={checklist}
          deadlines={deadlines}
          onDownloadCoverSheet={handleDownloadCoverSheet}
        />
      )}

      {activeSection === 'inventors' && (
        <InventorsSection
          inventors={inventors}
          correspondenceAddress={correspondenceAddress}
          editing={editingInventors}
          editingAddress={editingAddress}
          saving={saving}
          onSetEditing={setEditingInventors}
          onSetEditingAddress={setEditingAddress}
          onAddInventor={addInventor}
          onRemoveInventor={removeInventor}
          onUpdateInventor={updateInventor}
          onUpdateAddress={setCorrespondenceAddress}
          onSaveInventors={handleSaveInventors}
          onSaveAddress={handleSaveAddress}
        />
      )}

      {activeSection === 'classification' && (
        <ClassificationSection
          classifications={classifications}
          cpcData={cpcData}
          loading={classificationLoading}
          showDropdown={showCpcDropdown}
          onSuggest={handleSuggestClassification}
          onSelectCPC={handleSelectCPC}
          onToggleDropdown={() => setShowCpcDropdown(!showCpcDropdown)}
        />
      )}

      {activeSection === 'fees' && (
        <FeesSection
          feeBreakdown={feeBreakdown}
          entityStatus={entityStatus}
          filingType={application.filing_type}
          onChangeEntity={setEntityStatus}
          onSave={handleSaveEntityStatus}
          saving={saving}
          pageCount={estimatePageCount(
            countWords(application.specification || ''),
            countWords(application.abstract || ''),
            application.claims.length,
            application.drawings.length
          )}
          claimsCount={application.claims.length}
          independentClaims={application.claims.filter(c => c.claim_type === 'independent').length}
        />
      )}

      {activeSection === 'instructions' && (
        <FilingInstructions filingType={application.filing_type} />
      )}
    </div>
  );
}

interface ChecklistItem {
  key: string;
  label: string;
  complete: boolean;
  details?: string;
  required: boolean;
}

interface ChecklistData {
  items: ChecklistItem[];
  readyToFile: boolean;
  completedCount: number;
  totalRequired: number;
}

function buildChecklist(
  app: PatentApplicationWithDetails,
  inventors: InventorInfo[],
  address: CorrespondenceAddressInfo,
  classifications: CPCClassificationResult | null
): ChecklistData {
  const specWords = countWords(app.specification || '');
  const abstractWords = countWords(app.abstract || '');
  const independentClaims = app.claims.filter(c => c.claim_type === 'independent').length;

  const items: ChecklistItem[] = [
    {
      key: 'title',
      label: 'Invention Title',
      complete: !!app.title && app.title.length > 0,
      details: app.title,
      required: true
    },
    {
      key: 'specification',
      label: 'Specification',
      complete: specWords >= 100,
      details: `${specWords.toLocaleString()} words`,
      required: true
    },
    {
      key: 'abstract',
      label: 'Abstract (150 words max)',
      complete: abstractWords > 0 && abstractWords <= 150,
      details: `${abstractWords}/150 words`,
      required: true
    },
    {
      key: 'claims',
      label: 'Claims with at least 1 independent',
      complete: app.claims.length > 0 && independentClaims > 0,
      details: `${app.claims.length} claims (${independentClaims} independent)`,
      required: true
    },
    {
      key: 'drawings',
      label: 'Drawings',
      complete: app.drawings.length > 0,
      details: `${app.drawings.length} figures`,
      required: true
    },
    {
      key: 'inventors',
      label: 'Inventor Information',
      complete: inventors.length > 0 && inventors.every(i => i.fullName && i.residence.city),
      details: `${inventors.length} inventor(s)`,
      required: true
    },
    {
      key: 'address',
      label: 'Correspondence Address',
      complete: !!address.street && !!address.city && !!address.zipCode,
      details: address.city ? `${address.city}, ${address.state}` : 'Not set',
      required: true
    },
    {
      key: 'classification',
      label: 'CPC Classification',
      complete: !!classifications?.primary,
      details: classifications?.primary?.code || 'Not assigned',
      required: false
    }
  ];

  const requiredItems = items.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => i.complete).length;

  return {
    items,
    readyToFile: completedRequired === requiredItems.length,
    completedCount: completedRequired,
    totalRequired: requiredItems.length
  };
}

function FilingChecklist({
  checklist,
  deadlines,
  onDownloadCoverSheet
}: {
  checklist: ChecklistData;
  deadlines: ReturnType<typeof calculateFilingDeadlines>;
  onDownloadCoverSheet: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Filing Readiness</h3>
          <span className="text-2xl font-bold text-blue-600">
            {checklist.completedCount}/{checklist.totalRequired}
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${(checklist.completedCount / checklist.totalRequired) * 100}%` }}
          />
        </div>
      </div>

      {deadlines.length > 0 && (
        <div className={`rounded-lg p-4 ${
          deadlines[0].isPast ? 'bg-red-50 border border-red-200' :
          deadlines[0].isUrgent ? 'bg-orange-50 border border-orange-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <Calendar className={`w-5 h-5 ${
              deadlines[0].isPast ? 'text-red-600' :
              deadlines[0].isUrgent ? 'text-orange-600' : 'text-blue-600'
            }`} />
            <div>
              <p className="font-medium text-gray-900">{deadlines[0].type} Deadline</p>
              <p className={`text-sm ${
                deadlines[0].isPast ? 'text-red-700' :
                deadlines[0].isUrgent ? 'text-orange-700' : 'text-blue-700'
              }`}>
                {deadlines[0].isPast
                  ? `Expired ${Math.abs(deadlines[0].daysRemaining)} days ago`
                  : `${deadlines[0].daysRemaining} days remaining (${deadlines[0].deadline.toLocaleDateString()})`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {checklist.items.map(item => (
          <div key={item.key} className="flex items-center gap-3 p-4">
            {item.complete ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : item.required ? (
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${item.complete ? 'text-gray-900' : 'text-gray-600'}`}>
                {item.label}
                {!item.required && <span className="text-xs text-gray-400 ml-2">(optional)</span>}
              </p>
              {item.details && (
                <p className="text-sm text-gray-500">{item.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onDownloadCoverSheet}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Cover Sheet (SB/16)
        </button>
        <a
          href="https://www.uspto.gov/patents/basics/apply/provisional-application"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
        >
          <ExternalLink className="w-4 h-4" />
          USPTO Filing Guide
        </a>
      </div>
    </div>
  );
}

function InventorsSection({
  inventors,
  correspondenceAddress,
  editing,
  editingAddress,
  saving,
  onSetEditing,
  onSetEditingAddress,
  onAddInventor,
  onRemoveInventor,
  onUpdateInventor,
  onUpdateAddress,
  onSaveInventors,
  onSaveAddress
}: {
  inventors: InventorInfo[];
  correspondenceAddress: CorrespondenceAddressInfo;
  editing: boolean;
  editingAddress: boolean;
  saving: boolean;
  onSetEditing: (v: boolean) => void;
  onSetEditingAddress: (v: boolean) => void;
  onAddInventor: () => void;
  onRemoveInventor: (id: string) => void;
  onUpdateInventor: (id: string, updates: Partial<InventorInfo>) => void;
  onUpdateAddress: (address: CorrespondenceAddressInfo) => void;
  onSaveInventors: () => void;
  onSaveAddress: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Inventors
          </h3>
          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={() => onSetEditing(false)}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={onSaveInventors}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSetEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {inventors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No inventors added yet</p>
            {editing && (
              <button
                onClick={onAddInventor}
                className="mt-3 flex items-center gap-2 px-4 py-2 mx-auto bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Inventor
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {inventors.map((inv, idx) => (
              <div key={inv.id} className="bg-gray-50 rounded-lg p-4">
                {editing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Inventor {idx + 1}</span>
                      <button
                        onClick={() => onRemoveInventor(inv.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={inv.fullName}
                      onChange={e => onUpdateInventor(inv.id, { fullName: e.target.value })}
                      placeholder="Full Legal Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={inv.residence.city}
                        onChange={e => onUpdateInventor(inv.id, {
                          residence: { ...inv.residence, city: e.target.value }
                        })}
                        placeholder="City"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={inv.residence.state}
                        onChange={e => onUpdateInventor(inv.id, {
                          residence: { ...inv.residence, state: e.target.value }
                        })}
                        placeholder="State"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={inv.residence.country}
                        onChange={e => onUpdateInventor(inv.id, {
                          residence: { ...inv.residence, country: e.target.value }
                        })}
                        placeholder="Country"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <input
                      type="text"
                      value={inv.citizenship}
                      onChange={e => onUpdateInventor(inv.id, { citizenship: e.target.value })}
                      placeholder="Citizenship (e.g., US Citizen)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-gray-900">{inv.fullName || 'Name not set'}</p>
                    <p className="text-sm text-gray-600">
                      {inv.residence.city ? `${inv.residence.city}, ${inv.residence.state}, ${inv.residence.country}` : 'Residence not set'}
                    </p>
                    <p className="text-sm text-gray-500">{inv.citizenship}</p>
                  </div>
                )}
              </div>
            ))}
            {editing && (
              <button
                onClick={onAddInventor}
                className="flex items-center gap-2 px-4 py-2 w-full justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600"
              >
                <Plus className="w-4 h-4" />
                Add Another Inventor
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Correspondence Address
          </h3>
          {editingAddress ? (
            <div className="flex gap-2">
              <button
                onClick={() => onSetEditingAddress(false)}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={onSaveAddress}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSetEditingAddress(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {editingAddress ? (
          <div className="space-y-3">
            <input
              type="text"
              value={correspondenceAddress.name || ''}
              onChange={e => onUpdateAddress({ ...correspondenceAddress, name: e.target.value })}
              placeholder="Name (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              value={correspondenceAddress.street}
              onChange={e => onUpdateAddress({ ...correspondenceAddress, street: e.target.value })}
              placeholder="Street Address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                value={correspondenceAddress.city}
                onChange={e => onUpdateAddress({ ...correspondenceAddress, city: e.target.value })}
                placeholder="City"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={correspondenceAddress.state}
                onChange={e => onUpdateAddress({ ...correspondenceAddress, state: e.target.value })}
                placeholder="State"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={correspondenceAddress.zipCode}
                onChange={e => onUpdateAddress({ ...correspondenceAddress, zipCode: e.target.value })}
                placeholder="ZIP"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={correspondenceAddress.country}
                onChange={e => onUpdateAddress({ ...correspondenceAddress, country: e.target.value })}
                placeholder="Country"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="tel"
                value={correspondenceAddress.phone || ''}
                onChange={e => onUpdateAddress({ ...correspondenceAddress, phone: e.target.value })}
                placeholder="Phone (optional)"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                value={correspondenceAddress.email || ''}
                onChange={e => onUpdateAddress({ ...correspondenceAddress, email: e.target.value })}
                placeholder="Email (optional)"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        ) : (
          <div className="text-gray-600">
            {correspondenceAddress.street ? (
              <>
                {correspondenceAddress.name && <p className="font-medium text-gray-900">{correspondenceAddress.name}</p>}
                <p>{correspondenceAddress.street}</p>
                <p>{correspondenceAddress.city}, {correspondenceAddress.state} {correspondenceAddress.zipCode}</p>
                <p>{correspondenceAddress.country}</p>
                {correspondenceAddress.phone && <p className="text-sm text-gray-500 mt-2">Phone: {correspondenceAddress.phone}</p>}
                {correspondenceAddress.email && <p className="text-sm text-gray-500">Email: {correspondenceAddress.email}</p>}
              </>
            ) : (
              <p className="text-gray-500">No address set</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ClassificationSection({
  classifications,
  cpcData,
  loading,
  showDropdown,
  onSuggest,
  onSelectCPC,
  onToggleDropdown
}: {
  classifications: CPCClassificationResult | null;
  cpcData: CPCReferenceData[];
  loading: boolean;
  showDropdown: boolean;
  onSuggest: () => void;
  onSelectCPC: (code: string) => void;
  onToggleDropdown: () => void;
}) {
  const subclasses = cpcData.filter(r => r.level >= 3 && r.level <= 4);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800">
              CPC (Cooperative Patent Classification) codes help categorize your invention
              and improve searchability. While not required for provisional applications,
              proper classification helps with prior art searches and examiner assignment.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            CPC Classification
          </h3>
          <button
            onClick={onSuggest}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Suggest Classification
              </>
            )}
          </button>
        </div>

        {classifications?.primary ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium mb-1">PRIMARY CLASSIFICATION</p>
                  <p className="text-lg font-mono font-bold text-green-800">{classifications.primary.code}</p>
                  <p className="text-sm text-green-700">{classifications.primary.title}</p>
                </div>
                {classifications.aiSuggested && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                    <Sparkles className="w-3 h-3" />
                    AI Suggested
                  </span>
                )}
              </div>
              {classifications.confidence && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600">Confidence:</span>
                    <div className="flex-1 bg-green-200 rounded-full h-1.5">
                      <div
                        className="bg-green-600 h-1.5 rounded-full"
                        style={{ width: `${classifications.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-green-700">
                      {Math.round(classifications.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {classifications.secondary.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">SECONDARY CLASSIFICATIONS</p>
                <div className="space-y-2">
                  {classifications.secondary.map((sec, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <span className="font-mono text-sm font-medium text-gray-700">{sec.code}</span>
                      <span className="text-sm text-gray-600">{sec.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {classifications.analysisRationale && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">ANALYSIS RATIONALE</p>
                <p className="text-sm text-gray-700">{classifications.analysisRationale}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No classification assigned yet</p>
            <p className="text-sm">Click "Suggest Classification" to get AI recommendations</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={onToggleDropdown}
              className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
            >
              <span className="text-gray-700">Select Classification Manually</span>
              {showDropdown ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {showDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                <div className="p-2 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-medium text-gray-500">COMMON SOFTWARE/TECH CLASSIFICATIONS</p>
                </div>
                {COMMON_SOFTWARE_CPC_CLASSES.map(cls => (
                  <button
                    key={cls.code}
                    onClick={() => onSelectCPC(cls.code)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-mono font-medium text-blue-600">{cls.code}</span>
                    <span className="text-gray-700 ml-2">{cls.title}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{cls.description}</p>
                  </button>
                ))}
                <div className="p-2 border-t border-gray-200 bg-gray-50">
                  <p className="text-xs font-medium text-gray-500">ALL CLASSIFICATIONS</p>
                </div>
                {subclasses.map(cls => (
                  <button
                    key={cls.code}
                    onClick={() => onSelectCPC(cls.code)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-mono text-sm font-medium text-gray-700">{cls.code}</span>
                    <span className="text-sm text-gray-600 ml-2">{cls.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href="https://www.uspto.gov/web/patents/classification/cpc/html/cpc.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            View full CPC classification scheme at USPTO
          </a>
        </div>
      </div>
    </div>
  );
}

function FeesSection({
  feeBreakdown,
  entityStatus,
  filingType,
  onChangeEntity,
  onSave,
  saving,
  pageCount,
  claimsCount,
  independentClaims
}: {
  feeBreakdown: FeeBreakdown | null;
  entityStatus: EntityStatus;
  filingType: string;
  onChangeEntity: (status: EntityStatus) => void;
  onSave: () => void;
  saving: boolean;
  pageCount: number;
  claimsCount: number;
  independentClaims: number;
}) {
  const comparison = compareEntityFees(
    filingType as any,
    pageCount,
    claimsCount,
    independentClaims
  );

  const entities: EntityStatus[] = ['regular', 'small_entity', 'micro_entity'];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-600" />
          Entity Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {entities.map(status => {
            const info = getEntityStatusDescription(status);
            const isSelected = entityStatus === status;
            return (
              <button
                key={status}
                onClick={() => onChangeEntity(status)}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{info.title}</span>
                  {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
                </div>
                <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(
                    status === 'regular' ? comparison.regular :
                    status === 'small_entity' ? comparison.smallEntity :
                    comparison.microEntity
                  )}
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Entity Status
        </button>
      </div>

      {feeBreakdown && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Fee Breakdown</h3>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Base Filing Fee</span>
              <span className="font-medium">{formatCurrency(feeBreakdown.baseFee)}</span>
            </div>
            {feeBreakdown.searchFee > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Search Fee</span>
                <span className="font-medium">{formatCurrency(feeBreakdown.searchFee)}</span>
              </div>
            )}
            {feeBreakdown.examinationFee > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Examination Fee</span>
                <span className="font-medium">{formatCurrency(feeBreakdown.examinationFee)}</span>
              </div>
            )}
            {feeBreakdown.applicationSizeFee > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Application Size Fee</span>
                <span className="font-medium">{formatCurrency(feeBreakdown.applicationSizeFee)}</span>
              </div>
            )}
            {feeBreakdown.claimsFee > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Excess Claims Fee</span>
                <span className="font-medium">{formatCurrency(feeBreakdown.claimsFee)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 border-gray-200">
              <span className="font-semibold text-gray-900">Total Estimated Fee</span>
              <span className="font-bold text-xl text-green-600">{formatCurrency(feeBreakdown.totalFee)}</span>
            </div>
          </div>

          {feeBreakdown.savings.fromRegular > 0 && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                You save {formatCurrency(feeBreakdown.savings.fromRegular)} ({feeBreakdown.savings.percentage}%)
                with {entityStatus === 'small_entity' ? 'Small Entity' : 'Micro Entity'} status
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-2">Estimated Based On:</p>
        <ul className="space-y-1">
          <li>Filing Type: {filingType === 'provisional' ? 'Provisional' : 'Non-Provisional'}</li>
          <li>Estimated Pages: {pageCount}</li>
          <li>Total Claims: {claimsCount}</li>
          <li>Independent Claims: {independentClaims}</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Fees based on USPTO 2024 fee schedule. Actual fees may vary.
        </p>
      </div>
    </div>
  );
}

function FilingInstructions({ filingType }: { filingType: string }) {
  const isProvisional = filingType === 'provisional';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-lg text-gray-900 mb-2">
          {isProvisional ? 'Provisional Patent Application' : 'Non-Provisional Patent Application'} Filing Guide
        </h3>
        <p className="text-gray-600">
          {isProvisional
            ? 'A provisional application establishes your filing date and gives you 12 months to file a complete non-provisional application.'
            : 'A non-provisional application is examined by the USPTO and can result in an issued patent.'}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Step-by-Step Filing Instructions</h4>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Create USPTO Patent Center Account</p>
              <p className="text-sm text-gray-600 mt-1">
                Visit <a href="https://patentcenter.uspto.gov" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">patentcenter.uspto.gov</a> and create an account if you don't have one.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Prepare Your Documents</p>
              <p className="text-sm text-gray-600 mt-1">
                Use the Export tab to download your specification PDF, drawings, and cover sheet (SB/16).
                Ensure all PDFs meet USPTO requirements.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Start New Application in Patent Center</p>
              <p className="text-sm text-gray-600 mt-1">
                Select "{isProvisional ? 'Provisional' : 'Utility Non-Provisional'}" application type.
                Follow the web-based ADS form to enter application data.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <p className="font-medium text-gray-900">Upload Documents</p>
              <p className="text-sm text-gray-600 mt-1">
                Upload your specification, drawings, and any additional documents.
                The system will validate file formats and sizes.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              5
            </div>
            <div>
              <p className="font-medium text-gray-900">Pay Filing Fee</p>
              <p className="text-sm text-gray-600 mt-1">
                Select your entity status and pay the appropriate filing fee.
                Keep your receipt for records.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              6
            </div>
            <div>
              <p className="font-medium text-gray-900">Submit and Get Filing Receipt</p>
              <p className="text-sm text-gray-600 mt-1">
                After submission, you'll receive an application number and filing date.
                Save these for your records.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isProvisional && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Important: 12-Month Deadline</p>
              <p className="text-sm text-yellow-700 mt-1">
                You must file a non-provisional application within 12 months of your provisional filing date
                to claim the benefit of the provisional's priority date. This deadline cannot be extended.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Document Requirements</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-2">PDF Specifications</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Format: PDF (preferred) or DOCX</li>
              <li>Max file size: 25 MB per document</li>
              <li>Text must be searchable (not scanned images)</li>
              <li>1.5 or double line spacing recommended</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-2">Drawing Requirements</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Black and white line drawings</li>
              <li>300 DPI minimum resolution</li>
              <li>Margins: 2.5 cm from edges</li>
              <li>Figure numbers (FIG. 1, FIG. 2, etc.)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Helpful Resources</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a
            href="https://www.uspto.gov/patents/basics/apply/provisional-application"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-blue-600" />
            <span className="text-gray-700">USPTO Provisional Application Guide</span>
          </a>

          <a
            href="https://patentcenter.uspto.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-blue-600" />
            <span className="text-gray-700">USPTO Patent Center</span>
          </a>

          <a
            href="https://www.uspto.gov/patents/apply/forms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-blue-600" />
            <span className="text-gray-700">USPTO Patent Forms</span>
          </a>

          <a
            href="https://www.uspto.gov/learning-and-resources/fees-and-payment/uspto-fee-schedule"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-blue-600" />
            <span className="text-gray-700">USPTO Fee Schedule</span>
          </a>
        </div>
      </div>
    </div>
  );
}
