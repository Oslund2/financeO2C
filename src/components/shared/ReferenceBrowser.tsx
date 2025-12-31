import { useState } from 'react';
import { X, Users, Layers, Package, Image as ImageIcon, Check } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type Asset = Database['public']['Tables']['assets']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

export type AssetType = 'character' | 'background' | 'prop';
export type ReferenceFilter = 'all' | 'characters' | 'backgrounds' | 'props';

export interface ReferenceImage {
  id: string;
  name: string;
  imageUrl: string;
  type: AssetType;
  assetId?: string;
  characterId?: string;
  source: 'character_library' | 'asset_library';
}

export interface ReferenceBrowserProps {
  assets: Asset[];
  characters: Character[];
  selectedRefs: ReferenceImage[];
  onSelect: (asset: Asset | Character, type: AssetType, source: 'character_library' | 'asset_library') => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  showCharactersOnly?: boolean;
  singleSelect?: boolean;
}

export function ReferenceBrowser({
  assets,
  characters,
  selectedRefs,
  onSelect,
  onClose,
  title = 'Select Reference Images',
  subtitle = 'Browse your Asset Library to add style references for generation',
  showCharactersOnly = false,
  singleSelect = false
}: ReferenceBrowserProps) {
  const [filter, setFilter] = useState<ReferenceFilter>(showCharactersOnly ? 'characters' : 'all');

  const isSelected = (id: string, type: AssetType) => {
    return selectedRefs.some(r => (r.assetId === id || r.characterId === id) && r.type === type);
  };

  const backgroundAssets = assets.filter(a => a.asset_type === 'background');
  const propAssets = assets.filter(a => a.asset_type === 'prop');
  const characterAssets = assets.filter(a => a.asset_type === 'character' || a.asset_type === 'character_ref');

  const getCounts = () => ({
    all: characters.length + assets.length,
    characters: characters.length + characterAssets.length,
    backgrounds: backgroundAssets.length,
    props: propAssets.length
  });

  const counts = getCounts();

  const filterTabs: { id: ReferenceFilter; label: string; count: number; icon: typeof Users }[] = showCharactersOnly
    ? [{ id: 'characters', label: 'Characters', count: counts.characters, icon: Users }]
    : [
        { id: 'all', label: 'All', count: counts.all, icon: ImageIcon },
        { id: 'characters', label: 'Characters', count: counts.characters, icon: Users },
        { id: 'backgrounds', label: 'Backgrounds', count: counts.backgrounds, icon: Layers },
        { id: 'props', label: 'Props', count: counts.props, icon: Package }
      ];

  const showCharacters = filter === 'all' || filter === 'characters';
  const showBackgrounds = !showCharactersOnly && (filter === 'all' || filter === 'backgrounds');
  const showProps = !showCharactersOnly && (filter === 'all' || filter === 'props');

  const allCharacterItems = [
    ...characters.map(c => ({ ...c, source: 'character' as const })),
    ...characterAssets.map(a => ({ ...a, source: 'asset' as const }))
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {filterTabs.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      filter === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      filter === tab.id ? 'bg-blue-500' : 'bg-gray-200'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {showCharacters && allCharacterItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">Characters</h3>
                <span className="text-xs text-gray-500">({allCharacterItems.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allCharacterItems.map((item) => {
                  const imageUrl = item.source === 'character'
                    ? (item as Character).reference_image_url
                    : (item as Asset).file_url;
                  const itemSelected = isSelected(item.id, 'character');

                  return (
                    <button
                      key={`${item.source}-${item.id}`}
                      onClick={() => {
                        if (item.source === 'character') {
                          onSelect(item as Character, 'character', 'character_library');
                        } else {
                          onSelect(item as Asset, 'character', 'asset_library');
                        }
                      }}
                      className={`group relative rounded-lg overflow-hidden transition-all ${
                        itemSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                          <Users className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      {itemSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="text-sm font-medium text-white truncate">{item.name}</div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Character
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showBackgrounds && backgroundAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold text-gray-700">Backgrounds</h3>
                <span className="text-xs text-gray-500">({backgroundAssets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {backgroundAssets.map((asset) => {
                  const itemSelected = isSelected(asset.id, 'background');

                  return (
                    <button
                      key={asset.id}
                      onClick={() => onSelect(asset, 'background', 'asset_library')}
                      className={`group relative rounded-lg overflow-hidden transition-all ${
                        itemSelected ? 'ring-2 ring-green-500 ring-offset-2' : ''
                      }`}
                    >
                      {asset.file_url ? (
                        <img
                          src={asset.file_url}
                          alt={asset.name}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                          <Layers className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      {itemSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="text-sm font-medium text-white truncate">{asset.name}</div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Background
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showProps && propAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-gray-700">Props</h3>
                <span className="text-xs text-gray-500">({propAssets.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {propAssets.map((asset) => {
                  const itemSelected = isSelected(asset.id, 'prop');

                  return (
                    <button
                      key={asset.id}
                      onClick={() => onSelect(asset, 'prop', 'asset_library')}
                      className={`group relative rounded-lg overflow-hidden transition-all ${
                        itemSelected ? 'ring-2 ring-amber-500 ring-offset-2' : ''
                      }`}
                    >
                      {asset.file_url ? (
                        <img
                          src={asset.file_url}
                          alt={asset.name}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-100 flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      {itemSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="text-sm font-medium text-white truncate">{asset.name}</div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Prop
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {((filter === 'all' && characters.length === 0 && assets.length === 0) ||
            (filter === 'characters' && allCharacterItems.length === 0) ||
            (filter === 'backgrounds' && backgroundAssets.length === 0) ||
            (filter === 'props' && propAssets.length === 0)) && (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No {filter === 'all' ? 'assets' : filter} available</p>
              <p className="text-sm text-gray-500 mt-1">
                {filter === 'all'
                  ? 'Create characters or generate assets to use as references'
                  : `Add ${filter} to your Asset Library to use them as references`}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedRefs.length > 0
              ? `${selectedRefs.length} reference${selectedRefs.length > 1 ? 's' : ''} selected`
              : 'Click images to select references'}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
