import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
                    <div className="flex items-center gap-2 mt-1">
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
        </div>
      )}
    </div>
  );
}
