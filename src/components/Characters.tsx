import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Copy, Trash2, Sparkles, X, Volume2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { VoiceSelector } from './VoiceSelector';

type Character = Database['public']['Tables']['characters']['Row'];

interface CharactersProps {
  seriesId: string | null;
}

export function Characters({ seriesId }: CharactersProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [fullscreenCharacter, setFullscreenCharacter] = useState<Character | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    character: Character | null;
    relatedItems: { label: string; count: number }[];
  }>({
    isOpen: false,
    character: null,
    relatedItems: [],
  });

  useEffect(() => {
    loadCharacters();
  }, [seriesId]);

  useEffect(() => {
    let filtered = characters;

    if (searchQuery) {
      filtered = filtered.filter(
        (char) =>
          char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          char.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          char.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (roleFilter) {
      filtered = filtered.filter((char) => char.role === roleFilter);
    }

    setFilteredCharacters(filtered);
  }, [searchQuery, roleFilter, characters]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenCharacter) {
        setFullscreenCharacter(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [fullscreenCharacter]);

  const loadCharacters = async () => {
    try {
      let query = supabase.from('characters').select('*').order('created_at', { ascending: false });

      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCharacters(data || []);
    } catch (error) {
      console.error('Error loading characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (character: Character) => {
    const relatedItems: { label: string; count: number }[] = [];

    try {
      const { count: scriptCount } = await supabase
        .from('scripts')
        .select('*', { count: 'exact', head: true })
        .contains('character_ids', [character.id]);

      if (scriptCount) {
        relatedItems.push({ label: 'Scripts using this character', count: scriptCount });
      }

      const { count: assetCount } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('character_id', character.id);

      if (assetCount) {
        relatedItems.push({ label: 'Related Character Assets', count: assetCount });
      }
    } catch (error) {
      console.error('Error checking related items:', error);
    }

    setDeleteModal({
      isOpen: true,
      character,
      relatedItems,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.character) return;

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', deleteModal.character.id);

    if (error) {
      console.error('Error deleting character:', error);
      throw error;
    }

    setCharacters((prev) => prev.filter((c) => c.id !== deleteModal.character!.id));
    setDeleteModal({ isOpen: false, character: null, relatedItems: [] });
  };

  const handleDuplicate = (character: Character) => {
    setEditingCharacter({
      ...character,
      id: '',
      name: `${character.name} (Copy)`,
    } as Character);
    setShowForm(true);
  };

  const handleEdit = (character: Character) => {
    setEditingCharacter(character);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCharacter(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading characters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Characters</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your animated character cast</p>
          </div>
          <button
            onClick={() => {
              setEditingCharacter(null);
              setShowForm(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium min-h-[44px] w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            New Character
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-base"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRoleFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                roleFilter === null
                  ? 'bg-scripps-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setRoleFilter('Primary')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                roleFilter === 'Primary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
              }`}
            >
              Primary
            </button>
            <button
              onClick={() => setRoleFilter('Ensemble')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                roleFilter === 'Ensemble'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
              }`}
            >
              Ensemble
            </button>
            <button
              onClick={() => setRoleFilter('Recurring')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                roleFilter === 'Recurring'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
              }`}
            >
              Recurring
            </button>
            <button
              onClick={() => setRoleFilter('Cameo')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                roleFilter === 'Cameo'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              Cameo
            </button>
          </div>
        </div>

        {filteredCharacters.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-scripps-blue" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No characters yet</h3>
            <p className="text-gray-600 mb-6">Create your first character to get started</p>
            <button
              onClick={() => {
                setEditingCharacter(null);
                setShowForm(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium min-h-[44px]"
            >
              Create Character
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCharacters.map((character) => (
              <div
                key={character.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-200 overflow-hidden group cursor-pointer"
                onClick={() => setFullscreenCharacter(character)}
              >
                <div className="h-48 bg-gradient-to-br from-scripps-blue via-scripps-light-blue to-sky-400 flex items-center justify-center relative">
                  {character.reference_image_url ? (
                    <img
                      src={character.reference_image_url}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl">🎭</div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(character);
                      }}
                      className="p-2.5 bg-white rounded-lg shadow-md hover:bg-gray-50 active:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Edit2 className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(character);
                      }}
                      className="p-2.5 bg-white rounded-lg shadow-md hover:bg-gray-50 active:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Copy className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(character);
                      }}
                      className="p-2.5 bg-white rounded-lg shadow-md hover:bg-red-50 active:bg-red-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{character.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          character.role === 'Primary' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                          character.role === 'Ensemble' ? 'bg-green-100 text-green-700 border border-green-300' :
                          character.role === 'Recurring' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                          'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}>
                          {character.role}
                        </span>
                        {character.eleven_labs_voice_id && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-full">
                            <Volume2 className="w-3 h-3" />
                            <span className="text-xs font-medium">Voice</span>
                          </div>
                        )}
                      </div>
                      {character.age && (
                        <p className="text-sm text-gray-600">Age {character.age}</p>
                      )}
                    </div>
                  </div>

                  {character.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">{character.description}</p>
                  )}

                  {character.clay_features && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-scripps-navy font-medium">Clay Feature:</p>
                      <p className="text-xs text-scripps-blue line-clamp-1">{character.clay_features}</p>
                    </div>
                  )}

                  {character.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {character.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {character.tags.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                          +{character.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {fullscreenCharacter && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 lg:p-8 animate-in fade-in duration-200"
          onClick={() => setFullscreenCharacter(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenCharacter(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/20 hover:scale-110 z-10"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
            aria-label="Close fullscreen view"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-scripps-navy via-scripps-blue to-scripps-light-blue sm:rounded-3xl shadow-2xl overflow-hidden border-0 sm:border border-scripps-blue min-h-full sm:min-h-0">
              <div className="h-64 sm:h-96 bg-gradient-to-br from-scripps-blue via-scripps-light-blue to-sky-400 flex items-center justify-center relative">
                {fullscreenCharacter.reference_image_url ? (
                  <img
                    src={fullscreenCharacter.reference_image_url}
                    alt={fullscreenCharacter.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-9xl">🎭</div>
                )}
              </div>

              <div className="p-6 sm:p-8 lg:p-12 space-y-6 sm:space-y-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white flex-1">{fullscreenCharacter.name}</h2>
                  {fullscreenCharacter.eleven_labs_voice_id && (
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-scripps-yellow/20 rounded-2xl border border-scripps-yellow/30">
                      <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-scripps-yellow" />
                      <span className="text-base sm:text-xl font-semibold text-white">Voice Enabled</span>
                    </div>
                  )}
                </div>

                {fullscreenCharacter.age && (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
                    <p className="text-lg sm:text-2xl text-sky-300">
                      <span className="font-semibold text-scripps-yellow">Age:</span> {fullscreenCharacter.age}
                    </p>
                  </div>
                )}

                {fullscreenCharacter.description && (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/20">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-scripps-yellow mb-3 sm:mb-4">Description</h3>
                    <p className="text-base sm:text-lg lg:text-2xl text-sky-300 leading-relaxed">{fullscreenCharacter.description}</p>
                  </div>
                )}

                {fullscreenCharacter.personality && (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/20">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-scripps-yellow mb-3 sm:mb-4">Personality & Traits</h3>
                    <p className="text-base sm:text-lg lg:text-2xl text-sky-300 leading-relaxed">{fullscreenCharacter.personality}</p>
                  </div>
                )}

                {fullscreenCharacter.clay_features && (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/20">
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-scripps-yellow" />
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-scripps-yellow">Clay Feature</h3>
                    </div>
                    <p className="text-base sm:text-lg lg:text-2xl text-sky-300 leading-relaxed">{fullscreenCharacter.clay_features}</p>
                  </div>
                )}

                {fullscreenCharacter.voice_characteristics && (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/20">
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <Volume2 className="w-6 h-6 sm:w-8 sm:h-8 text-scripps-yellow" />
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-scripps-yellow">Voice Characteristics</h3>
                    </div>
                    <p className="text-base sm:text-lg lg:text-2xl text-sky-300 leading-relaxed">{fullscreenCharacter.voice_characteristics}</p>
                  </div>
                )}

                {fullscreenCharacter.tags.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/20">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-scripps-yellow mb-4 sm:mb-6">Tags</h3>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {fullscreenCharacter.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-sm sm:text-base lg:text-xl px-4 sm:px-6 py-2 sm:py-3 bg-scripps-yellow/20 text-white rounded-full border border-scripps-yellow/30 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <CharacterForm
          character={editingCharacter}
          seriesId={seriesId}
          onClose={handleCloseForm}
          onSave={() => {
            loadCharacters();
            handleCloseForm();
          }}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, character: null, relatedItems: [] })}
        onConfirm={handleDeleteConfirm}
        entityType="Character"
        entityName={deleteModal.character?.name || ''}
        relatedItems={deleteModal.relatedItems}
        warningMessage={
          deleteModal.relatedItems.length > 0
            ? 'This character is being used in scripts or has associated assets. Deleting it may affect your production.'
            : 'This character will be permanently deleted from your series.'
        }
      />
    </div>
  );
}

interface CharacterFormProps {
  character: Character | null;
  seriesId: string | null;
  onClose: () => void;
  onSave: () => void;
}

function CharacterForm({ character, seriesId, onClose, onSave }: CharacterFormProps) {
  const [formData, setFormData] = useState({
    name: character?.name || '',
    age: character?.age?.toString() || '',
    role: character?.role || 'Ensemble',
    description: character?.description || '',
    personality: character?.personality || '',
    clay_features: character?.clay_features || '',
    voice_characteristics: character?.voice_characteristics || '',
    tags: character?.tags.join(', ') || '',
  });
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(
    character?.eleven_labs_voice_id || null
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    character?.reference_image_url || null
  );
  const [saving, setSaving] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = character?.reference_image_url || null;

      if (selectedImage) {
        const timestamp = Date.now();
        const sanitizedName = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const extension = selectedImage.name.split('.').pop();
        const filename = `${sanitizedName}_${timestamp}.${extension}`;
        const filePath = `characters/${filename}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('character-images')
          .upload(filePath, selectedImage, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('Failed to upload image. Please try again.');
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('character-images')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      }

      const characterData = {
        series_id: seriesId,
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        role: formData.role,
        description: formData.description || null,
        personality: formData.personality || null,
        clay_features: formData.clay_features || null,
        voice_characteristics: formData.voice_characteristics || null,
        eleven_labs_voice_id: selectedVoiceId,
        reference_image_url: imageUrl,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      if (character?.id) {
        const { error } = await supabase
          .from('characters')
          .update(characterData)
          .eq('id', character.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('characters').insert([characterData]);
        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving character:', error);
      alert('Failed to save character. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white sm:rounded-xl shadow-2xl max-w-3xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {character?.id ? 'Edit Character' : 'New Character'}
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-base"
                placeholder="e.g., Barnaby"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Age
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-base"
                placeholder="e.g., 10"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Character Role *
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-base bg-white"
              >
                <option value="Primary">Primary</option>
                <option value="Ensemble">Ensemble</option>
                <option value="Recurring">Recurring</option>
                <option value="Cameo">Cameo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reference Image
            </label>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">🎭</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-scripps-blue file:text-white hover:file:bg-scripps-navy file:cursor-pointer cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Upload a reference image for this character (JPG, PNG, or GIF)
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Physical Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-base"
              placeholder="Describe the character's appearance..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Personality & Traits
            </label>
            <textarea
              value={formData.personality}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-base"
              placeholder="Describe their personality, behaviors, and quirks..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Clay Features
            </label>
            <textarea
              value={formData.clay_features}
              onChange={(e) => setFormData({ ...formData, clay_features: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-base"
              placeholder="Special claymation characteristics (e.g., head inflates when excited)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Voice Characteristics
            </label>
            <textarea
              value={formData.voice_characteristics}
              onChange={(e) => setFormData({ ...formData, voice_characteristics: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-base"
              placeholder="Describe the character's voice (e.g., high-pitched when nervous)"
            />
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-lg p-4">
            <VoiceSelector
              selectedVoiceId={selectedVoiceId}
              onVoiceSelect={setSelectedVoiceId}
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent text-base"
              placeholder="Comma-separated tags (e.g., protagonist, anxious, smart)"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all font-medium min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg active:shadow-md transition-all font-medium disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Saving...' : character?.id ? 'Update Character' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
