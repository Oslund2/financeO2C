import { supabase } from '../lib/supabase';
import {
  isRateLimitError,
  recordSuccessfulRequest,
  recordFailedRequest,
  waitForRateLimit,
  getRateLimitStatus
} from './rateLimitingService';

export interface CharacterReference {
  name: string;
  imageUrl: string;
  description?: string;
  requiredFeatures?: string[];
}

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio?: '16:9' | '1:1' | '9:16';
  outputFormat?: 'image/png' | 'image/jpeg';
  numberOfImages?: number;
  characterReferences?: CharacterReference[];
}

export interface ImageGenerationResult {
  imageUrl: string;
  thumbnailUrl: string;
  generationTime: number;
  estimatedCost: number;
}

export interface GenerationError {
  type: 'rate_limit' | 'api_error' | 'network' | 'unknown';
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
}

const NANO_BANANA_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
const ESTIMATED_COST_PER_IMAGE = 0.02;
const MAX_RETRIES = 3;
const RETRY_DELAY = 4000;
const RATE_LIMIT_RETRY_DELAY = 10000;

export function checkNanoBananaConfiguration(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    missing.push('VITE_GEMINI_API_KEY');
  }

  return {
    configured: missing.length === 0,
    missing
  };
}

export function isNanoBananaAvailable(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const imageCache = new Map<string, { base64: string; mimeType: string }>();

async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  if (imageCache.has(imageUrl)) {
    return imageCache.get(imageUrl)!;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch reference image: ${imageUrl}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const mimeType = contentType.split(';')[0].trim();

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    const result = { base64, mimeType };
    imageCache.set(imageUrl, result);
    return result;
  } catch (error) {
    console.warn(`Error fetching reference image ${imageUrl}:`, error);
    return null;
  }
}

export function clearImageCache(): void {
  imageCache.clear();
}

async function uploadImageToStorage(
  imageBase64: string,
  storyboardId: string,
  actNumber: number,
  shotNumber: number
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

  const fileName = `act-${actNumber}/shot-${shotNumber.toString().padStart(3, '0')}.png`;
  const filePath = `${storyboardId}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('storyboard-images')
    .upload(filePath, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('storyboard-images')
    .getPublicUrl(filePath);

  return {
    imageUrl: publicUrl,
    thumbnailUrl: publicUrl
  };
}

export function parseGenerationError(error: unknown): GenerationError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('429') || message.includes('rate limit') || message.includes('quota') || message.includes('resource_exhausted')) {
      return {
        type: 'rate_limit',
        message: 'API rate limit reached. Please wait before generating more images.',
        retryable: true,
        retryAfterMs: RATE_LIMIT_RETRY_DELAY
      };
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: 'network',
        message: 'Network error. Please check your connection and try again.',
        retryable: true,
        retryAfterMs: RETRY_DELAY
      };
    }

    if (message.includes('api error') || message.includes('500') || message.includes('503')) {
      return {
        type: 'api_error',
        message: 'The image generation service is temporarily unavailable. Please try again later.',
        retryable: true,
        retryAfterMs: RETRY_DELAY * 2
      };
    }

    return {
      type: 'unknown',
      message: error.message,
      retryable: false
    };
  }

  return {
    type: 'unknown',
    message: 'An unexpected error occurred',
    retryable: false
  };
}

export async function generateStoryboardImage(
  options: ImageGenerationOptions,
  storyboardId: string,
  actNumber: number,
  shotNumber: number,
  retryCount = 0
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  await waitForRateLimit();

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in environment variables.');
  }

  const aspectRatioMap = {
    '16:9': '16:9',
    '1:1': '1:1',
    '9:16': '9:16'
  };

  const parts: any[] = [];
  const characterRefs = options.characterReferences || [];
  const loadedReferences: { name: string; loaded: boolean }[] = [];

  if (characterRefs.length > 0) {
    const loadedCharacterData: { name: string; description?: string; features?: string[] }[] = [];

    for (const ref of characterRefs) {
      const imageData = await fetchImageAsBase64(ref.imageUrl);
      if (imageData) {
        parts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.base64
          }
        });
        loadedReferences.push({ name: ref.name, loaded: true });
        loadedCharacterData.push({
          name: ref.name,
          description: ref.description,
          features: ref.requiredFeatures
        });
      } else {
        loadedReferences.push({ name: ref.name, loaded: false });
      }
    }

    const loadedNames = loadedReferences.filter(r => r.loaded).map(r => r.name);
    if (loadedNames.length > 0) {
      const characterInstructions: string[] = [
        '=== CRITICAL CHARACTER REFERENCE IMAGES ===',
        '',
        `Reference images provided for: ${loadedNames.join(', ')}`,
        '',
        'MANDATORY REQUIREMENTS:',
        '1. Each character MUST be rendered EXACTLY as shown in their reference image',
        '2. ALL unique physical features MUST be preserved - do NOT simplify or modify',
        '3. Character proportions, colors, and distinctive traits MUST match exactly',
        '4. These images are for animation production - consistency is ESSENTIAL',
        ''
      ];

      for (const charData of loadedCharacterData) {
        characterInstructions.push(`CHARACTER: ${charData.name}`);
        if (charData.features && charData.features.length > 0) {
          characterInstructions.push(`  REQUIRED FEATURES (MUST BE VISIBLE): ${charData.features.join(', ')}`);
        }
        if (charData.description) {
          characterInstructions.push(`  Physical Description: ${charData.description}`);
        }
        characterInstructions.push('');
      }

      characterInstructions.push('WARNING: Do NOT render generic characters. Each character has unique physical traits that MUST appear.');
      characterInstructions.push('');

      parts.push({
        text: characterInstructions.join('\n') + '\n'
      });
    }
  }

  parts.push({ text: options.prompt });

  const requestBody = {
    contents: [{
      role: 'user',
      parts
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatioMap[options.aspectRatio || '16:9']
      }
    }
  };

  try {
    const response = await fetch(`${NANO_BANANA_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `API error: ${response.status} - ${errorText}`;

      if (response.status === 429) {
        recordFailedRequest();
        throw new Error(`Rate limit exceeded: ${errorText}`);
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No image generated in response');
    }

    const imagePart = data.candidates[0].content.parts.find((part: any) => part.inlineData);

    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      throw new Error('No image data found in response');
    }

    const imageBase64 = imagePart.inlineData.data;

    const { imageUrl, thumbnailUrl } = await uploadImageToStorage(
      imageBase64,
      storyboardId,
      actNumber,
      shotNumber
    );

    const generationTime = Date.now() - startTime;

    recordSuccessfulRequest();

    return {
      imageUrl,
      thumbnailUrl,
      generationTime,
      estimatedCost: ESTIMATED_COST_PER_IMAGE
    };

  } catch (error) {
    console.error(`Image generation failed (attempt ${retryCount + 1}):`, error);

    const parsedError = parseGenerationError(error);

    if (parsedError.retryable && retryCount < MAX_RETRIES) {
      recordFailedRequest();

      const delay = parsedError.type === 'rate_limit'
        ? RATE_LIMIT_RETRY_DELAY * Math.pow(1.5, retryCount)
        : RETRY_DELAY * Math.pow(2, retryCount);

      console.log(`Retrying in ${Math.round(delay / 1000)}s (${parsedError.type} error)...`);
      await sleep(delay);
      return generateStoryboardImage(options, storyboardId, actNumber, shotNumber, retryCount + 1);
    }

    throw new Error(parsedError.message);
  }
}

export { getRateLimitStatus };

async function uploadImageToProductionAssets(
  imageBase64: string,
  assetType: string,
  assetId: string
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

  const timestamp = Date.now();
  const fileName = `${assetType}/${assetId}-${timestamp}.png`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('production-assets')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('production-assets')
    .getPublicUrl(fileName);

  return {
    imageUrl: publicUrl,
    thumbnailUrl: publicUrl
  };
}

export async function generateAssetImage(
  options: ImageGenerationOptions,
  assetType: string,
  retryCount = 0
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  await waitForRateLimit();

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in environment variables.');
  }

  const aspectRatioMap = {
    '16:9': '16:9',
    '1:1': '1:1',
    '9:16': '9:16'
  };

  const parts: any[] = [];
  const characterRefs = options.characterReferences || [];
  const loadedReferences: { name: string; loaded: boolean }[] = [];

  if (characterRefs.length > 0) {
    for (const ref of characterRefs) {
      const imageData = await fetchImageAsBase64(ref.imageUrl);
      if (imageData) {
        parts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.base64
          }
        });
        loadedReferences.push({ name: ref.name, loaded: true });
      } else {
        loadedReferences.push({ name: ref.name, loaded: false });
      }
    }

    const loadedNames = loadedReferences.filter(r => r.loaded).map(r => r.name);
    if (loadedNames.length > 0) {
      parts.push({
        text: `CRITICAL: Reference images provided for: ${loadedNames.join(', ')}. You MUST use these reference images to ensure EXACT visual consistency. All elements MUST match their reference images in appearance, proportions, colors, features, and style. This is essential for animation production continuity.\n\n`
      });
    }
  }

  parts.push({ text: options.prompt });

  const requestBody = {
    contents: [{
      role: 'user',
      parts
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatioMap[options.aspectRatio || '1:1']
      }
    }
  };

  try {
    const response = await fetch(`${NANO_BANANA_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `API error: ${response.status} - ${errorText}`;

      if (response.status === 429) {
        recordFailedRequest();
        throw new Error(`Rate limit exceeded: ${errorText}`);
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No image generated in response');
    }

    const imagePart = data.candidates[0].content.parts.find((part: any) => part.inlineData);

    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      throw new Error('No image data found in response');
    }

    const imageBase64 = imagePart.inlineData.data;

    const assetId = crypto.randomUUID();
    const { imageUrl, thumbnailUrl } = await uploadImageToProductionAssets(
      imageBase64,
      assetType,
      assetId
    );

    const generationTime = Date.now() - startTime;

    recordSuccessfulRequest();

    return {
      imageUrl,
      thumbnailUrl,
      generationTime,
      estimatedCost: ESTIMATED_COST_PER_IMAGE
    };

  } catch (error) {
    console.error(`Image generation failed (attempt ${retryCount + 1}):`, error);

    const parsedError = parseGenerationError(error);

    if (parsedError.retryable && retryCount < MAX_RETRIES) {
      recordFailedRequest();

      const delay = parsedError.type === 'rate_limit'
        ? RATE_LIMIT_RETRY_DELAY * Math.pow(1.5, retryCount)
        : RETRY_DELAY * Math.pow(2, retryCount);

      console.log(`Retrying in ${Math.round(delay / 1000)}s (${parsedError.type} error)...`);
      await sleep(delay);
      return generateAssetImage(options, assetType, retryCount + 1);
    }

    throw new Error(parsedError.message);
  }
}

export async function uploadManualImage(
  file: File,
  storyboardId: string,
  actNumber: number,
  shotNumber: number
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  if (!validFormats.includes(file.type)) {
    throw new Error('Invalid file format. Please upload PNG, JPG, or WEBP images.');
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit.');
  }

  const fileName = `act-${actNumber}/shot-${shotNumber.toString().padStart(3, '0')}-manual.${file.type.split('/')[1]}`;
  const filePath = `${storyboardId}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('storyboard-images')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('storyboard-images')
    .getPublicUrl(filePath);

  return {
    imageUrl: publicUrl,
    thumbnailUrl: publicUrl
  };
}

export async function uploadManualReferenceImage(
  file: File,
  shotId: string,
  notes?: string
): Promise<{ imageUrl: string }> {
  const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  if (!validFormats.includes(file.type)) {
    throw new Error('Invalid file format. Please upload PNG, JPG, or WEBP images.');
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit.');
  }

  const { data: shot, error: shotError } = await supabase
    .from('storyboard_shots')
    .select('storyboard_id, shot_number, scene_id')
    .eq('id', shotId)
    .single();

  if (shotError || !shot) {
    throw new Error('Shot not found');
  }

  const { data: scene } = await supabase
    .from('script_scenes')
    .select('script_acts(act_number)')
    .eq('id', shot.scene_id)
    .single();

  const actNumber = (scene as any)?.script_acts?.act_number || 1;

  const fileName = `act-${actNumber}/shot-${shot.shot_number.toString().padStart(3, '0')}-reference-manual.${file.type.split('/')[1]}`;
  const filePath = `${shot.storyboard_id}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('storyboard-images')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Failed to upload reference image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('storyboard-images')
    .getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from('storyboard_shots')
    .update({
      manual_reference_image_url: publicUrl,
      use_manual_reference: true,
      manual_upload_notes: notes || 'Manual reference uploaded for improved character consistency',
      updated_at: new Date().toISOString()
    })
    .eq('id', shotId);

  if (updateError) {
    throw new Error(`Failed to update shot with reference image: ${updateError.message}`);
  }

  return {
    imageUrl: publicUrl
  };
}

export function calculateEstimatedCost(numberOfShots: number): number {
  return numberOfShots * ESTIMATED_COST_PER_IMAGE;
}

export interface BulkUploadFile {
  file: File;
  actNumber: number;
  shotNumber: number;
  matched: boolean;
}

export function parseUploadFileNames(files: FileList): BulkUploadFile[] {
  const parsedFiles: BulkUploadFile[] = [];

  const fileNameRegex = /act[-_]?(\d+)[-_]shot[-_]?(\d+)/i;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const match = file.name.match(fileNameRegex);

    if (match) {
      parsedFiles.push({
        file,
        actNumber: parseInt(match[1], 10),
        shotNumber: parseInt(match[2], 10),
        matched: true
      });
    } else {
      parsedFiles.push({
        file,
        actNumber: 0,
        shotNumber: 0,
        matched: false
      });
    }
  }

  return parsedFiles;
}
