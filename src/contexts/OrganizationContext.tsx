import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  billing_tier: string;
  subdomain: string | null;
}

interface OrganizationMembership {
  organization: Organization;
  role: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: OrganizationMembership[];
  loading: boolean;
  switchOrganization: (organizationId: string) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'selected_organization_id';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization:organizations(
            id,
            name,
            slug,
            logo_url,
            billing_tier,
            subdomain
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      let memberships = (data || [])
        .filter(item => item.organization)
        .map(item => ({
          organization: item.organization as unknown as Organization,
          role: item.role
        }));

      if (memberships.length === 0) {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert([
            {
              name: 'Animation Studio',
              slug: 'animation-studio',
              billing_tier: 'professional',
            },
          ])
          .select()
          .single();

        if (orgError) throw orgError;

        const { error: memberError } = await supabase
          .from('organization_members')
          .insert([
            {
              organization_id: newOrg.id,
              user_id: user.id,
              role: 'owner',
            },
          ]);

        if (memberError) throw memberError;

        memberships = [{
          organization: newOrg,
          role: 'owner'
        }];
      }

      setOrganizations(memberships);

      if (memberships.length > 0) {
        const savedOrgId = localStorage.getItem(STORAGE_KEY);
        const savedOrg = memberships.find(m => m.organization.id === savedOrgId);

        if (savedOrg) {
          setCurrentOrganization(savedOrg.organization);
        } else {
          setCurrentOrganization(memberships[0].organization);
          localStorage.setItem(STORAGE_KEY, memberships[0].organization.id);
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
      setCurrentOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchOrganizations();
    }
  }, [user, authLoading]);

  const switchOrganization = (organizationId: string) => {
    const membership = organizations.find(m => m.organization.id === organizationId);
    if (membership) {
      setCurrentOrganization(membership.organization);
      localStorage.setItem(STORAGE_KEY, organizationId);
    }
  };

  const refreshOrganizations = async () => {
    setLoading(true);
    await fetchOrganizations();
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        loading,
        switchOrganization,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
