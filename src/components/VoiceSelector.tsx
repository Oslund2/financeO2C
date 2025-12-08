import { useState, useEffect } from 'react';
import { Volume2, Play, Loader2, AlertCircle, X } from 'lucide-react';
import { getElevenLabsService, type ElevenLabsVoice } from '../services/elevenLabsService';

interface VoiceSelectorProps {
  selectedVoiceId: string | null;
  onVoiceSelect: (voiceId: string | null) => void;
}

export function VoiceSelector({ selectedVoiceId, onVoiceSelect }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadVoices();
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
    };
  }, []);

  const loadVoices = async () => {
    setLoading(true);
    setError(null);

    try {
      const service = getElevenLabsService();
      const voiceList = await service.getVoices();
      setVoices(voiceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPreview = async (voice: ElevenLabsVoice) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
    }

    if (playingVoiceId === voice.voice_id) {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      return;
    }

    setPlayingVoiceId(voice.voice_id);

    try {
      if (voice.preview_url) {
        const audio = new Audio(voice.preview_url);
        audio.onended = () => {
          setPlayingVoiceId(null);
          setCurrentAudio(null);
        };
        audio.onerror = () => {
          setPlayingVoiceId(null);
          setCurrentAudio(null);
        };
        setCurrentAudio(audio);
        await audio.play();
      } else {
        const service = getElevenLabsService();
        const previewText = 'Hello! This is a preview of my voice.';
        const audioBlob = await service.generatePreview(voice.voice_id, previewText);
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
      }
    } catch (err) {
      console.error('Error playing preview:', err);
      setPlayingVoiceId(null);
      setCurrentAudio(null);
    }
  };

  const filteredVoices = voices.filter((voice) => {
    const query = searchQuery.toLowerCase();
    return (
      voice.name.toLowerCase().includes(query) ||
      voice.labels.accent?.toLowerCase().includes(query) ||
      voice.labels.gender?.toLowerCase().includes(query) ||
      voice.labels.age?.toLowerCase().includes(query) ||
      voice.labels.description?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-scripps-blue animate-spin" />
        <span className="ml-2 text-gray-600">Loading voices...</span>
      </div>
    );
  }

  if (error) {
    const isConfigError = error.includes('API key') || error.includes('not configured');

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Failed to load voices</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            {isConfigError && (
              <p className="text-sm text-red-700 mt-2">
                The Eleven Labs API key is configured in your environment secrets.
                Make sure <code className="bg-red-100 px-1 rounded">VITE_ELEVENLABS_API_KEY</code> is set.
              </p>
            )}
            <button
              onClick={loadVoices}
              className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-scripps-blue" />
          <span className="text-sm font-semibold text-gray-700">
            Select Voice ({voices.length} available)
          </span>
        </div>
        {selectedVoiceId && (
          <button
            onClick={() => onVoiceSelect(null)}
            className="text-xs text-gray-600 hover:text-gray-800 underline"
          >
            Clear Selection
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Search by name, gender, age, accent..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-scripps-blue focus:border-transparent"
      />

      <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
        {filteredVoices.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-600">
            No voices found matching your search
          </div>
        ) : (
          filteredVoices.map((voice) => {
            const isSelected = voice.voice_id === selectedVoiceId;
            const isPlaying = playingVoiceId === voice.voice_id;

            return (
              <div
                key={voice.voice_id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
                onClick={() => onVoiceSelect(voice.voice_id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{voice.name}</p>
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {voice.labels.gender && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        {voice.labels.gender}
                      </span>
                    )}
                    {voice.labels.age && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        {voice.labels.age}
                      </span>
                    )}
                    {voice.labels.accent && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                        {voice.labels.accent}
                      </span>
                    )}
                  </div>
                  {voice.labels.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                      {voice.labels.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPreview(voice);
                  }}
                  className={`ml-2 p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isPlaying
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Preview voice"
                >
                  {isPlaying ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {selectedVoiceId && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
          Voice ID: {selectedVoiceId}
        </div>
      )}
    </div>
  );
}
