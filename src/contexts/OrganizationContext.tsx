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
  error: string | null;
  switchOrganization: (organizationId: string) => void;
  refreshOrganizations: () => Promise<void>;
  retryInitialization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'selected_organization_id';

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);

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

      if (error) {
        throw new Error(`Failed to fetch organizations: ${error.message}`);
      }

      let memberships = (data || [])
        .filter(item => item.organization)
        .map(item => ({
          organization: item.organization as unknown as Organization,
          role: item.role
        }));

      if (memberships.length === 0) {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const slug = `studio-${timestamp}-${randomSuffix}`;

        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert([
            {
              name: 'My Animation Studio',
              slug: slug,
              billing_tier: 'professional',
              created_by: user.id,
            },
          ])
          .select()
          .single();

        if (orgError) {
          throw new Error(`Failed to create organization: ${orgError.message}`);
        }

        const { error: memberError } = await supabase
          .from('organization_members')
          .insert([
            {
              organization_id: newOrg.id,
              user_id: user.id,
              role: 'owner',
            },
          ]);

        if (memberError) {
          throw new Error(`Failed to create membership: ${memberError.message}`);
        }

        memberships = [{
          organization: newOrg,
          role: 'owner'
        }];
      }

      setOrganizations(memberships);
      setError(null);

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
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

  useEffect(() => {
    if (error && retryCount < 3 && !loading) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      const timer = setTimeout(() => {
        console.log(`Auto-retry attempt ${retryCount + 1} after ${retryDelay}ms`);
        retryInitialization();
      }, retryDelay);

      return () => clearTimeout(timer);
    }
  }, [error, retryCount, loading]);

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

  const retryInitialization = async () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
    setError(null);
    await fetchOrganizations();
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        loading,
        error,
        switchOrganization,
        refreshOrganizations,
        retryInitialization,
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
