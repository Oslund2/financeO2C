import { useState, useEffect, useRef } from 'react';
import { Trophy, Book, Calendar, Shuffle, Sparkles, X, Search, ChevronDown, Globe, Volume2, GraduationCap } from 'lucide-react';
import {
  getAllSpellingBeeWords,
  getRandomWord,
  getWordsByDecade,
  getDifficultyColor,
  type SpellingBeeWord
} from '../services/spellingBeeService';

interface SpellingBeeWordSelectorProps {
  onWordSelect: (word: SpellingBeeWord | null) => void;
  selectedWord: SpellingBeeWord | null;
}

export function SpellingBeeWordSelector({ onWordSelect, selectedWord }: SpellingBeeWordSelectorProps) {
  const [words, setWords] = useState<SpellingBeeWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [activeDecade, setActiveDecade] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWords();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadWords = async () => {
    setLoading(true);
    const data = await getAllSpellingBeeWords();
    setWords(data);
    setLoading(false);
  };

  const handleRandomWord = async () => {
    setIsRandomizing(true);

    await new Promise(resolve => setTimeout(resolve, 300));

    let iterations = 0;
    const maxIterations = 8;
    const interval = setInterval(() => {
      if (words.length > 0) {
        const randomIndex = Math.floor(Math.random() * words.length);
        onWordSelect(words[randomIndex]);
      }
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setTimeout(async () => {
          const randomWord = await getRandomWord();
          if (randomWord) {
            onWordSelect(randomWord);
          }
          setIsRandomizing(false);
        }, 100);
      }
    }, 80);
  };

  const handleClearSelection = () => {
    onWordSelect(null);
    setSearchQuery('');
  };

  const filteredWords = words.filter(word => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    const yearMatch = word.year.toString().includes(query);
    const wordMatch = word.winning_word.toLowerCase().includes(query);
    const originMatch = word.language_origin?.toLowerCase().includes(query);

    return yearMatch || wordMatch || originMatch;
  });

  const wordsByDecade = getWordsByDecade(filteredWords);
  const decades = Object.keys(wordsByDecade);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center animate-pulse">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="h-5 bg-amber-200 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-amber-100 rounded w-64 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Scripps Spelling Bee Word</h3>
              <p className="text-sm text-gray-600">Select a historical winning word for your episode</p>
            </div>
          </div>
          <button
            onClick={handleRandomWord}
            disabled={isRandomizing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isRandomizing
                ? 'bg-amber-200 text-amber-700 cursor-wait'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg'
            }`}
          >
            <Shuffle className={`w-4 h-4 ${isRandomizing ? 'animate-spin' : ''}`} />
            {isRandomizing ? 'Picking...' : 'Random Word'}
          </button>
        </div>

        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-amber-300 rounded-lg cursor-pointer hover:border-amber-400 transition-colors"
          >
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search by year or word..."
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
            />
            {selectedWord && !isDropdownOpen && (
              <span className="text-amber-700 font-medium">
                {selectedWord.year} - {selectedWord.winning_word}
              </span>
            )}
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-96 overflow-hidden">
              <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto bg-gray-50">
                <button
                  onClick={() => setActiveDecade(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeDecade === null
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All
                </button>
                {decades.map(decade => (
                  <button
                    key={decade}
                    onClick={() => setActiveDecade(decade)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeDecade === decade
                        ? 'bg-amber-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {decade}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto max-h-72">
                {(activeDecade ? [activeDecade] : decades).map(decade => (
                  <div key={decade}>
                    {!activeDecade && (
                      <div className="sticky top-0 bg-gray-100 px-4 py-2 font-semibold text-gray-700 text-sm border-b border-gray-200">
                        {decade}
                      </div>
                    )}
                    {wordsByDecade[decade]?.map(word => (
                      <button
                        key={word.id}
                        onClick={() => {
                          onWordSelect(word);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-amber-50 transition-colors border-b border-gray-50 ${
                          selectedWord?.id === word.id ? 'bg-amber-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-amber-600 font-mono font-semibold text-sm w-12">{word.year}</span>
                          <div className="text-left">
                            <span className="font-medium text-gray-900">{word.winning_word}</span>
                            {word.language_origin && (
                              <span className="ml-2 text-xs text-gray-500">({word.language_origin})</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getDifficultyColor(word.difficulty_level)}`}>
                          {word.difficulty_level || 'medium'}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
                {filteredWords.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No words found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedWord && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">Selected Word</span>
            </div>
            <button
              onClick={handleClearSelection}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-2xl font-bold text-gray-900 mb-1">{selectedWord.winning_word}</h4>
                {selectedWord.pronunciation && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-sm font-mono">{selectedWord.pronunciation}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-amber-600 font-semibold">
                  <Calendar className="w-4 h-4" />
                  {selectedWord.year}
                </div>
                {selectedWord.winner_name && (
                  <div className="text-sm text-gray-500 mt-1">
                    Winner: {selectedWord.winner_name}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {selectedWord.part_of_speech && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  <Book className="w-3 h-3" />
                  {selectedWord.part_of_speech}
                </span>
              )}
              {selectedWord.language_origin && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  <Globe className="w-3 h-3" />
                  {selectedWord.language_origin}
                </span>
              )}
              {selectedWord.difficulty_level && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(selectedWord.difficulty_level)}`}>
                  <GraduationCap className="w-3 h-3" />
                  {selectedWord.difficulty_level}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Definition</label>
                <p className="text-gray-800 mt-1">{selectedWord.definition}</p>
              </div>

              {selectedWord.example_sentence && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Example</label>
                  <p className="text-gray-600 mt-1 italic">"{selectedWord.example_sentence}"</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Trophy className="w-4 h-4" />
                <span>This word will be used in your episode vocabulary and integrated into the script.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
