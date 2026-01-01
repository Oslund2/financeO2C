import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Settings, Plus, Palette, Film, Video, Layers } from 'lucide-react';
import { useOrganization, WorkspaceType } from '../contexts/OrganizationContext';
import { OrganizationSettingsModal } from './OrganizationSettingsModal';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

const WORKSPACE_TYPE_CONFIG: Record<WorkspaceType, { label: string; icon: typeof Palette; bgColor: string; textColor: string }> = {
  claymation: { label: 'Claymation', icon: Palette, bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  photoreal: { label: 'Photoreal', icon: Film, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  documentary: { label: 'Documentary', icon: Video, bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  general: { label: 'General', icon: Layers, bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
};

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization, loading, refreshOrganizations } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMembership = organizations.find(m => m.organization.id === currentOrganization?.id);
  const userRole = currentMembership?.role || 'viewer';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || !currentOrganization) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
        <Building2 className="w-4 h-4" />
        <span>Loading...</span>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'member':
        return 'bg-green-100 text-green-700';
      case 'viewer':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return { label: 'Enterprise', color: 'bg-orange-100 text-orange-700' };
      case 'professional':
        return { label: 'Pro', color: 'bg-blue-100 text-blue-700' };
      case 'starter':
        return { label: 'Starter', color: 'bg-green-100 text-green-700' };
      default:
        return { label: 'Free', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const handleSwitch = (orgId: string) => {
    switchOrganization(orgId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors w-full text-left group"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {currentOrganization.logo_url ? (
            <img
              src={currentOrganization.logo_url}
              alt={currentOrganization.name}
              className="w-6 h-6 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded bg-gradient-to-br from-scripps-blue to-scripps-light-blue flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm truncate">
              {currentOrganization.name}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
          {organizations.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No organizations found
            </div>
          ) : (
            organizations.map(({ organization, role }) => {
              const isSelected = currentOrganization.id === organization.id;
              const tier = getTierBadge(organization.billing_tier);
              const wsType = organization.workspace_type ? WORKSPACE_TYPE_CONFIG[organization.workspace_type] : null;
              const WsIcon = wsType?.icon || Layers;

              return (
                <button
                  key={organization.id}
                  onClick={() => handleSwitch(organization.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-scripps-blue to-scripps-light-blue flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {organization.name}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-scripps-blue flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {wsType && (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${wsType.bgColor} ${wsType.textColor}`}>
                          <WsIcon className="w-3 h-3" />
                          {wsType.label}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(
                          role
                        )}`}
                      >
                        {role}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tier.color}`}>
                        {tier.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}

          <div className="border-t border-gray-200 mt-2">
            <button
              onClick={() => {
                setShowSettings(true);
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900 text-sm">Workspace Settings</div>
                <div className="text-xs text-gray-600">Manage team, billing, and settings</div>
              </div>
            </button>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left border-t border-gray-100"
            >
              <Plus className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-600 text-sm">Create New Workspace</div>
                <div className="text-xs text-gray-600">Start a new organization</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {showSettings && currentOrganization && (
        <OrganizationSettingsModal
          organization={currentOrganization}
          userRole={userRole}
          onClose={() => setShowSettings(false)}
          onUpdate={() => {
            refreshOrganizations();
          }}
          onDeleted={() => {
            refreshOrganizations().then(() => {
              setShowSettings(false);
              if (organizations.length > 1) {
                const nextOrg = organizations.find(m => m.organization.id !== currentOrganization.id);
                if (nextOrg) {
                  switchOrganization(nextOrg.organization.id);
                }
              }
            });
          }}
        />
      )}

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(newOrgId) => {
            refreshOrganizations().then(() => {
              switchOrganization(newOrgId);
              setShowCreateModal(false);
            });
          }}
        />
      )}
    </div>
  );
}
