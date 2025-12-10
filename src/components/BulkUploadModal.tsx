import { useState, useRef } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Image as ImageIcon, Loader } from 'lucide-react';
import { parseUploadFileNames, uploadManualImage } from '../services/nanoBananaService';
import type { BulkUploadFile } from '../services/nanoBananaService';
import type { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';

type StoryboardShot = Database['public']['Tables']['storyboard_shots']['Row'];

interface BulkUploadModalProps {
  storyboardId: string;
  shots: StoryboardShot[];
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadItem extends BulkUploadFile {
  id: string;
  assignedShotId?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  preview?: string;
}

export function BulkUploadModal({ storyboardId, shots, onClose, onUploadComplete }: BulkUploadModalProps) {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const parsedFiles = parseUploadFileNames(files);

    const items: UploadItem[] = parsedFiles.map((pf, index) => {
      const preview = URL.createObjectURL(pf.file);

      let assignedShotId: string | undefined;

      if (pf.matched) {
        const matchedShot = shots.find(s => s.shot_number === pf.shotNumber);
        if (matchedShot) {
          assignedShotId = matchedShot.id;
        }
      }

      return {
        ...pf,
        id: `${Date.now()}-${index}`,
        assignedShotId,
        status: 'pending',
        preview
      };
    });

    setUploadItems(prev => [...prev, ...items]);
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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleAssignShot = (itemId: string, shotId: string) => {
    setUploadItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, assignedShotId: shotId } : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setUploadItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (item?.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const getActNumberForShot = (shotId: string): number => {
    return 1;
  };

  const handleUploadAll = async () => {
    const itemsToUpload = uploadItems.filter(item => item.assignedShotId && item.status === 'pending');

    if (itemsToUpload.length === 0) {
      alert('No files assigned to shots. Please assign files before uploading.');
      return;
    }

    setUploading(true);

    for (const item of itemsToUpload) {
      setUploadItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i)
      );

      try {
        const shot = shots.find(s => s.id === item.assignedShotId);
        if (!shot) throw new Error('Shot not found');

        const actNumber = getActNumberForShot(shot.id);
        const { imageUrl, thumbnailUrl } = await uploadManualImage(
          item.file,
          storyboardId,
          actNumber,
          shot.shot_number
        );

        await supabase
          .from('storyboard_shots')
          .update({
            image_url: imageUrl,
            thumbnail_url: thumbnailUrl,
            generation_status: 'completed',
            generation_metadata: {
              source: 'bulk_upload',
              uploadedAt: new Date().toISOString()
            }
          })
          .eq('id', shot.id);

        setUploadItems(prev =>
          prev.map(i => i.id === item.id ? { ...i, status: 'completed' } : i)
        );
      } catch (error) {
        console.error('Upload error:', error);
        setUploadItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? { ...i, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : i
          )
        );
      }
    }

    setUploading(false);

    const allCompleted = uploadItems.every(item => item.status === 'completed' || item.status === 'error');
    if (allCompleted) {
      setTimeout(() => {
        onUploadComplete();
        onClose();
      }, 1000);
    }
  };

  const availableShots = shots.filter(shot => !shot.image_url);
  const unmatchedItems = uploadItems.filter(item => !item.assignedShotId);
  const matchedItems = uploadItems.filter(item => item.assignedShotId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Bulk Image Upload</h2>
            <p className="text-blue-100 text-sm">Upload multiple images at once to your storyboard shots</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {uploadItems.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Drag and drop your images here
              </h3>
              <p className="text-gray-600 mb-4">
                or click to browse files
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Select Files
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Tip: Name your files like "shot-1.png" or "act-1-shot-2.png" for automatic matching
              </p>
            </div>
          ) : (
            <>
              {matchedItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Matched Files ({matchedItems.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {matchedItems.map(item => {
                      const shot = shots.find(s => s.id === item.assignedShotId);
                      return (
                        <div
                          key={item.id}
                          className={`bg-white border-2 rounded-lg p-3 flex gap-3 ${
                            item.status === 'completed'
                              ? 'border-green-500 bg-green-50'
                              : item.status === 'error'
                              ? 'border-red-500 bg-red-50'
                              : item.status === 'uploading'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {item.preview && (
                              <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate text-sm mb-1">
                              {item.file.name}
                            </div>
                            <div className="text-xs text-gray-600 mb-1">
                              Shot {shot?.shot_number} - {shot?.shot_type}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(item.file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between">
                            {item.status === 'completed' && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                            {item.status === 'error' && (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                            {item.status === 'uploading' && (
                              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                            )}
                            {item.status === 'pending' && (
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {unmatchedItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    Unmatched Files ({unmatchedItems.length})
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Please assign these files to shots manually:
                  </p>
                  <div className="space-y-3">
                    {unmatchedItems.map(item => (
                      <div
                        key={item.id}
                        className="bg-white border-2 border-orange-200 rounded-lg p-3 flex gap-3"
                      >
                        <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          {item.preview && (
                            <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate text-sm mb-2">
                            {item.file.name}
                          </div>
                          <select
                            value={item.assignedShotId || ''}
                            onChange={(e) => handleAssignShot(item.id, e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select a shot...</option>
                            {availableShots.map(shot => (
                              <option key={shot.id} value={shot.id}>
                                Shot {shot.shot_number} - {shot.shot_type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors self-start"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400'
                }`}
              >
                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">Add more images</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Browse Files
                </button>
              </div>
            </>
          )}
        </div>

        {uploadItems.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {matchedItems.length + unmatchedItems.filter(i => i.assignedShotId).length} of {uploadItems.length} files ready to upload
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAll}
                disabled={uploading || uploadItems.every(item => !item.assignedShotId || item.status !== 'pending')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload All'}
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
