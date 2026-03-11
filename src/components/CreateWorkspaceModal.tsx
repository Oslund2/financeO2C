/**
 * CreateWorkspaceModal - Modal component for creating new workspaces/organizations
 *
 * This component provides a user-friendly interface for creating new workspaces with
 * automatic slug generation, billing tier selection, and error handling.
 *
 * Features:
 * - Automatic URL slug generation from workspace name
 * - Four billing tier options (Free, Starter, Professional, Enterprise)
 * - Real-time validation and character count
 * - Error handling with user feedback
 * - Timestamp-based unique slug generation to prevent conflicts
 *
 * @component
 * @example
 * ```tsx
 * <CreateWorkspaceModal
 *   onClose={() => setShowModal(false)}
 *   onCreate={(orgId) => handleWorkspaceCreated(orgId)}
 * />
 * ```
 */

import { useState, useEffect } from 'react';
import { X, Building2, Loader2, Check, AlertCircle, Palette, Film, Video, Layers, Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreate: (organizationId: string) => void;
}

type WorkspaceType = 'claymation' | 'photoreal' | 'documentary' | 'general' | 'commercial';

interface WorkspaceTypeConfig {
  value: WorkspaceType;
  label: string;
  description: string;
  features: string[];
  icon: typeof Palette;
  color: string;
  bgGradient: string;
  badge?: string;
}

const WORKSPACE_TYPES: WorkspaceTypeConfig[] = [
  {
    value: 'commercial',
    label: 'Commercial & Promo',
    description: 'Ad spots, branded content, and promos — brief to deliverables in hours',
    features: ['AI Concept Generator', ':10/:15/:30 Spot Formats', 'Auto Variant Cutdowns', 'Project Fee Economics'],
    icon: Megaphone,
    color: 'amber',
    bgGradient: 'from-amber-500 to-orange-500',
    badge: 'New',
  },
  {
    value: 'photoreal',
    label: 'Photorealistic',
    description: 'Cinematic live-action and photorealistic video production',
    features: ['Historical Fact Checker', 'Citation Manager', 'Period Accuracy'],
    icon: Film,
    color: 'blue',
    bgGradient: 'from-blue-500 to-blue-600',
  },
  {
    value: 'documentary',
    label: 'Documentary',
    description: 'Documentary-style storytelling with interview formats',
    features: ['Fact Checker', 'Archival Integration', 'Interview Format'],
    icon: Video,
    color: 'emerald',
    bgGradient: 'from-emerald-500 to-green-600',
  },
  {
    value: 'claymation',
    label: 'Claymation Animation',
    description: 'Stop-motion style animation with clay characters',
    features: ['Vocabulary Randomizer', 'Clay Texture Settings', 'Spelling Word Integration'],
    icon: Palette,
    color: 'orange',
    bgGradient: 'from-orange-400 to-red-500',
  },
  {
    value: 'general',
    label: 'General Purpose',
    description: 'Flexible workspace with no style constraints',
    features: ['All Features Available', 'No Style Constraints'],
    icon: Layers,
    color: 'slate',
    bgGradient: 'from-slate-500 to-slate-600',
  },
];

/**
 * Billing tier configuration options
 * Each tier defines feature limits and pricing structure
 */
const BILLING_TIERS = [
  {
    value: 'free',
    label: 'Free',
    description: 'Perfect for getting started',
    features: ['3 brands', '10 episodes/month', '5 GB storage'],
    color: 'gray',
  },
  {
    value: 'starter',
    label: 'Starter',
    description: 'For growing creators',
    features: ['10 brands', '50 episodes/month', '20 GB storage'],
    color: 'green',
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'For production studios',
    features: ['Unlimited brands', 'Unlimited episodes', '100 GB storage'],
    color: 'blue',
    recommended: true,
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    description: 'For large organizations',
    features: ['Everything in Pro', 'SSO', 'Custom domain', 'API access'],
    color: 'orange',
  },
];

export function CreateWorkspaceModal({ onClose, onCreate }: CreateWorkspaceModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('claymation');
  const [billingTier, setBillingTier] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generates a URL-friendly slug from a workspace name
   * Includes timestamp and random suffix to ensure uniqueness
   *
   * @param name - The workspace name to convert to a slug
   * @returns A unique, URL-safe slug string
   *
   * @example
   * generateSlug("My Animation Studio") => "my-animation-studio-1234abc"
   */
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const [slug, setSlug] = useState('');

  /**
   * Effect to automatically generate slug when workspace name changes
   * Creates a unique slug by combining sanitized name with timestamp and random suffix
   */
  useEffect(() => {
    if (workspaceName) {
      const baseSlug = generateSlug(workspaceName);
      const timestamp = Date.now().toString().slice(-4);
      const randomSuffix = Math.random().toString(36).substring(2, 5);
      setSlug(baseSlug ? `${baseSlug}-${timestamp}${randomSuffix}` : `workspace-${timestamp}${randomSuffix}`);
    } else {
      setSlug('');
    }
  }, [workspaceName]);

  const handleCreate = async () => {
    if (!user || !workspaceName.trim()) {
      setError('Please enter a workspace name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('create_organization_with_membership', {
        org_name: workspaceName.trim(),
        org_slug: slug,
        org_billing_tier: billingTier,
        user_uuid: user.id,
        org_workspace_type: workspaceType,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data) {
        throw new Error('Failed to create workspace: No data returned');
      }

      onCreate(data.id);
    } catch (err) {
      console.error('Error creating workspace:', err);
      setError(err instanceof Error ? err.message : 'Failed to create workspace. Please try again.');
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const isValidStep1 = workspaceName.trim().length > 0 && workspaceName.trim().length <= 100;
  const selectedTypeConfig = WORKSPACE_TYPES.find(t => t.value === workspaceType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {selectedTypeConfig ? (
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedTypeConfig.bgGradient} flex items-center justify-center`}>
                <selectedTypeConfig.icon className="w-6 h-6 text-white" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Workspace</h2>
              <p className="text-sm text-gray-600">
                Step {step} of 2: {step === 1 ? 'Choose workspace type' : 'Configure details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Error</h4>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose Workspace Type
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  This determines which features and prompts are available. Each workspace type is completely siloed.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {WORKSPACE_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = workspaceType === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setWorkspaceType(type.value)}
                        disabled={loading}
                        className={`relative text-left p-5 border-2 rounded-xl transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 shadow-lg ring-2 ring-amber-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        style={isSelected ? {
                          borderColor: type.value === 'commercial' ? '#f59e0b'
                            : type.value === 'photoreal' ? '#3b82f6'
                            : type.value === 'documentary' ? '#10b981'
                            : type.value === 'claymation' ? '#f97316'
                            : '#64748b',
                          backgroundColor: type.value === 'commercial' ? '#fffbeb'
                            : type.value === 'photoreal' ? '#eff6ff'
                            : type.value === 'documentary' ? '#f0fdf4'
                            : type.value === 'claymation' ? '#fff7ed'
                            : '#f8fafc',
                          boxShadow: '0 0 0 3px ' + (
                            type.value === 'commercial' ? '#fde68a'
                            : type.value === 'photoreal' ? '#bfdbfe'
                            : type.value === 'documentary' ? '#bbf7d0'
                            : type.value === 'claymation' ? '#fed7aa'
                            : '#e2e8f0'
                          ),
                        } : {}}
                      >
                        {type.badge && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                            {type.badge}
                          </span>
                        )}
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.bgGradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900">{type.label}</h3>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {type.features.map((feature, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    isSelected ? 'bg-white text-gray-700 border border-gray-200' : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <Check className="w-3 h-3 text-green-500" />
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-base"
                  placeholder={
                    workspaceType === 'commercial' ? 'Acme Brand — Q1 Campaign'
                    : workspaceType === 'claymation' ? 'My Animation Studio'
                    : workspaceType === 'photoreal' ? 'History Documentary'
                    : workspaceType === 'documentary' ? 'My Documentary Series'
                    : 'My Workspace'
                  }
                  maxLength={100}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    This will be displayed in the workspace switcher
                  </p>
                  <p className="text-xs text-gray-500">{workspaceName.length}/100</p>
                </div>
              </div>

              {slug && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-1">Workspace URL</h4>
                      <p className="text-sm text-blue-800 font-mono break-all">{slug}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTypeConfig && (
                <div className={`bg-gradient-to-r from-${selectedTypeConfig.color}-50 to-white border border-${selectedTypeConfig.color}-200 rounded-lg p-4`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedTypeConfig.bgGradient} flex items-center justify-center flex-shrink-0`}>
                      <selectedTypeConfig.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{selectedTypeConfig.label} Workspace</h4>
                      <p className="text-sm text-gray-600">{selectedTypeConfig.description}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Billing Tier
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BILLING_TIERS.map((tier) => (
                    <button
                      key={tier.value}
                      onClick={() => setBillingTier(tier.value)}
                      disabled={loading}
                      className={`relative text-left p-4 border-2 rounded-lg transition-all ${
                        billingTier === tier.value
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {tier.recommended && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">
                          Recommended
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            billingTier === tier.value
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {billingTier === tier.value && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">{tier.label}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{tier.description}</p>
                      <ul className="space-y-1">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {step === 2 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
                disabled={loading}
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            {step === 1 ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!isValidStep1 || loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    Create Workspace
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
