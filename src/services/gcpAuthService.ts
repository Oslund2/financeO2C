/**
 * GCP Authentication Service
 *
 * Handles JSON service account key parsing, validation, upload to Supabase
 * edge function secrets, and token exchange for Vertex AI API calls.
 *
 * Service account keys contain private keys that MUST NOT be stored in
 * browser-accessible locations. They are uploaded to Supabase Vault
 * and used server-side by edge functions.
 */

import { supabase } from '../lib/supabase';

export interface ServiceAccountKey {
  type: 'service_account';
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

export interface ServiceAccountStatus {
  configured: boolean;
  clientEmail?: string;
  projectId?: string;
  lastValidated?: string;
  error?: string;
}

export interface AuthMethod {
  type: 'api_key' | 'service_account';
  configured: boolean;
  details?: string;
}

const SA_STATUS_KEY = 'gcp_service_account_status';

/**
 * Parse and validate a JSON service account key file
 */
export function parseServiceAccountKey(jsonString: string): ServiceAccountKey {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON: could not parse service account key file');
  }

  if (parsed.type !== 'service_account') {
    throw new Error(`Invalid key type: expected "service_account", got "${parsed.type}"`);
  }

  const required = [
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri',
  ] as const;

  for (const field of required) {
    if (!parsed[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!parsed.private_key.includes('BEGIN') || !parsed.private_key.includes('PRIVATE KEY')) {
    throw new Error('Invalid private_key: does not contain PEM-formatted key');
  }

  if (!parsed.client_email.endsWith('.iam.gserviceaccount.com')) {
    throw new Error('Invalid client_email: must end with .iam.gserviceaccount.com');
  }

  return parsed as ServiceAccountKey;
}

/**
 * Upload service account credentials to Supabase edge function proxy.
 * The private key is stored server-side only — never in localStorage or client state.
 */
export async function uploadServiceAccountKey(
  key: ServiceAccountKey,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('store-gcp-credentials', {
      body: {
        organization_id: organizationId,
        client_email: key.client_email,
        private_key: key.private_key,
        project_id: key.project_id,
        private_key_id: key.private_key_id,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to store credentials');
    }

    // Store non-sensitive metadata locally for UI display
    const status: ServiceAccountStatus = {
      configured: true,
      clientEmail: key.client_email,
      projectId: key.project_id,
      lastValidated: new Date().toISOString(),
    };
    localStorage.setItem(SA_STATUS_KEY, JSON.stringify(status));

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error uploading key';
    return { success: false, error: message };
  }
}

/**
 * Check if a service account is configured for the current organization
 */
export function checkServiceAccountStatus(): ServiceAccountStatus {
  try {
    const stored = localStorage.getItem(SA_STATUS_KEY);
    if (!stored) {
      return { configured: false };
    }
    return JSON.parse(stored);
  } catch {
    return { configured: false };
  }
}

/**
 * Remove stored service account status (does not revoke server-side credentials)
 */
export async function removeServiceAccountKey(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke('remove-gcp-credentials', {
      body: { organization_id: organizationId },
    });

    if (error) {
      throw new Error(error.message || 'Failed to remove credentials');
    }

    localStorage.removeItem(SA_STATUS_KEY);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Get available auth methods and their configuration status
 */
export function getAvailableAuthMethods(): AuthMethod[] {
  const methods: AuthMethod[] = [];

  // Check API key auth
  const apiKey = import.meta.env.VITE_VERTEX_AI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  methods.push({
    type: 'api_key',
    configured: !!apiKey,
    details: apiKey ? 'API key configured via environment variable' : 'Not configured',
  });

  // Check service account auth
  const saStatus = checkServiceAccountStatus();
  methods.push({
    type: 'service_account',
    configured: saStatus.configured,
    details: saStatus.configured
      ? `Service account: ${saStatus.clientEmail}`
      : 'Not configured — upload a JSON key file',
  });

  return methods;
}

/**
 * Determine which auth method should be used for Vertex AI requests.
 * Service account takes priority when available since it's more secure
 * and supports features that API keys don't (like signed URLs).
 */
export function getPreferredAuthMethod(): 'api_key' | 'service_account' | null {
  const saStatus = checkServiceAccountStatus();
  if (saStatus.configured) {
    return 'service_account';
  }

  const apiKey = import.meta.env.VITE_VERTEX_AI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (apiKey) {
    return 'api_key';
  }

  return null;
}

/**
 * Validate that a service account key file has the correct permissions
 * by making a test request through the edge function
 */
export async function validateServiceAccountPermissions(
  organizationId: string
): Promise<{ valid: boolean; permissions: string[]; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-gcp-credentials', {
      body: { organization_id: organizationId },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      valid: data?.valid ?? false,
      permissions: data?.permissions ?? [],
      error: data?.error,
    };
  } catch (err) {
    return {
      valid: false,
      permissions: [],
      error: err instanceof Error ? err.message : 'Validation failed',
    };
  }
}
