import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Tag, FileType, Calendar, Sparkles, FileText } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  asset_type: string;
  tags: string[];
  ai_generated: boolean;
  usage_count: number;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface AssetPreviewModalProps {
  asset: Asset;
  onClose: () => void;
}

export default function AssetPreviewModal({ asset, onClose }: AssetPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState(false);

  const mimeType = asset.metadata?.mimeType || '';
  const fileSize = asset.metadata?.size;
  const isVideo = mimeType.startsWith('video/') || asset.asset_type === 'video_clip';
  const isAudio = mimeType.startsWith('audio/') || asset.asset_type === 'audio_clip';
  const isDocument = mimeType.startsWith('text/') ||
                     mimeType.includes('document') ||
                     mimeType.includes('msword') ||
                     mimeType.includes('ms-powerpoint') ||
                     mimeType.includes('presentationml') ||
                     mimeType.includes('wordprocessingml') ||
                     asset.asset_type === 'document';
  const isTextFile = mimeType === 'text/plain';
  const isImage = mimeType.startsWith('image/') || asset.asset_type === 'character_ref' || asset.asset_type === 'background' || asset.asset_type === 'prop';

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  useEffect(() => {
    if (isTextFile && asset.file_url) {
      setLoadingText(true);
      fetch(asset.file_url)
        .then(response => response.text())
        .then(text => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch(error => {
          console.error('Error loading text file:', error);
          setTextContent('Error loading file content.');
          setLoadingText(false);
        });
    }
  }, [isTextFile, asset.file_url]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFileExtension = () => {
    if (mimeType) {
      const ext = mimeType.split('/')[1]?.toUpperCase();
      return ext || 'FILE';
    }
    return 'FILE';
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{asset.name}</h2>
              {asset.ai_generated && (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-500 text-white rounded text-xs font-medium">
                  <Sparkles className="w-3 h-3" />
                  AI Generated
                </div>
              )}
            </div>
            {asset.description && (
              <p className="text-gray-600 text-sm">{asset.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
            {isImage && (
              <img
                src={asset.file_url}
                alt={asset.name}
                className="max-w-full max-h-[600px] object-contain"
              />
            )}
            {isVideo && (
              <video
                ref={videoRef}
                src={asset.file_url}
                controls
                className="max-w-full max-h-[600px]"
                preload="metadata"
              >
                Your browser does not support video playback.
              </video>
            )}
            {isAudio && (
              <div className="w-full p-8">
                <audio
                  ref={audioRef}
                  src={asset.file_url}
                  controls
                  className="w-full"
                  preload="metadata"
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}
            {isDocument && (
              <div className="w-full p-8">
                {isTextFile ? (
                  loadingText ? (
                    <div className="text-center text-gray-600">Loading file content...</div>
                  ) : (
                    <div className="bg-white p-6 rounded-lg border border-gray-300 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                        {textContent}
                      </pre>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="w-24 h-24 text-orange-500 mb-4" />
                    <p className="text-gray-700 font-medium mb-2">{asset.name}</p>
                    <p className="text-sm text-gray-600 mb-4">
                      Document files can be downloaded for viewing
                    </p>
                    <a
                      href={asset.file_url}
                      download={asset.name}
                      className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Document
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FileType className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Type</div>
                  <div className="text-sm text-gray-600">
                    {asset.asset_type.replace('_', ' ').toUpperCase()} ({getFileExtension()})
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-700">File Size</div>
                  <div className="text-sm text-gray-600">{formatFileSize(fileSize)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Created</div>
                  <div className="text-sm text-gray-600">{formatDate(asset.created_at)}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {asset.tags && asset.tags.length > 0 && (
                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Tags</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {asset.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center text-gray-400 mt-0.5 font-bold text-lg">
                  #
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Usage Count</div>
                  <div className="text-sm text-gray-600">Used {asset.usage_count} times</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <a
            href={asset.file_url}
            download={asset.name}
            className="px-4 py-2 bg-scripps-blue text-white rounded-lg hover:bg-scripps-navy transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
