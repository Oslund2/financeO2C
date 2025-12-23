import { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  FileText,
  Target,
  DollarSign,
  Check,
  Loader2,
  HelpCircle,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { calculateFilingFee, formatCurrency, getEntityStatusDescription, type EntityStatus } from '../services/filingFeeService';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basics',
    title: 'Invention Basics',
    description: 'Name and describe your invention',
    icon: Lightbulb
  },
  {
    id: 'technical',
    title: 'Technical Details',
    description: 'Define the technical field and problem solved',
    icon: Target
  },
  {
    id: 'entity',
    title: 'Filing Status',
    description: 'Determine your entity status for fee calculation',
    icon: DollarSign
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Review your information and create the application',
    icon: FileText
  }
];

interface PatentApplicationWizardProps {
  onClose: () => void;
  onCreate: (data: {
    title: string;
    inventionDescription: string;
    technicalField: string;
    problemSolved: string;
    entityStatus: EntityStatus;
  }) => Promise<void>;
  saving: boolean;
}

export function PatentApplicationWizard({ onClose, onCreate, saving }: PatentApplicationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [title, setTitle] = useState('');
  const [inventionDescription, setInventionDescription] = useState('');
  const [technicalField, setTechnicalField] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [entityStatus, setEntityStatus] = useState<EntityStatus>('micro_entity');
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('patent_wizard_expert_mode');
    if (saved === 'true') {
      setExpertMode(true);
    }
  }, []);

  const handleExpertModeToggle = () => {
    const newValue = !expertMode;
    setExpertMode(newValue);
    localStorage.setItem('patent_wizard_expert_mode', String(newValue));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return title.trim().length >= 10 && inventionDescription.trim().length >= 100;
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return title.trim().length >= 10 && inventionDescription.trim().length >= 100;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    await onCreate({
      title,
      inventionDescription,
      technicalField,
      problemSolved,
      entityStatus
    });
  };

  const estimatedFee = calculateFilingFee({
    filingType: 'provisional',
    entityStatus,
    pageCount: 10,
    totalClaims: 15,
    independentClaims: 2,
    multipleDependent: false
  });

  const helpContent: Record<string, { title: string; content: string; example?: string }> = {
    title: {
      title: 'Writing a Good Patent Title',
      content: 'Your title should clearly describe what your invention does in 10-20 words. Avoid marketing language - focus on the technical function.',
      example: 'System and Method for Automated Document Classification Using Machine Learning'
    },
    description: {
      title: 'Describing Your Invention',
      content: 'Explain what your invention does, how it works, and what makes it different from existing solutions. Include technical details about components, steps, or algorithms.',
      example: 'A document processing system that automatically categorizes incoming documents using a trained neural network model. The system extracts text features, compares them against learned patterns, and assigns category labels with confidence scores.'
    },
    technicalField: {
      title: 'Choosing a Technical Field',
      content: 'This helps the patent office route your application to the right examiner. Choose the field that best matches your invention.',
      example: 'Computer-implemented methods, Data processing, Artificial intelligence, Image processing'
    },
    problemSolved: {
      title: 'Defining the Problem',
      content: 'Explain what technical problem your invention solves. This helps establish the value and novelty of your solution.',
      example: 'Current document classification systems require manual categorization, leading to inconsistent results and high labor costs. This invention provides automated classification with 95%+ accuracy.'
    }
  };

  if (expertMode) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Patent Application</h2>
              <p className="text-sm text-gray-500 mt-1">
                <button onClick={handleExpertModeToggle} className="text-blue-600 hover:text-blue-700">
                  Switch to guided mode
                </button>
              </p>
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
                placeholder="Describe your invention in detail..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {inventionDescription.length} characters (minimum 100)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technical Field</label>
                <input
                  type="text"
                  value={technicalField}
                  onChange={e => setTechnicalField(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Data processing systems"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Status</label>
                <select
                  value={entityStatus}
                  onChange={e => setEntityStatus(e.target.value as EntityStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="micro_entity">Micro Entity ($65)</option>
                  <option value="small_entity">Small Entity ($130)</option>
                  <option value="regular">Regular Entity ($325)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Problem Solved</label>
              <textarea
                value={problemSolved}
                onChange={e => setProblemSolved(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What problem does your invention solve?"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !canProceed()}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Create Application
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Patent Application</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Step {currentStep + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep].title}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExpertModeToggle}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Expert mode
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => index < currentStep && setCurrentStep(index)}
                    disabled={index > currentStep}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                      isCurrent
                        ? 'bg-blue-100 text-blue-700'
                        : isComplete
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                  </button>
                  {index < WIZARD_STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    What is your invention called? <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowHelp(showHelp === 'title' ? null : 'title')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Tips
                  </button>
                </div>
                {showHelp === 'title' && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium mb-1">{helpContent.title.title}</p>
                    <p className="text-sm text-blue-700">{helpContent.title.content}</p>
                    <p className="text-sm text-blue-600 mt-2 italic">Example: "{helpContent.title.example}"</p>
                  </div>
                )}
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="System and Method for..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {title.length} characters {title.length < 10 && title.length > 0 && <span className="text-amber-600">(need at least 10)</span>}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Describe your invention in detail <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowHelp(showHelp === 'description' ? null : 'description')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Tips
                  </button>
                </div>
                {showHelp === 'description' && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium mb-1">{helpContent.description.title}</p>
                    <p className="text-sm text-blue-700">{helpContent.description.content}</p>
                    <p className="text-sm text-blue-600 mt-2 italic">Example: "{helpContent.description.example}"</p>
                  </div>
                )}
                <textarea
                  value={inventionDescription}
                  onChange={e => setInventionDescription(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My invention is a system that... It works by... The key components are... What makes it different from existing solutions is..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {inventionDescription.length} characters
                  {inventionDescription.length < 100 && inventionDescription.length > 0 && (
                    <span className="text-amber-600 ml-1">(need {100 - inventionDescription.length} more)</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    What technical field does this belong to?
                  </label>
                  <button
                    onClick={() => setShowHelp(showHelp === 'technicalField' ? null : 'technicalField')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Tips
                  </button>
                </div>
                {showHelp === 'technicalField' && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium mb-1">{helpContent.technicalField.title}</p>
                    <p className="text-sm text-blue-700">{helpContent.technicalField.content}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    'Computer-implemented methods',
                    'Data processing systems',
                    'Artificial intelligence',
                    'User interface design',
                    'Network communication',
                    'Database systems',
                    'Image/Video processing',
                    'Other'
                  ].map(field => (
                    <button
                      key={field}
                      onClick={() => setTechnicalField(field === 'Other' ? '' : field)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        technicalField === field
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {field}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={technicalField}
                  onChange={e => setTechnicalField(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Or type your own..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    What problem does your invention solve?
                  </label>
                  <button
                    onClick={() => setShowHelp(showHelp === 'problemSolved' ? null : 'problemSolved')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Tips
                  </button>
                </div>
                {showHelp === 'problemSolved' && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium mb-1">{helpContent.problemSolved.title}</p>
                    <p className="text-sm text-blue-700">{helpContent.problemSolved.content}</p>
                    <p className="text-sm text-blue-600 mt-2 italic">Example: "{helpContent.problemSolved.example}"</p>
                  </div>
                )}
                <textarea
                  value={problemSolved}
                  onChange={e => setProblemSolved(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Current solutions have these limitations... My invention addresses this by..."
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Most independent inventors qualify as Micro Entity</p>
                    <p className="text-sm text-amber-700 mt-1">
                      This saves you 75% on filing fees. Answer the questions below to check if you qualify.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {(['micro_entity', 'small_entity', 'regular'] as EntityStatus[]).map(status => {
                  const info = getEntityStatusDescription(status);
                  const fee = calculateFilingFee({
                    filingType: 'provisional',
                    entityStatus: status,
                    pageCount: 10,
                    totalClaims: 15,
                    independentClaims: 2,
                    multipleDependent: false
                  });

                  return (
                    <button
                      key={status}
                      onClick={() => setEntityStatus(status)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        entityStatus === status
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{info.title}</span>
                            {status === 'micro_entity' && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                          <ul className="mt-2 space-y-1">
                            {info.qualifications.slice(0, 3).map((qual, i) => (
                              <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                                <Check className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                {qual}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(fee.totalFee)}</p>
                          <p className="text-xs text-gray-500">USPTO filing fee</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-5 space-y-4">
                <h3 className="font-semibold text-gray-900">Review Your Application</h3>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Title</p>
                  <p className="text-gray-900 mt-1">{title || '-'}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</p>
                  <p className="text-gray-700 mt-1 text-sm line-clamp-4">{inventionDescription || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Technical Field</p>
                    <p className="text-gray-900 mt-1">{technicalField || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Entity Status</p>
                    <p className="text-gray-900 mt-1">{getEntityStatusDescription(entityStatus).title}</p>
                  </div>
                </div>

                {problemSolved && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Problem Solved</p>
                    <p className="text-gray-700 mt-1 text-sm">{problemSolved}</p>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-emerald-800">Estimated USPTO Filing Fee</p>
                    <p className="text-sm text-emerald-700">{getEntityStatusDescription(entityStatus).title}</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-700">{formatCurrency(estimatedFee.totalFee)}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">What happens next?</p>
                    <ul className="mt-1 space-y-1 text-blue-700">
                      <li>1. AI will generate patent specification, claims, and drawings</li>
                      <li>2. Review and edit each section as needed</li>
                      <li>3. Download your complete filing package</li>
                      <li>4. Submit to USPTO via Patent Center</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Application
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
