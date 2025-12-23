import { CheckCircle, Circle, AlertCircle, Clock, DollarSign, ChevronRight, TrendingUp } from 'lucide-react';
import type { PatentApplicationWithDetails } from '../services/patentApplicationService';
import { countWords } from '../services/patentApplicationService';
import { calculateFilingFee, formatCurrency, type EntityStatus } from '../services/filingFeeService';

interface ProgressSection {
  id: string;
  label: string;
  tabId: string;
  isComplete: boolean;
  isRequired: boolean;
  details?: string;
  helpText?: string;
}

interface PatentProgressDashboardProps {
  application: PatentApplicationWithDetails;
  onNavigate: (tabId: string) => void;
  compact?: boolean;
}

export function PatentProgressDashboard({
  application,
  onNavigate,
  compact = false
}: PatentProgressDashboardProps) {
  const specWords = countWords(application.specification || '');
  const abstractWords = countWords(application.abstract || '');
  const independentClaims = application.claims.filter(c => c.claim_type === 'independent').length;

  const sections: ProgressSection[] = [
    {
      id: 'title',
      label: 'Invention Title',
      tabId: 'overview',
      isComplete: !!application.title && application.title.length > 10,
      isRequired: true,
      details: application.title ? `"${application.title.substring(0, 40)}${application.title.length > 40 ? '...' : ''}"` : undefined,
      helpText: 'A descriptive title for your invention'
    },
    {
      id: 'description',
      label: 'Invention Description',
      tabId: 'overview',
      isComplete: !!(application.summary_invention && application.summary_invention.length > 100),
      isRequired: true,
      details: application.summary_invention ? `${application.summary_invention.length} characters` : undefined,
      helpText: 'Detailed description of what your invention does'
    },
    {
      id: 'specification',
      label: 'Specification',
      tabId: 'specification',
      isComplete: specWords >= 500,
      isRequired: true,
      details: `${specWords.toLocaleString()} words${specWords < 500 ? ' (need 500+)' : ''}`,
      helpText: 'Technical details of how your invention works'
    },
    {
      id: 'claims',
      label: 'Patent Claims',
      tabId: 'claims',
      isComplete: application.claims.length >= 3 && independentClaims >= 1,
      isRequired: true,
      details: `${application.claims.length} claims (${independentClaims} independent)`,
      helpText: 'Legal definitions of what your patent covers'
    },
    {
      id: 'abstract',
      label: 'Abstract',
      tabId: 'abstract',
      isComplete: abstractWords > 0 && abstractWords <= 150,
      isRequired: true,
      details: abstractWords > 0 ? `${abstractWords}/150 words` : undefined,
      helpText: 'Brief summary of your invention (150 words max)'
    },
    {
      id: 'drawings',
      label: 'Drawings',
      tabId: 'drawings',
      isComplete: application.drawings.length > 0,
      isRequired: false,
      details: application.drawings.length > 0 ? `${application.drawings.length} figures` : 'Recommended',
      helpText: 'Visual diagrams explaining your invention'
    },
    {
      id: 'inventors',
      label: 'Inventor Information',
      tabId: 'filing',
      isComplete: !!(application.inventors && application.inventors.length > 0),
      isRequired: true,
      details: application.inventors?.length ? `${application.inventors.length} inventor(s)` : undefined,
      helpText: 'Who invented this technology'
    },
    {
      id: 'address',
      label: 'Correspondence Address',
      tabId: 'filing',
      isComplete: !!(application.correspondence_address?.street && application.correspondence_address?.city),
      isRequired: true,
      helpText: 'Where USPTO will send correspondence'
    }
  ];

  const requiredSections = sections.filter(s => s.isRequired);
  const completedRequired = requiredSections.filter(s => s.isComplete).length;
  const progressPercentage = Math.round((completedRequired / requiredSections.length) * 100);

  const isReadyToFile = completedRequired === requiredSections.length;

  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Filing Progress</span>
          <span className={`text-sm font-semibold ${isReadyToFile ? 'text-green-600' : 'text-amber-600'}`}>
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isReadyToFile ? 'bg-green-500' : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {completedRequired} of {requiredSections.length} required sections complete
        </p>
        {!isReadyToFile && (
          <button
            onClick={() => {
              const nextIncomplete = sections.find(s => s.isRequired && !s.isComplete);
              if (nextIncomplete) onNavigate(nextIncomplete.tabId);
            }}
            className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Continue where you left off
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Application Progress</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Complete all required sections to file your patent
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isReadyToFile ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Ready to File
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" />
                {requiredSections.length - completedRequired} items remaining
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  isReadyToFile ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          <span className="text-lg font-bold text-gray-900">{progressPercentage}%</span>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onNavigate(section.tabId)}
            className="w-full px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex-shrink-0">
              {section.isComplete ? (
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              ) : section.isRequired ? (
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                  <Circle className="w-4 h-4 text-amber-500" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Circle className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${section.isComplete ? 'text-gray-900' : 'text-gray-700'}`}>
                  {section.label}
                </span>
                {section.isRequired && !section.isComplete && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Required</span>
                )}
                {!section.isRequired && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Optional</span>
                )}
              </div>
              {section.details && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">{section.details}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>
        ))}
      </div>

      {!isReadyToFile && (
        <div className="p-4 bg-blue-50 border-t border-blue-100">
          <button
            onClick={() => {
              const nextIncomplete = sections.find(s => s.isRequired && !s.isComplete);
              if (nextIncomplete) onNavigate(nextIncomplete.tabId);
            }}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Continue to Next Section
          </button>
        </div>
      )}
    </div>
  );
}

interface CostEstimatorProps {
  application: PatentApplicationWithDetails;
  onEntityChange?: (status: EntityStatus) => void;
}

export function PatentCostEstimator({ application, onEntityChange }: CostEstimatorProps) {
  const entityStatus = application.entity_status || 'micro_entity';

  const feeBreakdown = calculateFilingFee({
    filingType: application.filing_type,
    entityStatus,
    pageCount: Math.ceil(countWords(application.specification || '') / 300) + application.drawings.length,
    totalClaims: application.claims.length,
    independentClaims: application.claims.filter(c => c.claim_type === 'independent').length,
    multipleDependent: false
  });

  const microFee = calculateFilingFee({
    filingType: application.filing_type,
    entityStatus: 'micro_entity',
    pageCount: Math.ceil(countWords(application.specification || '') / 300) + application.drawings.length,
    totalClaims: application.claims.length,
    independentClaims: application.claims.filter(c => c.claim_type === 'independent').length,
    multipleDependent: false
  }).totalFee;

  const regularFee = calculateFilingFee({
    filingType: application.filing_type,
    entityStatus: 'regular',
    pageCount: Math.ceil(countWords(application.specification || '') / 300) + application.drawings.length,
    totalClaims: application.claims.length,
    independentClaims: application.claims.filter(c => c.claim_type === 'independent').length,
    multipleDependent: false
  }).totalFee;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Estimated Filing Cost</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            USPTO fees for {application.filing_type === 'provisional' ? 'provisional' : 'non-provisional'} application
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-gray-600">Your estimated fee</span>
          <span className="text-2xl font-bold text-emerald-600">
            {formatCurrency(feeBreakdown.totalFee)}
          </span>
        </div>

        {feeBreakdown.savings.fromRegular > 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span>Saving {formatCurrency(feeBreakdown.savings.fromRegular)} ({feeBreakdown.savings.percentage}% off)</span>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium text-gray-700 uppercase tracking-wider">Compare Entity Types</p>
        <div className="grid grid-cols-3 gap-2">
          {(['micro_entity', 'small_entity', 'regular'] as EntityStatus[]).map((status) => {
            const fee = status === 'micro_entity' ? microFee :
                       status === 'regular' ? regularFee :
                       calculateFilingFee({
                         filingType: application.filing_type,
                         entityStatus: status,
                         pageCount: Math.ceil(countWords(application.specification || '') / 300) + application.drawings.length,
                         totalClaims: application.claims.length,
                         independentClaims: application.claims.filter(c => c.claim_type === 'independent').length,
                         multipleDependent: false
                       }).totalFee;

            const isSelected = entityStatus === status;
            const labels: Record<EntityStatus, string> = {
              micro_entity: 'Micro',
              small_entity: 'Small',
              regular: 'Regular'
            };

            return (
              <button
                key={status}
                onClick={() => onEntityChange?.(status)}
                className={`p-2 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className={`text-xs font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-600'}`}>
                  {labels[status]}
                </p>
                <p className={`text-sm font-semibold ${isSelected ? 'text-emerald-700' : 'text-gray-900'}`}>
                  {formatCurrency(fee)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p className="flex items-start gap-1">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Most independent inventors qualify as micro entity (75% discount)</span>
        </p>
        <p>
          Qualification: {"<"}4 prior patents, income {"<"}3x median household (~$225k)
        </p>
      </div>
    </div>
  );
}
