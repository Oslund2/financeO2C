import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, Shield, Trash2, Key } from 'lucide-react';
import {
  parseServiceAccountKey,
  uploadServiceAccountKey,
  checkServiceAccountStatus,
  removeServiceAccountKey,
  validateServiceAccountPermissions,
  type ServiceAccountStatus,
} from '../services/gcpAuthService';
import { useOrganization } from '../contexts/OrganizationContext';

export function ServiceAccountKeyUpload() {
  const { currentOrganization } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<ServiceAccountStatus>(() => checkServiceAccountStatus());
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!currentOrganization) {
      setError('No organization selected');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const text = await file.text();
      const key = parseServiceAccountKey(text);

      const result = await uploadServiceAccountKey(key, currentOrganization.id);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setStatus(checkServiceAccountStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload key');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      handleFileSelect(file);
    } else {
      setError('Please drop a .json service account key file');
    }
  };

  const handleValidate = async () => {
    if (!currentOrganization) return;
    setValidating(true);
    setError(null);

    try {
      const result = await validateServiceAccountPermissions(currentOrganization.id);
      if (!result.valid) {
        setError(result.error || 'Validation failed — check IAM permissions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation error');
    } finally {
      setValidating(false);
    }
  };

  const handleRemove = async () => {
    if (!currentOrganization) return;
    setUploading(true);
    setError(null);

    try {
      const result = await removeServiceAccountKey(currentOrganization.id);
      if (!result.success) {
        throw new Error(result.error);
      }
      setStatus({ configured: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove key');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Key className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">GCP Service Account Key</h3>
      </div>

      {status.configured ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Service Account Connected</p>
                <p className="text-sm text-green-700 mt-1">{status.clientEmail}</p>
                <p className="text-xs text-green-600 mt-1">
                  Project: {status.projectId}
                </p>
                {status.lastValidated && (
                  <p className="text-xs text-green-500 mt-1">
                    Uploaded: {new Date(status.lastValidated).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleValidate}
                disabled={validating}
                className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Validate'}
              </button>
              <button
                onClick={handleRemove}
                disabled={uploading}
                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Uploading and validating key...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Drop your service account JSON key file here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  browse files
                </button>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleInputChange}
                className="hidden"
              />
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-700">
          <p className="font-medium">Security Note</p>
          <p className="mt-0.5">
            The private key is stored server-side in Supabase Vault — never in your browser.
            Only the service account email and project ID are saved locally for display.
          </p>
        </div>
      </div>
    </div>
  );
}
