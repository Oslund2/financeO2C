import { useState, useEffect } from 'react';
import { Image, Search, Filter, Sparkles, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { AssetUploadModal } from './AssetUploadModal';

type Asset = Database['public']['Tables']['assets']['Row'];

interface AssetsProps {
  seriesId: string | null;
}

export function Assets({ seriesId }: AssetsProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    asset: Asset | null;
    relatedItems: { label: string; count: number }[];
  }>({
    isOpen: false,
    asset: null,
    relatedItems: [],
  });

  const assetTypes = [
    { id: 'all', label: 'All Assets' },
    { id: 'character_ref', label: 'Characters' },
    { id: 'background', label: 'Backgrounds' },
    { id: 'prop', label: 'Props' },
    { id: 'word_manifestation', label: 'Word Art' },
    { id: 'scene_image', label: 'Scenes' },
    { id: 'video_clip', label: 'Videos' },
    { id: 'audio', label: 'Audio' },
  ];

  useEffect(() => {
    loadAssets();
  }, [seriesId]);

  useEffect(() => {
    let filtered = assets;

    if (selectedType !== 'all') {
      filtered = filtered.filter((asset) => asset.asset_type === selectedType);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredAssets(filtered);
  }, [searchQuery, selectedType, assets]);

  const loadAssets = async () => {
    try {
      let query = supabase.from('assets').select('*').order('created_at', { ascending: false });

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();

    const relatedItems: { label: string; count: number }[] = [];

    if (asset.usage_count > 0) {
      relatedItems.push({ label: 'Places Used', count: asset.usage_count });
    }

    setDeleteModal({
      isOpen: true,
      asset,
      relatedItems,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.asset) return;

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', deleteModal.asset.id);

    if (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }

    setAssets((prev) => prev.filter((a) => a.id !== deleteModal.asset!.id));
    setDeleteModal({ isOpen: false, asset: null, relatedItems: [] });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Library</h1>
            <p className="text-gray-600">Browse and manage your production assets</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Upload Asset
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
            >
              {assetTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image className="w-8 h-8 text-scripps-blue" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No assets yet</h3>
            <p className="text-gray-600 mb-6">Generate or upload assets to get started</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Upload Asset
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-scripps-navy to-scripps-blue text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Generate with AI
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all border border-gray-200 overflow-hidden group cursor-pointer"
              >
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                  {asset.thumbnail_url || asset.file_url ? (
                    <img
                      src={asset.thumbnail_url || asset.file_url || ''}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image className="w-12 h-12 text-gray-400" />
                  )}
                  {asset.ai_generated && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-purple-500 text-white rounded text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      AI
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-60 text-white rounded text-xs">
                    {asset.asset_type.replace('_', ' ')}
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(asset, e)}
                    className="absolute bottom-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    title="Delete asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3">
                  <h3 className="font-medium text-gray-900 truncate mb-1">{asset.name}</h3>
                  {asset.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{asset.description}</p>
                  )}
                  {asset.usage_count > 0 && (
                    <div className="text-xs text-gray-500">Used {asset.usage_count}x</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, asset: null, relatedItems: [] })}
        onConfirm={handleDeleteConfirm}
        entityType="Asset"
        entityName={deleteModal.asset?.name || ''}
        relatedItems={deleteModal.relatedItems}
        warningMessage={
          deleteModal.asset?.usage_count && deleteModal.asset.usage_count > 0
            ? `This asset is currently used in ${deleteModal.asset.usage_count} place(s). Deleting it may affect your production.`
            : 'This asset will be permanently deleted from your library.'
        }
      />

      <AssetUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={loadAssets}
        seriesId={seriesId}
      />
    </div>
  );
}
