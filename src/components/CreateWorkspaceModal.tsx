import { useState, useEffect } from 'react';
import { X, Building2, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreate: (organizationId: string) => void;
}

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
  const [workspaceName, setWorkspaceName] = useState('');
  const [billingTier, setBillingTier] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const isValid = workspaceName.trim().length > 0 && workspaceName.trim().length <= 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Workspace</h2>
              <p className="text-sm text-gray-600">Set up a new workspace for your projects</p>
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
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">Error</h4>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

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
                placeholder="My Animation Studio"
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
                    <p className="text-xs text-blue-700 mt-1">
                      This unique identifier will be used in URLs and API calls
                    </p>
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
              <p className="text-xs text-gray-500 mt-3">
                You can change the billing tier later in workspace settings
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!isValid || loading}
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
        </div>
      </div>
    </div>
  );
}
