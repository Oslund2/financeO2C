import { useState, useRef } from 'react';
import { X, Upload, FileImage, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadManualReferenceImage } from '../services/nanoBananaService';

interface ManualReferenceUploadModalProps {
  shotId: string;
  shotNumber: number;
  currentImageUrl?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualReferenceUploadModal({
  shotId,
  shotNumber,
  currentImageUrl,
  onClose,
  onSuccess
}: ManualReferenceUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await uploadManualReferenceImage(selectedFile, shotId, notes);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload reference image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload Manual Reference Image</h2>
            <p className="text-sm text-gray-600 mt-1">Shot #{shotNumber} - For Veo 3 Video Generation</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Why upload a manual reference?</p>
                <p>Use this when AI-generated images don't perfectly match your character references.
                Manual references ensure character consistency for Veo 3 video generation.</p>
              </div>
            </div>
          </div>

          {currentImageUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Generated Image
              </label>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={currentImageUrl}
                  alt="Current shot"
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Reference Image
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 cursor-pointer transition-colors"
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded"
                  />
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    {selectedFile?.name}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewUrl(null);
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Choose different image
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileImage className="w-12 h-12 text-gray-400 mx-auto" />
                  <div className="text-sm text-gray-600">
                    <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                  </div>
                  <div className="text-xs text-gray-500">PNG, JPG, or WEBP (max 10MB)</div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why was manual upload needed? (e.g., 'Character hair color didn't match reference' or 'Better expression needed')"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <p className="mt-1 text-xs text-gray-500">
              These notes help track issues and improve future AI generations
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Reference
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
