import { supabase } from '../lib/supabase';

export interface SpellingBeeWord {
  id: string;
  year: number;
  winning_word: string;
  winner_name: string | null;
  definition: string;
  part_of_speech: string | null;
  language_origin: string | null;
  pronunciation: string | null;
  example_sentence: string | null;
  difficulty_level: string | null;
  created_at: string;
  updated_at: string;
}

export async function getAllSpellingBeeWords(): Promise<SpellingBeeWord[]> {
  const { data, error } = await supabase
    .from('spelling_bee_winners')
    .select('*')
    .order('year', { ascending: false });

  if (error) {
    console.error('Error fetching spelling bee words:', error);
    return [];
  }

  return data || [];
}

export async function getWordByYear(year: number): Promise<SpellingBeeWord | null> {
  const { data, error } = await supabase
    .from('spelling_bee_winners')
    .select('*')
    .eq('year', year)
    .maybeSingle();

  if (error) {
    console.error('Error fetching word by year:', error);
    return null;
  }

  return data;
}

export async function getWordById(wordId: string): Promise<SpellingBeeWord | null> {
  const { data, error } = await supabase
    .from('spelling_bee_winners')
    .select('*')
    .eq('id', wordId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching word by id:', error);
    return null;
  }

  return data;
}

export async function getRandomWord(): Promise<SpellingBeeWord | null> {
  const { data, error } = await supabase
    .from('spelling_bee_winners')
    .select('*');

  if (error) {
    console.error('Error fetching random word:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}

export async function searchWords(query: string): Promise<SpellingBeeWord[]> {
  const searchTerm = query.toLowerCase().trim();

  if (!searchTerm) {
    return getAllSpellingBeeWords();
  }

  const yearSearch = parseInt(searchTerm);
  const isYearSearch = !isNaN(yearSearch) && yearSearch > 1900 && yearSearch < 2100;

  if (isYearSearch) {
    const { data, error } = await supabase
      .from('spelling_bee_winners')
      .select('*')
      .eq('year', yearSearch);

    if (error) {
      console.error('Error searching by year:', error);
      return [];
    }

    return data || [];
  }

  const { data, error } = await supabase
    .from('spelling_bee_winners')
    .select('*')
    .ilike('winning_word', `%${searchTerm}%`)
    .order('year', { ascending: false });

  if (error) {
    console.error('Error searching words:', error);
    return [];
  }

  return data || [];
}

export function getWordsByDecade(words: SpellingBeeWord[]): Record<string, SpellingBeeWord[]> {
  const decades: Record<string, SpellingBeeWord[]> = {};

  words.forEach(word => {
    const decade = Math.floor(word.year / 10) * 10;
    const decadeKey = `${decade}s`;

    if (!decades[decadeKey]) {
      decades[decadeKey] = [];
    }
    decades[decadeKey].push(word);
  });

  const sortedDecades = Object.keys(decades).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    return numB - numA;
  });

  const sortedResult: Record<string, SpellingBeeWord[]> = {};
  sortedDecades.forEach(decade => {
    sortedResult[decade] = decades[decade].sort((a, b) => b.year - a.year);
  });

  return sortedResult;
}

export function isSpellingBeeSeries(seriesTheme: string | null | undefined): boolean {
  if (!seriesTheme) return false;

  const theme = seriesTheme.toLowerCase();

  const spellingBeeKeywords = [
    'scripps national spelling bee',
    'spelling bee',
    'sch-awesome',
    'schawesome',
    'spelling',
    'bee',
    'speller',
    'vocabulary',
    'words',
    'dictionary'
  ];

  return spellingBeeKeywords.some(keyword => theme.includes(keyword));
}

export function getDifficultyColor(difficulty: string | null): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'hard':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'expert':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}
