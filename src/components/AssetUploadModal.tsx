import { useState } from 'react';
import { X, Upload, FileVideo, FileAudio, Image as ImageIcon, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AssetInsert = Database['public']['Tables']['assets']['Insert'];

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  seriesId: string | null;
}

export function AssetUploadModal({ isOpen, onClose, onUploadComplete, seriesId }: AssetUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    asset_type: 'prop',
    tags: '',
  });

  const assetTypes = [
    { id: 'character_ref', label: 'Character Reference' },
    { id: 'background', label: 'Background' },
    { id: 'prop', label: 'Prop' },
    { id: 'word_manifestation', label: 'Word Art' },
    { id: 'scene_image', label: 'Scene Image' },
    { id: 'video_clip', label: 'Video Clip' },
    { id: 'audio', label: 'Audio' },
    { id: 'document', label: 'Document' },
  ];

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('video/')) return <FileVideo className="w-12 h-12 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="w-12 h-12 text-green-500" />;
    if (fileType.startsWith('text/') ||
        fileType.includes('document') ||
        fileType.includes('msword') ||
        fileType.includes('ms-powerpoint') ||
        fileType.includes('presentationml') ||
        fileType.includes('wordprocessingml')) {
      return <FileText className="w-12 h-12 text-orange-500" />;
    }
    return <ImageIcon className="w-12 h-12 text-blue-500" />;
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);

    if (!formData.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setFormData(prev => ({ ...prev, name: nameWithoutExt }));
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      setFilePreview(videoUrl);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const timestamp = Date.now();
      const sanitizedName = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const extension = selectedFile.name.split('.').pop();
      const filename = `${sanitizedName}_${timestamp}.${extension}`;
      const filePath = `${formData.asset_type}/${filename}`;

      setUploadProgress(30);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('production-assets')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert(`Failed to upload file: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      setUploadProgress(70);

      const { data: urlData } = supabase.storage
        .from('production-assets')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      const metadata = {
        filename: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        mimeType: selectedFile.type,
        uploaded_at: new Date().toISOString(),
      };

      const assetData: AssetInsert = {
        series_id: seriesId,
        asset_type: formData.asset_type,
        name: formData.name,
        description: formData.description || null,
        file_url: fileUrl,
        thumbnail_url: selectedFile.type.startsWith('image/') ? fileUrl : null,
        metadata: metadata,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        ai_generated: false,
        usage_count: 0,
      };

      setUploadProgress(90);

      const { error: insertError } = await supabase
        .from('assets')
        .insert([assetData]);

      if (insertError) {
        console.error('Database error:', insertError);
        alert(`Failed to save asset: ${insertError.message}`);
        setUploading(false);
        return;
      }

      setUploadProgress(100);

      onUploadComplete();
      handleClose();
    } catch (error) {
      console.error('Error uploading asset:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFormData({
      name: '',
      description: '',
      asset_type: 'prop',
      tags: '',
    });
    setUploadProgress(0);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Upload Asset</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div
            className={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors ${
              isDragging
                ? 'border-scripps-blue bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <div>
                <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Drop your file here or click to browse
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 px-2">
                  Supports images, videos, audio, and documents
                </p>
                <input
                  type="file"
                  id="file-input"
                  accept="image/*,video/*,audio/*,.txt,.doc,.docx,.ppt,.pptx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <label
                  htmlFor="file-input"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  Choose File
                </label>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  {filePreview && selectedFile.type.startsWith('image/') ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-h-32 sm:max-h-48 mx-auto rounded-lg"
                    />
                  ) : filePreview && selectedFile.type.startsWith('video/') ? (
                    <video
                      src={filePreview}
                      controls
                      className="max-h-32 sm:max-h-48 mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="flex justify-center">
                      {getFileIcon(selectedFile.type)}
                    </div>
                  )}
                </div>
                <p className="text-base sm:text-lg font-medium text-gray-900 mb-1 truncate px-2">
                  {selectedFile.name}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  className="text-sm text-scripps-blue hover:text-scripps-navy font-medium min-h-[44px] px-4"
                >
                  Change File
                </button>
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-scripps-blue to-scripps-light-blue h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-600 text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Asset Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-sm md:text-base min-h-[44px]"
                placeholder="e.g., Library Background"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Asset Type *
              </label>
              <select
                value={formData.asset_type}
                onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-sm md:text-base min-h-[44px]"
              >
                {assetTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-sm md:text-base"
              placeholder="Describe this asset..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-sm md:text-base min-h-[44px]"
              placeholder="Comma-separated tags"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 min-h-[44px]"
            >
              {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
