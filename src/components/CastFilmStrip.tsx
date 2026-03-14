import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { CharacterImage } from './CharacterImage';

type Character = Database['public']['Tables']['characters']['Row'];

interface CastFilmStripProps {
  seriesId: string | null;
  onNavigate: (view: string) => void;
  seriesName?: string;
}

const ROLE_ORDER = ['Primary', 'Ensemble', 'Recurring', 'Cameo'];

const ROLE_COLORS = {
  Primary: 'bg-blue-500',
  Ensemble: 'bg-green-500',
  Recurring: 'bg-amber-500',
  Cameo: 'bg-gray-500',
};

export function CastFilmStrip({ seriesId, onNavigate, seriesName }: CastFilmStripProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const touchStartRef = useRef<number>(0);
  const touchEndRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    loadCharacters();
  }, [seriesId]);

  useEffect(() => {
    checkScrollButtons();
  }, [characters]);

  const loadCharacters = async () => {
    try {
      if (!seriesId) {
        setCharacters([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('characters')
        .select('id, name, reference_image_url, role')
        .eq('series_id', seriesId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const sortedData = (data || []).sort((a, b) => {
        const aIndex = ROLE_ORDER.indexOf(a.role);
        const bIndex = ROLE_ORDER.indexOf(b.role);

        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;

        return aIndex - bIndex;
      });

      console.log('Characters loaded for series:', seriesId, 'Count:', sortedData.length);
      setCharacters(sortedData);
    } catch (error) {
      console.error('Error loading characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 400;
    const newScrollLeft =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });

    setTimeout(checkScrollButtons, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    touchEndRef.current = e.touches[0].clientX;
    const diff = touchStartRef.current - touchEndRef.current;

    container.scrollLeft += diff * 0.5;
    touchStartRef.current = touchEndRef.current;
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setTimeout(checkScrollButtons, 100);
  };

  const groupedCharacters = ROLE_ORDER.reduce((acc, role) => {
    const roleCharacters = characters.filter((char) => char.role === role);
    if (roleCharacters.length > 0) {
      acc[role] = roleCharacters;
    }
    return acc;
  }, {} as Record<string, Character[]>);

  console.log('Grouped characters by role:', Object.keys(groupedCharacters));

  if (loading) {
    return (
      <div className="mb-6 animate-pulse">
        <div className="h-32 bg-gray-900 rounded-lg"></div>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 relative">
        <div className="film-perforations-top"></div>
        <div className="film-perforations-bottom"></div>

        <div className="py-8 px-6 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          {!seriesId ? (
            <>
              <p className="text-gray-400 mb-3">Select a series to view its cast</p>
              <p className="text-gray-500 text-sm">Each series has its own unique characters</p>
            </>
          ) : (
            <>
              <p className="text-gray-400 mb-3">Add characters to {seriesName || 'this series'}</p>
              <button
                onClick={() => onNavigate('characters')}
                className="px-4 py-2 bg-scripps-blue hover:bg-scripps-navy text-white rounded-lg transition-colors font-medium"
              >
                Add Characters
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 relative group">
      {seriesName && (
        <div className="mb-2 px-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Cast for: {seriesName}
          </p>
        </div>
      )}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 relative">
        <div className="film-perforations-top"></div>
        <div className="film-perforations-bottom"></div>

        <div className="relative px-4 py-3">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 hover:bg-black rounded-full flex items-center justify-center text-white shadow-lg transition-all opacity-0 group-hover:opacity-100"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 hover:bg-black rounded-full flex items-center justify-center text-white shadow-lg transition-all opacity-0 group-hover:opacity-100"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={checkScrollButtons}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {Object.entries(groupedCharacters).map(([role, roleCharacters], groupIndex) => (
              <div key={role} className="flex gap-3 items-center">
                {groupIndex > 0 && (
                  <div className="h-20 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent mx-2"></div>
                )}

                <div className="flex-shrink-0 flex flex-col items-center justify-center px-2">
                  <div className={`w-2 h-2 rounded-full ${ROLE_COLORS[role as keyof typeof ROLE_COLORS]} mb-1`}></div>
                  <span className="text-xs font-semibold text-gray-400 whitespace-nowrap tracking-wide">
                    {role.toUpperCase()}
                  </span>
                </div>

                {roleCharacters.map((character) => (
                  <button
                    key={character.id}
                    onClick={() => onNavigate('characters')}
                    className="flex-shrink-0 group/frame relative"
                  >
                    <div className="w-20 h-24 bg-gray-800 rounded border-2 border-gray-600 overflow-hidden shadow-lg hover:shadow-2xl hover:border-gray-400 transition-all hover:scale-110 hover:z-10 relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50"></div>

                      <CharacterImage
                        url={character.reference_image_url}
                        alt={character.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        fallback={
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <Users className="w-8 h-8 text-gray-500" />
                          </div>
                        }
                      />

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                        <p className="text-white text-[10px] font-semibold leading-tight truncate text-center">
                          {character.name}
                        </p>
                      </div>

                      <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${ROLE_COLORS[character.role as keyof typeof ROLE_COLORS]} border border-white/50 shadow-sm`}></div>
                    </div>

                    <div className="absolute -inset-1 border-2 border-scripps-yellow rounded opacity-0 group-hover/frame:opacity-100 transition-opacity pointer-events-none"></div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .film-perforations-top,
        .film-perforations-bottom {
          position: absolute;
          left: 0;
          right: 0;
          height: 8px;
          background-image: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 8px,
            #374151 8px,
            #374151 14px
          );
          z-index: 5;
        }

        .film-perforations-top {
          top: 0;
          border-bottom: 1px solid #4b5563;
        }

        .film-perforations-bottom {
          bottom: 0;
          border-top: 1px solid #4b5563;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
