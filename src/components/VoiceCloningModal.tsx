import { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { getChatterboxService } from '../services/chatterboxService';

interface VoiceCloningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (voiceId: string) => void;
}

interface AudioFile {
  file: File;
  id: string;
}

export function VoiceCloningModal({ isOpen, onClose, onSuccess }: VoiceCloningModalProps) {
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (audioFiles.length + files.length > 10) {
      setError('Maximum 10 audio files allowed');
      return;
    }

    const newFiles: AudioFile[] = files.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
    }));

    setAudioFiles([...audioFiles, ...newFiles]);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    setAudioFiles(audioFiles.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!voiceName.trim()) {
      setError('Voice name is required');
      return;
    }

    if (audioFiles.length === 0) {
      setError('At least one audio file is required');
      return;
    }

    if (audioFiles.length > 10) {
      setError('Maximum 10 audio files allowed');
      return;
    }

    setIsUploading(true);

    try {
      const service = getChatterboxService();
      const files = audioFiles.map((af) => af.file);
      const result = await service.cloneVoice(voiceName, files, description);

      setSuccess(true);

      if (onSuccess && result.voice_id) {
        setTimeout(() => {
          onSuccess(result.voice_id!);
          handleClose();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone voice');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setVoiceName('');
    setDescription('');
    setAudioFiles([]);
    setError(null);
    setSuccess(false);
    setIsUploading(false);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Clone Voice with Chatterbox</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            disabled={isUploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Voice Cloning Successful!
              </h3>
              <p className="text-sm text-gray-600 text-center">
                Your voice has been successfully cloned and is now available for use.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g., Emma's Voice"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
                  disabled={isUploading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this voice..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent resize-none"
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio Samples <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Upload 1-10 audio samples (max 50MB each). Better quality and more samples lead to better voice clones.
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-scripps-blue hover:bg-blue-50 transition-colors"
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Click to upload audio files
                  </p>
                  <p className="text-xs text-gray-500">
                    MP3, WAV, or other audio formats
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />

                {audioFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Selected Files ({audioFiles.length}/10)
                    </p>
                    {audioFiles.map((audioFile) => (
                      <div
                        key={audioFile.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {audioFile.file.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatFileSize(audioFile.file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(audioFile.id)}
                          className="ml-2 p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={isUploading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isUploading || audioFiles.length === 0 || !voiceName.trim()}
                  className="flex-1 px-4 py-2 bg-scripps-blue text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cloning Voice...
                    </>
                  ) : (
                    'Clone Voice'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
