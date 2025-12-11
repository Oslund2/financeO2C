import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Plus } from 'lucide-react';

export function DevLoginBypass() {
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');

  const createTestOrganization = async () => {
    if (!orgName.trim()) return;

    setCreatingOrg(true);
    try {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: orgName,
            slug: slug,
            billing_tier: 'professional',
          },
        ])
        .select()
        .single();

      if (orgError) throw orgError;

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'dev-user-00000000-0000-0000-0000-000000000000';

      if (org) {
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert([
            {
              organization_id: org.id,
              user_id: userId,
              role: 'owner',
            },
          ]);

        if (memberError) throw memberError;
      }

      setOrgName('');
      window.location.reload();
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization. Check console for details.');
    } finally {
      setCreatingOrg(false);
    }
  };

  return (
    <div className="bg-orange-50 border-l-4 border-orange-500 p-6 mb-6">
      <div className="flex items-start gap-3">
        <Building2 className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">Development Mode</h3>
          <p className="text-sm text-orange-800 mb-4">
            To test the organization switcher, you need to create test organizations. In production,
            this would be done through a proper onboarding flow.
          </p>

          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Create Test Organization
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Acme Animation Studio"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                disabled={creatingOrg}
              />
              <button
                onClick={createTestOrganization}
                disabled={creatingOrg || !orgName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-scripps-blue text-white rounded-lg hover:bg-scripps-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This will create an organization and add you as the owner. Create multiple organizations
              to test the switcher functionality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
