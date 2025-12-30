import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Character = Database['public']['Tables']['characters']['Row'];

export interface CharacterMatch {
  character: Character;
  matchType: 'exact' | 'alias' | 'normalized' | 'fuzzy';
  confidence: number;
}

export interface CharacterMatchResult {
  found: boolean;
  match?: CharacterMatch;
  searchedName: string;
  allCandidates?: Character[];
}

function normalizeCharacterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(mrs?\.?|ms\.?|mr\.?|dr\.?|prof\.?)\s*/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function calculateSimilarity(a: string, b: string): number {
  const normalizedA = normalizeCharacterName(a);
  const normalizedB = normalizeCharacterName(b);

  if (normalizedA === normalizedB) return 1.0;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  return 1 - (distance / maxLength);
}

function matchesWithHonorificVariations(searchName: string, characterName: string): boolean {
  const searchNorm = normalizeCharacterName(searchName);
  const charNorm = normalizeCharacterName(characterName);

  if (searchNorm === charNorm) return true;

  if (charNorm.startsWith(searchNorm) || searchNorm.startsWith(charNorm)) {
    const shorter = searchNorm.length < charNorm.length ? searchNorm : charNorm;
    const longer = searchNorm.length >= charNorm.length ? searchNorm : charNorm;
    if (shorter.length >= 3 && longer.startsWith(shorter)) {
      return true;
    }
  }

  return false;
}

export function findCharacterInList(
  searchName: string,
  characters: Character[],
  fuzzyThreshold: number = 0.7
): CharacterMatchResult {
  if (!searchName || characters.length === 0) {
    return { found: false, searchedName: searchName, allCandidates: characters };
  }

  const searchLower = searchName.toLowerCase().trim();
  const searchNormalized = normalizeCharacterName(searchName);

  for (const char of characters) {
    if (char.name.toLowerCase() === searchLower) {
      return {
        found: true,
        match: { character: char, matchType: 'exact', confidence: 1.0 },
        searchedName: searchName
      };
    }
  }

  for (const char of characters) {
    const aliases = char.aliases || [];
    for (const alias of aliases) {
      if (alias.toLowerCase() === searchLower) {
        return {
          found: true,
          match: { character: char, matchType: 'alias', confidence: 1.0 },
          searchedName: searchName
        };
      }
    }
  }

  for (const char of characters) {
    if (matchesWithHonorificVariations(searchName, char.name)) {
      return {
        found: true,
        match: { character: char, matchType: 'normalized', confidence: 0.95 },
        searchedName: searchName
      };
    }

    const aliases = char.aliases || [];
    for (const alias of aliases) {
      if (matchesWithHonorificVariations(searchName, alias)) {
        return {
          found: true,
          match: { character: char, matchType: 'normalized', confidence: 0.9 },
          searchedName: searchName
        };
      }
    }
  }

  let bestMatch: CharacterMatch | null = null;
  let bestSimilarity = 0;

  for (const char of characters) {
    const nameSimilarity = calculateSimilarity(searchName, char.name);
    if (nameSimilarity > bestSimilarity && nameSimilarity >= fuzzyThreshold) {
      bestSimilarity = nameSimilarity;
      bestMatch = { character: char, matchType: 'fuzzy', confidence: nameSimilarity };
    }

    const aliases = char.aliases || [];
    for (const alias of aliases) {
      const aliasSimilarity = calculateSimilarity(searchName, alias);
      if (aliasSimilarity > bestSimilarity && aliasSimilarity >= fuzzyThreshold) {
        bestSimilarity = aliasSimilarity;
        bestMatch = { character: char, matchType: 'fuzzy', confidence: aliasSimilarity };
      }
    }
  }

  if (bestMatch) {
    return {
      found: true,
      match: bestMatch,
      searchedName: searchName
    };
  }

  return { found: false, searchedName: searchName, allCandidates: characters };
}

export async function findCharacterByName(
  searchName: string,
  seriesId: string,
  fuzzyThreshold: number = 0.7
): Promise<CharacterMatchResult> {
  const { data: characters, error } = await supabase
    .from('characters')
    .select('*')
    .eq('series_id', seriesId);

  if (error || !characters) {
    console.error('Error fetching characters:', error);
    return { found: false, searchedName: searchName };
  }

  return findCharacterInList(searchName, characters, fuzzyThreshold);
}

export async function findAllCharactersInShot(
  characterNames: string[],
  seriesId: string
): Promise<{
  matched: CharacterMatch[];
  unmatched: string[];
  characters: Character[];
}> {
  const { data: characters, error } = await supabase
    .from('characters')
    .select('*')
    .eq('series_id', seriesId);

  if (error || !characters) {
    console.error('Error fetching characters:', error);
    return { matched: [], unmatched: characterNames, characters: [] };
  }

  const matched: CharacterMatch[] = [];
  const unmatched: string[] = [];
  const alreadyMatched = new Set<string>();

  for (const name of characterNames) {
    const result = findCharacterInList(name, characters);
    if (result.found && result.match) {
      if (!alreadyMatched.has(result.match.character.id)) {
        matched.push(result.match);
        alreadyMatched.add(result.match.character.id);
      }
    } else {
      unmatched.push(name);
    }
  }

  return { matched, unmatched, characters };
}

export function buildCharacterPromptSection(
  character: Character,
  includeDescriptionAlways: boolean = false
): string {
  const sections: string[] = [];

  sections.push(`CHARACTER: ${character.name}`);

  const hasReferenceImage = !!character.reference_image_url;

  if (character.description && (!hasReferenceImage || includeDescriptionAlways)) {
    sections.push(`PHYSICAL APPEARANCE: ${character.description}`);
  }

  const requiredFeatures = character.required_visual_features || [];
  if (requiredFeatures.length > 0) {
    sections.push(`REQUIRED FEATURES (MUST BE VISIBLE): ${requiredFeatures.join(', ')}`);
  } else if (character.description) {
    const features = extractKeyFeaturesFromDescription(character.description);
    if (features.length > 0) {
      sections.push(`KEY FEATURES: ${features.join(', ')}`);
    }
  }

  if (character.clay_features) {
    sections.push(`ANIMATION STYLE: ${character.clay_features}`);
  }

  return sections.join('. ');
}

export function extractKeyFeaturesFromDescription(description: string): string[] {
  const features: string[] = [];
  const lowerDesc = description.toLowerCase();

  const bodyPatterns = [
    /lower\s+(half|body|part)\s+(is|of)\s+(a\s+)?([^.]+)/i,
    /body\s+is\s+(a\s+)?([^.]+)/i,
    /(has|wears?)\s+(a\s+)?([^.]+)\s+(for|as)\s+(a\s+)?(body|lower body)/i,
  ];

  const headPatterns = [
    /head\s+(is|looks like)\s+(a\s+)?([^.]+)/i,
    /(wears?|has)\s+(an?\s+)?([^.]+)\s+(on|for|as)\s+(her|his|their)?\s*head/i,
    /index\s+card\s+cabinet/i,
  ];

  const accessoryPatterns = [
    /(has|wears?)\s+(a\s+)?light\s*bulb[^.]+/i,
    /(always|never)\s+(has|wears?|seen\s+without)[^.]+/i,
    /long\s+tie/i,
    /protruding\s+from[^.]+/i,
  ];

  for (const pattern of [...bodyPatterns, ...headPatterns, ...accessoryPatterns]) {
    const match = description.match(pattern);
    if (match) {
      features.push(match[0].trim());
    }
  }

  if (lowerDesc.includes('library cart')) {
    features.push('library cart lower body');
  }
  if (lowerDesc.includes('index card cabinet')) {
    features.push('index card cabinet on head');
  }
  if (lowerDesc.includes('light bulb') || lowerDesc.includes('lightbulb')) {
    features.push('lightbulb feature');
  }
  if (lowerDesc.includes('long tie')) {
    features.push('long tie');
  }
  if (lowerDesc.includes('wheels')) {
    features.push('wheels');
  }

  return [...new Set(features)];
}

export function buildReferenceImageInstruction(
  characters: Character[],
  loadedCharacterNames: string[]
): string {
  if (loadedCharacterNames.length === 0) return '';

  const instructions: string[] = [
    'CRITICAL CHARACTER REFERENCE IMAGES PROVIDED:',
    ''
  ];

  for (const name of loadedCharacterNames) {
    const char = characters.find(c => c.name === name);
    if (char) {
      const features = char.required_visual_features?.length
        ? char.required_visual_features
        : extractKeyFeaturesFromDescription(char.description || '');

      instructions.push(`- ${char.name}: Reference image shows EXACT appearance. `);
      if (features.length > 0) {
        instructions.push(`  CRITICAL FEATURES TO PRESERVE: ${features.join(', ')}`);
      }
      if (char.description) {
        instructions.push(`  Physical Description: ${char.description}`);
      }
    }
  }

  instructions.push('');
  instructions.push('You MUST replicate these characters EXACTLY as shown in their reference images.');
  instructions.push('Do NOT modify, simplify, or reimagine any character features.');
  instructions.push('Each character MUST be clearly identifiable by their unique physical traits.');

  return instructions.join('\n');
}

export async function validateShotCharacters(
  characterNames: string[],
  seriesId: string
): Promise<{
  valid: boolean;
  matchedCharacters: Character[];
  unmatchedNames: string[];
  warnings: string[];
  errors: string[];
}> {
  const result = await findAllCharactersInShot(characterNames, seriesId);

  const warnings: string[] = [];
  const errors: string[] = [];

  if (result.unmatched.length > 0) {
    errors.push(`Characters not found in database: ${result.unmatched.join(', ')}`);
  }

  for (const match of result.matched) {
    const char = match.character;
    if (!char.reference_image_url && !char.description) {
      warnings.push(`${char.name} has no reference image or description - may render incorrectly`);
    } else if (!char.reference_image_url) {
      warnings.push(`${char.name} has no reference image - using description only`);
    }

    if (match.matchType === 'fuzzy' && match.confidence < 0.85) {
      warnings.push(`"${match.character.name}" matched with low confidence (${Math.round(match.confidence * 100)}%) - verify this is correct`);
    }
  }

  return {
    valid: errors.length === 0,
    matchedCharacters: result.matched.map(m => m.character),
    unmatchedNames: result.unmatched,
    warnings,
    errors
  };
}
