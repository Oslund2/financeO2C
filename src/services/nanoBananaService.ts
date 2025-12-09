import { supabase } from '../lib/supabase';

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio?: '16:9' | '1:1' | '9:16';
  outputFormat?: 'image/png' | 'image/jpeg';
  numberOfImages?: number;
}

export interface ImageGenerationResult {
  imageUrl: string;
  thumbnailUrl: string;
  generationTime: number;
  estimatedCost: number;
}

const NANO_BANANA_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
const ESTIMATED_COST_PER_IMAGE = 0.02;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

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

export async function generateStoryboardImage(
  options: ImageGenerationOptions,
  storyboardId: string,
  actNumber: number,
  shotNumber: number,
  retryCount = 0
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in environment variables.');
  }

  const aspectRatioMap = {
    '16:9': '16:9',
    '1:1': '1:1',
    '9:16': '9:16'
  };

  const requestBody = {
    contents: [{
      role: 'user',
      parts: [{ text: options.prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      responseModalities: ['image'],
      imageGenerationConfig: {
        aspectRatio: aspectRatioMap[options.aspectRatio || '16:9'],
        numberOfImages: options.numberOfImages || 1
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
      throw new Error(`Nano Banana API error: ${response.status} - ${errorText}`);
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

    return {
      imageUrl,
      thumbnailUrl,
      generationTime,
      estimatedCost: ESTIMATED_COST_PER_IMAGE
    };

  } catch (error) {
    console.error(`Image generation failed (attempt ${retryCount + 1}):`, error);

    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
      return generateStoryboardImage(options, storyboardId, actNumber, shotNumber, retryCount + 1);
    }

    throw error;
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
