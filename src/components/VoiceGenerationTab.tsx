import { useState, useEffect } from 'react';
import {
  Mic,
  Sparkles,
  Users,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  Volume2,
  RefreshCw,
  UserCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getVoiceService } from '../services/voiceService';
import type { Database } from '../lib/database.types';
import { VoiceCloningModal } from './VoiceCloningModal';
import { VoiceSelector } from './VoiceSelector';
import { ElevenLabsSetupWizard } from './ElevenLabsSetupWizard';

type Character = Database['public']['Tables']['characters']['Row'];

interface VoiceGenerationTabProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
}

export function VoiceGenerationTab({ seriesId, onNavigate }: VoiceGenerationTabProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'characters' | 'clone' | 'library'>('overview');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerHealth, setProviderHealth] = useState<{
    elevenlabs: { available: boolean; error?: string };
    chatterbox: { available: boolean; error?: string };
  } | null>(null);
  const [showCloningModal, setShowCloningModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  useEffect(() => {
    loadData();
  }, [seriesId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Only block render on characters — health check runs in background
      await loadCharacters();
    } finally {
      setLoading(false);
    }
    // Run health check after render is unblocked (non-blocking)
    checkProviderHealth();
  };

  const loadCharacters = async () => {
    try {
      let query = supabase.from('characters').select('*');
      if (seriesId) {
        query = query.eq('series_id', seriesId);
      }
      const { data } = await query.order('name');
      setCharacters(data || []);
    } catch (error) {
      console.error('Error loading characters:', error);
    }
  };

  const checkProviderHealth = async () => {
    try {
      const voiceService = getVoiceService();
      const health = await voiceService.checkProviderHealth();
      setProviderHealth(health);
    } catch (error) {
      console.error('Error checking provider health:', error);
    }
  };

  const handleVoiceAssign = async (characterId: string, voiceId: string | null, provider: string | null) => {
    try {
      const { error } = await supabase
        .from('characters')
        .update({
          voice_provider: provider,
          eleven_labs_voice_id: provider === 'elevenlabs' ? voiceId : null,
          chatterbox_voice_id: provider === 'chatterbox' ? voiceId : null,
        })
        .eq('id', characterId);

      if (error) throw error;

      await loadCharacters();
      setEditingCharacter(null);
    } catch (error) {
      console.error('Error assigning voice:', error);
      alert('Failed to assign voice');
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Volume2 },
    { id: 'characters', label: 'Character Voices', icon: Users },
    { id: 'clone', label: 'Clone Voice', icon: UserCircle },
    { id: 'library', label: 'Voice Library', icon: Sparkles },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-scripps-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isActive
                  ? 'bg-scripps-blue text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'overview' && (
        <OverviewSection
          providerHealth={providerHealth}
          characters={characters}
          onNavigate={onNavigate}
          onRefresh={checkProviderHealth}
          onSectionChange={setActiveSection}
          onOpenSetup={() => setShowSetupWizard(true)}
        />
      )}

      {activeSection === 'characters' && (
        <CharacterVoicesSection
          characters={characters}
          onEdit={(char) => setEditingCharacter(char)}
          onRefresh={loadCharacters}
        />
      )}

      {activeSection === 'clone' && (
        <CloneVoiceSection onOpenModal={() => setShowCloningModal(true)} />
      )}

      {activeSection === 'library' && (
        <VoiceLibrarySection />
      )}

      {showCloningModal && (
        <VoiceCloningModal
          isOpen={showCloningModal}
          onClose={() => setShowCloningModal(false)}
          onSuccess={() => {
            setShowCloningModal(false);
            loadData();
          }}
        />
      )}

      <ElevenLabsSetupWizard
        isOpen={showSetupWizard}
        onClose={() => {
          setShowSetupWizard(false);
          checkProviderHealth();
        }}
      />

      {editingCharacter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Assign Voice to {editingCharacter.name}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <VoiceSelector
                selectedVoiceId={editingCharacter.voice_id}
                selectedProvider={editingCharacter.voice_provider as any}
                onVoiceSelect={(voiceId, provider) =>
                  handleVoiceAssign(editingCharacter.id, voiceId, provider)
                }
              />
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setEditingCharacter(null)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OverviewSectionProps {
  providerHealth: {
    elevenlabs: { available: boolean; error?: string };
    chatterbox: { available: boolean; error?: string };
  } | null;
  characters: Character[];
  onNavigate: (view: string) => void;
  onRefresh: () => void;
  onSectionChange: (section: 'overview' | 'characters' | 'clone' | 'library') => void;
  onOpenSetup: () => void;
}

function OverviewSection({ providerHealth, characters, onNavigate, onRefresh, onSectionChange, onOpenSetup }: OverviewSectionProps) {
  const charactersWithVoice = characters.filter(c => c.voice_id).length;
  const elevenlabsCount = characters.filter(c => c.voice_provider === 'elevenlabs').length;
  const chatterboxCount = characters.filter(c => c.voice_provider === 'chatterbox').length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-scripps-yellow/20 to-yellow-100 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-scripps-yellow rounded-lg flex items-center justify-center flex-shrink-0">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Voice Generation Studio</h3>
            <p className="text-gray-700 mb-4">
              Manage character voices, clone custom voices with Chatterbox, and generate dialogue audio using ElevenLabs and Chatterbox AI voice synthesis.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSectionChange('clone')}
                className="px-4 py-2 bg-scripps-yellow text-white rounded-lg hover:bg-yellow-500 transition-colors font-medium flex items-center gap-2"
              >
                <UserCircle className="w-4 h-4" />
                Clone Custom Voice
              </button>
              <button
                onClick={() => onSectionChange('characters')}
                className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-gray-300"
              >
                Manage Character Voices
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              ElevenLabs
            </h3>
            <button
              onClick={onRefresh}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {providerHealth?.elevenlabs.available ? (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Connected</p>
                <p className="text-xs text-gray-600 mt-1">
                  {elevenlabsCount} character{elevenlabsCount !== 1 ? 's' : ''} using ElevenLabs voices
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Unavailable</p>
                  <p className="text-xs text-red-700 mt-1">
                    {providerHealth?.elevenlabs.error || 'Service unavailable'}
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenSetup}
                className="w-full px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
              >
                Setup ElevenLabs
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Chatterbox
            </h3>
            <button
              onClick={onRefresh}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {providerHealth?.chatterbox.available ? (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Connected</p>
                <p className="text-xs text-gray-600 mt-1">
                  {chatterboxCount} character{chatterboxCount !== 1 ? 's' : ''} using Chatterbox voices
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Not Available</p>
                <p className="text-xs text-yellow-700 mt-1">
                  {providerHealth?.chatterbox.error || 'Service unavailable'}
                </p>
                <a
                  href="https://github.com/yourusername/chatterbox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-scripps-blue hover:underline mt-1 inline-block"
                >
                  Setup Guide
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Voice Assignment Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-3xl font-bold text-scripps-blue">{characters.length}</p>
            <p className="text-sm text-gray-600 mt-1">Total Characters</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">{charactersWithVoice}</p>
            <p className="text-sm text-gray-600 mt-1">With Voices</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-400">{characters.length - charactersWithVoice}</p>
            <p className="text-sm text-gray-600 mt-1">Unassigned</p>
          </div>
        </div>
        {characters.length === 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              No characters found.{' '}
              <button
                onClick={() => onNavigate('characters')}
                className="text-scripps-blue hover:underline font-medium"
              >
                Create characters
              </button>
              {' '}to get started with voice generation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CharacterVoicesSectionProps {
  characters: Character[];
  onEdit: (character: Character) => void;
  onRefresh: () => void;
}

function CharacterVoicesSection({ characters, onEdit, onRefresh }: CharacterVoicesSectionProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const handlePlayPreview = async (character: Character) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }

    if (playingVoiceId === character.voice_id) {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      return;
    }

    if (!character.voice_id || !character.voice_provider) {
      return;
    }

    setPlayingVoiceId(character.voice_id);

    try {
      const voiceService = getVoiceService();
      const previewText = `Hello! I'm ${character.name}.`;
      const audioBlob = await voiceService.generateSpeech(
        previewText,
        character.voice_id,
        character.voice_provider as any
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setPlayingVoiceId(null);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setPlayingVoiceId(null);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      setCurrentAudio(audio);
      await audio.play();
    } catch (err) {
      console.error('Error playing preview:', err);
      setPlayingVoiceId(null);
      setCurrentAudio(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Character Voice Assignments ({characters.length})
        </h3>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No characters found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map((character) => (
            <div
              key={character.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                {character.image_url ? (
                  <img
                    src={character.image_url}
                    alt={character.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">{character.name}</h4>
                  {character.voice_id && character.voice_provider ? (
                    <div className="mt-1 space-y-1">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                          character.voice_provider === 'elevenlabs'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {character.voice_provider === 'elevenlabs' ? 'ElevenLabs' : 'Chatterbox'}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handlePlayPreview(character)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                            playingVoiceId === character.voice_id
                              ? 'bg-scripps-blue text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          {playingVoiceId === character.voice_id ? 'Playing...' : 'Preview'}
                        </button>
                        <button
                          onClick={() => onEdit(character)}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Change Voice
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-2">No voice assigned</p>
                      <button
                        onClick={() => onEdit(character)}
                        className="px-3 py-1 text-xs bg-scripps-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Assign Voice
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CloneVoiceSectionProps {
  onOpenModal: () => void;
}

function CloneVoiceSection({ onOpenModal }: CloneVoiceSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Clone Custom Voices</h3>
        <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
          Upload audio samples to create custom voice clones using Chatterbox AI. Perfect for creating unique character voices that match your vision.
        </p>
        <button
          onClick={onOpenModal}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 mx-auto"
        >
          <Sparkles className="w-5 h-5" />
          Start Voice Cloning
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">How Voice Cloning Works</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-scripps-blue text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Upload Audio Samples</h4>
              <p className="text-sm text-gray-600">
                Provide 1-10 high-quality audio samples of the voice you want to clone. More samples = better results.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-scripps-blue text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">
              2
            </div>
            <div>
              <h4 className="font-medium text-gray-900">AI Processing</h4>
              <p className="text-sm text-gray-600">
                Chatterbox AI analyzes the voice characteristics and creates a unique voice model.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-scripps-blue text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Use Instantly</h4>
              <p className="text-sm text-gray-600">
                Once cloned, the voice appears in your voice library and can be assigned to characters immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Best Practices for Voice Cloning:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Use clear, high-quality audio recordings</li>
              <li>Include varied speech samples (different emotions, speeds)</li>
              <li>Avoid background noise or music</li>
              <li>Each sample should be 10-30 seconds of speech</li>
              <li>Use consistent microphone/recording quality across samples</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceLibrarySection() {
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState<'all' | 'elevenlabs' | 'chatterbox'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setLoading(true);
    try {
      const voiceService = getVoiceService();
      const allVoices = await voiceService.getAllVoices(true);
      setVoices(allVoices);
    } catch (error) {
      console.error('Error loading voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVoices = voices.filter((voice) => {
    if (providerFilter !== 'all' && voice.provider !== providerFilter) {
      return false;
    }

    const query = searchQuery.toLowerCase();
    return (
      voice.name.toLowerCase().includes(query) ||
      voice.description?.toLowerCase().includes(query) ||
      voice.metadata.accent?.toLowerCase().includes(query) ||
      voice.metadata.gender?.toLowerCase().includes(query)
    );
  });

  const elevenLabsVoices = voices.filter(v => v.provider === 'elevenlabs');
  const chatterboxVoices = voices.filter(v => v.provider === 'chatterbox');
  const clonedVoices = voices.filter(v => v.metadata.is_cloned);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-scripps-blue animate-spin" />
        <span className="ml-2 text-gray-600">Loading voice library...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-scripps-blue">{voices.length}</p>
          <p className="text-sm text-gray-600 mt-1">Total Voices</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-orange-600">{elevenLabsVoices.length}</p>
          <p className="text-sm text-gray-600 mt-1">ElevenLabs</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-2xl font-bold text-green-600">{chatterboxVoices.length}</p>
          <p className="text-sm text-gray-600 mt-1">Chatterbox</p>
        </div>
      </div>

      {clonedVoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">Custom Cloned Voices</h4>
          </div>
          <p className="text-sm text-blue-800">
            You have {clonedVoices.length} custom cloned voice{clonedVoices.length !== 1 ? 's' : ''} available
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setProviderFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              providerFilter === 'all'
                ? 'bg-scripps-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({voices.length})
          </button>
          <button
            onClick={() => setProviderFilter('elevenlabs')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              providerFilter === 'elevenlabs'
                ? 'bg-scripps-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ElevenLabs ({elevenLabsVoices.length})
          </button>
          <button
            onClick={() => setProviderFilter('chatterbox')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              providerFilter === 'chatterbox'
                ? 'bg-scripps-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Chatterbox ({chatterboxVoices.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search voices by name, gender, accent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
        />

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-4">
            Showing {filteredVoices.length} of {voices.length} voices
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredVoices.map((voice) => (
              <div
                key={`${voice.provider}-${voice.voice_id}`}
                className="p-3 border border-gray-200 rounded-lg hover:border-scripps-blue hover:bg-blue-50 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-gray-900 text-sm">{voice.name}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      voice.provider === 'elevenlabs'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {voice.provider === 'elevenlabs' ? 'EL' : 'CB'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {voice.metadata.gender && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                      {voice.metadata.gender}
                    </span>
                  )}
                  {voice.metadata.age && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                      {voice.metadata.age}
                    </span>
                  )}
                  {voice.metadata.is_cloned && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      Cloned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
