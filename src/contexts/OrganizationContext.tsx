import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type WorkspaceType = 'claymation' | 'photoreal' | 'documentary' | 'general' | 'commercial';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  billing_tier: string;
  subdomain: string | null;
  workspace_type: WorkspaceType;
}

interface OrganizationMembership {
  organization: Organization;
  role: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: OrganizationMembership[];
  loading: boolean;
  timedOut: boolean;
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
  const [timedOut, setTimedOut] = useState(false);

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

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      let data: any, error: any;
      try {
        ({ data, error } = await supabase
          .from('organization_members')
          .select(`
            role,
            organization:organizations(
              id,
              name,
              slug,
              logo_url,
              billing_tier,
              subdomain,
              workspace_type
            )
          `)
          .eq('user_id', user.id)
          .abortSignal(controller.signal));
      } finally {
        clearTimeout(timeout);
      }

      if (controller.signal.aborted) {
        setTimedOut(true);
        throw new Error('Connection to Supabase timed out after 8 seconds. The database may be unreachable.');
      }

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

        // Try using the helper function first (bypasses RLS)
        const { data: newOrg, error: orgError } = await supabase
          .rpc('create_organization_with_membership', {
            org_name: 'My Studio',
            org_slug: slug,
            org_billing_tier: 'professional',
            user_uuid: user.id
          });

        if (orgError) {
          console.error('Failed to create organization via RPC:', orgError);

          // Fallback: Try direct insert (should work with updated policy)
          try {
            const { data: directOrg, error: directError } = await supabase
              .from('organizations')
              .insert([
                {
                  name: 'My Studio',
                  slug: slug,
                  billing_tier: 'professional',
                  created_by: user.id,
                },
              ])
              .select()
              .single();

            if (directError) {
              throw new Error(`Direct insert failed: ${directError.message}`);
            }

            // Create membership separately
            const { error: memberError } = await supabase
              .from('organization_members')
              .insert([
                {
                  organization_id: directOrg.id,
                  user_id: user.id,
                  role: 'owner',
                },
              ]);

            if (memberError) {
              console.error('Failed to create membership:', memberError);
              throw new Error(`Failed to create membership: ${memberError.message}`);
            }

            memberships = [{
              organization: directOrg,
              role: 'owner'
            }];
          } catch (fallbackError) {
            throw new Error(`Failed to create organization: ${orgError.message}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
          }
        } else {
          if (!newOrg) {
            throw new Error('Failed to create organization: No data returned');
          }

          memberships = [{
            organization: newOrg as Organization,
            role: 'owner'
          }];
        }
      }

      // Sort memberships: "Spelling Bee" organizations first, then alphabetically
      memberships.sort((a, b) => {
        const aName = a.organization.name.toLowerCase();
        const bName = b.organization.name.toLowerCase();

        const aIsSpellingBee = aName.includes('spelling bee') || aName.includes('claymation');
        const bIsSpellingBee = bName.includes('spelling bee') || bName.includes('claymation');

        if (aIsSpellingBee && !bIsSpellingBee) return -1;
        if (!aIsSpellingBee && bIsSpellingBee) return 1;

        return aName.localeCompare(bName);
      });

      setOrganizations(memberships);
      setError(null);

      if (memberships.length > 0) {
        const savedOrgId = localStorage.getItem(STORAGE_KEY);
        const savedOrg = memberships.find(m => m.organization.id === savedOrgId);

        if (savedOrg) {
          setCurrentOrganization(savedOrg.organization);
        } else {
          // Find Spelling Bee workspace with flexible matching
          const defaultOrg = memberships.find(m => {
            const name = m.organization.name.toLowerCase();
            return name.includes('spelling bee') || name.includes('claymation');
          });

          const selectedOrg = defaultOrg || memberships[0];
          setCurrentOrganization(selectedOrg.organization);
          localStorage.setItem(STORAGE_KEY, selectedOrg.organization.id);
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Add more helpful context for common errors
        if (errorMessage.includes('row-level security')) {
          errorMessage += '\n\nThis is a database permission issue. The system is trying to fix this automatically.';
        } else if (errorMessage.includes('Failed to create organization')) {
          errorMessage += '\n\nTip: Try refreshing the page or clearing your browser cache.';
        } else if (errorMessage.includes('network')) {
          errorMessage += '\n\nPlease check your internet connection and try again.';
        }
      }

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
    setTimedOut(false);
    await fetchOrganizations();
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        loading,
        timedOut,
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
