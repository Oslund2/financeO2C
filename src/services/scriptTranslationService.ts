import { supabase } from '../lib/supabase';
import { generateText } from './geminiService';
import { trackGeminiUsage } from './geminiUsageTrackingService';

const RATE_LIMIT_DELAY = parseInt(import.meta.env.VITE_GEMINI_RATE_LIMIT_DELAY || '100', 10);
const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

interface TranslationProgress {
  totalItems: number;
  completedItems: number;
  percentage: number;
}

interface DialogueLine {
  character?: string;
  text: string;
  [key: string]: any;
}

export interface ScriptTranslationStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateWithRetry(
  text: string,
  targetLanguage: string,
  context?: string,
  organizationId?: string,
  scriptId?: string,
  retries = MAX_RETRIES
): Promise<string> {
  const startTime = Date.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await delay(RATE_LIMIT_DELAY);

      const prompt = `Translate the following text to ${targetLanguage}. ${
        context ? `Context: ${context}. ` : ''
      }Maintain the tone, style, and formatting. Only return the translated text, nothing else.

Text to translate:
${text}`;

      const result = await generateText(prompt);
      const latencyMs = Date.now() - startTime;

      await trackGeminiUsage({
        organizationId,
        operationType: 'translation',
        modelUsed: 'gemini-2.5-flash',
        inputText: prompt,
        outputText: result,
        success: true,
        latencyMs,
        metadata: {
          script_id: scriptId,
          target_language: targetLanguage,
          context
        }
      });

      return result.trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isQuotaError = errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError && attempt < retries) {
        const backoffDelay = RATE_LIMIT_DELAY * Math.pow(2, attempt);
        console.log(`Quota error detected. Retrying in ${backoffDelay}ms (attempt ${attempt}/${retries})...`);
        await delay(backoffDelay);
        continue;
      }

      if (attempt === retries) {
        const latencyMs = Date.now() - startTime;
        await trackGeminiUsage({
          organizationId,
          operationType: 'translation',
          modelUsed: 'gemini-2.5-flash',
          inputText: text,
          success: false,
          errorMessage,
          latencyMs,
          metadata: {
            script_id: scriptId,
            target_language: targetLanguage,
            context
          }
        });

        throw new Error(`Translation failed after ${retries} attempts: ${errorMessage}`);
      }
    }
  }

  throw new Error('Translation failed: Maximum retries exceeded');
}

async function translateDialogueBatch(
  dialogueLines: DialogueLine[],
  targetLanguage: string,
  organizationId?: string,
  scriptId?: string
): Promise<DialogueLine[]> {
  if (dialogueLines.length === 0) return [];

  if (dialogueLines.length === 1) {
    const translatedText = await translateWithRetry(
      dialogueLines[0].text,
      targetLanguage,
      `Dialogue spoken by character: ${dialogueLines[0].character || 'unknown'}`,
      organizationId,
      scriptId
    );
    return [{ ...dialogueLines[0], text: translatedText }];
  }

  const batchText = dialogueLines
    .map((line, idx) => `[LINE ${idx + 1}] ${line.character || 'NARRATOR'}: ${line.text}`)
    .join('\n\n');

  const prompt = `Translate the following dialogue lines to ${targetLanguage}.
Maintain the exact format: [LINE X] CHARACTER: translated dialogue
Preserve character names exactly as shown.
Only return the translated lines, nothing else.

Dialogue to translate:
${batchText}`;

  try {
    await delay(RATE_LIMIT_DELAY);
    const result = await generateText(prompt);

    const translatedLines = result.trim().split('\n\n');
    const parsed: DialogueLine[] = [];

    for (let i = 0; i < dialogueLines.length; i++) {
      const translatedLine = translatedLines[i];
      if (translatedLine) {
        const match = translatedLine.match(/\[LINE \d+\]\s*([^:]+):\s*(.+)/);
        if (match) {
          parsed.push({ ...dialogueLines[i], text: match[2].trim() });
        } else {
          parsed.push({ ...dialogueLines[i], text: translatedLine });
        }
      } else {
        parsed.push(dialogueLines[i]);
      }
    }

    return parsed.length === dialogueLines.length ? parsed : dialogueLines;
  } catch (error) {
    console.warn('Batch translation failed, falling back to individual translation:', error);
    const results: DialogueLine[] = [];
    for (const line of dialogueLines) {
      const translatedText = await translateWithRetry(
        line.text,
        targetLanguage,
        `Dialogue spoken by character: ${line.character || 'unknown'}`,
        organizationId,
        scriptId
      );
      results.push({ ...line, text: translatedText });
    }
    return results;
  }
}

export class ScriptTranslationService {
  private static async getScriptContent(scriptId: string) {
    const { data: script, error: scriptError } = await supabase
      .from('scripts')
      .select('*')
      .eq('id', scriptId)
      .single();

    if (scriptError) throw scriptError;

    const { data: acts, error: actsError } = await supabase
      .from('script_acts')
      .select('*')
      .eq('script_id', scriptId)
      .order('act_number', { ascending: true });

    if (actsError) throw actsError;

    const actsWithScenes = await Promise.all(
      (acts || []).map(async (act) => {
        const { data: scenes, error: scenesError } = await supabase
          .from('script_scenes')
          .select('*')
          .eq('act_id', act.id)
          .order('scene_number', { ascending: true });

        if (scenesError) throw scenesError;

        return {
          ...act,
          scenes: scenes || []
        };
      })
    );

    return { script, acts: actsWithScenes };
  }

  private static async translateText(
    text: string,
    targetLanguage: string,
    context?: string,
    organizationId?: string,
    scriptId?: string
  ): Promise<string> {
    return translateWithRetry(text, targetLanguage, context, organizationId, scriptId);
  }

  private static async updateTranslationProgress(
    translationId: string,
    progress: number,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    errorMessage?: string
  ) {
    await supabase
      .from('script_translations')
      .update({
        progress_percentage: progress,
        status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', translationId);
  }

  static async translateScript(
    scriptId: string,
    languageCode: string,
    languageName: string,
    onProgress?: (progress: TranslationProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { script, acts } = await this.getScriptContent(scriptId);
      const organizationId = script.organization_id || undefined;

      const { data: existingTranslation } = await supabase
        .from('script_translations')
        .select('id, status')
        .eq('script_id', scriptId)
        .eq('language_code', languageCode)
        .maybeSingle();

      let translationId: string;

      if (existingTranslation) {
        if (existingTranslation.status === 'in_progress') {
          return { success: false, error: 'Translation already in progress' };
        }
        translationId = existingTranslation.id;
        await this.updateTranslationProgress(translationId, 0, 'in_progress');
      } else {
        const { data: newTranslation, error: createError } = await supabase
          .from('script_translations')
          .insert({
            script_id: scriptId,
            language_code: languageCode,
            language_name: languageName,
            translated_title: script.title,
            translated_synopsis: script.synopsis,
            translated_theme: script.theme,
            status: 'in_progress',
            progress_percentage: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        translationId = newTranslation.id;
      }

      const totalScenes = acts.reduce((sum, act) => sum + act.scenes.length, 0);
      const totalItems = 3 + acts.length + totalScenes;
      let completedItems = 0;

      const updateProgress = () => {
        completedItems++;
        const percentage = Math.round((completedItems / totalItems) * 100);
        this.updateTranslationProgress(translationId, percentage, 'in_progress');
        if (onProgress) {
          onProgress({ totalItems, completedItems, percentage });
        }
      };

      const translatedTitle = await this.translateText(
        script.title,
        languageName,
        'This is a script title for an animated series',
        organizationId,
        scriptId
      );
      updateProgress();

      const translatedSynopsis = script.synopsis
        ? await this.translateText(
            script.synopsis,
            languageName,
            'This is a script synopsis',
            organizationId,
            scriptId
          )
        : null;
      updateProgress();

      const translatedTheme = script.theme
        ? await this.translateText(
            script.theme,
            languageName,
            'This is a script theme',
            organizationId,
            scriptId
          )
        : null;
      updateProgress();

      await supabase
        .from('script_translations')
        .update({
          translated_title: translatedTitle,
          translated_synopsis: translatedSynopsis,
          translated_theme: translatedTheme
        })
        .eq('id', translationId);

      for (const act of acts) {
        const translatedContent = await this.translateText(
          act.content || '',
          languageName,
          `This is Act ${act.act_number} of a script`,
          organizationId,
          scriptId
        );

        const translatedNotes = act.notes
          ? await this.translateText(act.notes, languageName, 'These are act notes', organizationId, scriptId)
          : null;

        await supabase.from('script_act_translations').upsert({
          act_id: act.id,
          language_code: languageCode,
          translated_content: translatedContent,
          translated_notes: translatedNotes
        });

        updateProgress();

        for (const scene of act.scenes) {
          const translatedSetting = await this.translateText(
            scene.setting || '',
            languageName,
            'This is a scene setting/location',
            organizationId,
            scriptId
          );

          const translatedDescription = await this.translateText(
            scene.description || '',
            languageName,
            'This is a scene description',
            organizationId,
            scriptId
          );

          let translatedDialogue = scene.dialogue;
          if (scene.dialogue && typeof scene.dialogue === 'object') {
            if (Array.isArray(scene.dialogue)) {
              const dialogueLines: DialogueLine[] = scene.dialogue.filter(
                (line: any) => typeof line === 'object' && line.text
              );

              if (dialogueLines.length > 0) {
                const batches: DialogueLine[][] = [];
                for (let i = 0; i < dialogueLines.length; i += BATCH_SIZE) {
                  batches.push(dialogueLines.slice(i, i + BATCH_SIZE));
                }

                const translatedBatches = await Promise.all(
                  batches.map(batch => translateDialogueBatch(batch, languageName, organizationId, scriptId))
                );

                translatedDialogue = translatedBatches.flat();
              }
            }
          }

          const translatedStageDirections = scene.stage_directions
            ? await this.translateText(
                scene.stage_directions,
                languageName,
                'These are stage directions',
                organizationId,
                scriptId
              )
            : null;

          await supabase.from('script_scene_translations').upsert({
            scene_id: scene.id,
            language_code: languageCode,
            translated_setting: translatedSetting,
            translated_description: translatedDescription,
            translated_dialogue: translatedDialogue,
            translated_stage_directions: translatedStageDirections
          });

          updateProgress();
        }
      }

      await this.updateTranslationProgress(translationId, 100, 'completed');

      return { success: true };
    } catch (error) {
      console.error('Translation error:', error);
      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'Translation failed: Gemini API quota exceeded. Please try again later or contact support if the issue persists. Using Gemini 2.5 Flash model.';
      } else if (errorMessage.includes('API error')) {
        errorMessage = `Translation service error: ${errorMessage}. Please check your API configuration.`;
      }

      return { success: false, error: errorMessage };
    }
  }

  static async getTranslationStatus(
    scriptId: string,
    languageCode: string
  ): Promise<ScriptTranslationStatus | null> {
    const { data, error } = await supabase
      .from('script_translations')
      .select('status, progress_percentage, error_message')
      .eq('script_id', scriptId)
      .eq('language_code', languageCode)
      .maybeSingle();

    if (error || !data) return null;

    return {
      status: data.status as 'pending' | 'in_progress' | 'completed' | 'failed',
      progress: data.progress_percentage,
      errorMessage: data.error_message || undefined
    };
  }

  static async getTranslatedScript(scriptId: string, languageCode: string) {
    const { data: translation, error: translationError } = await supabase
      .from('script_translations')
      .select('*')
      .eq('script_id', scriptId)
      .eq('language_code', languageCode)
      .maybeSingle();

    if (translationError || !translation) return null;

    const { data: acts, error: actsError } = await supabase
      .from('script_acts')
      .select('*')
      .eq('script_id', scriptId)
      .order('act_number', { ascending: true });

    if (actsError) return null;

    const translatedActs = await Promise.all(
      (acts || []).map(async (act) => {
        const { data: actTranslation } = await supabase
          .from('script_act_translations')
          .select('*')
          .eq('act_id', act.id)
          .eq('language_code', languageCode)
          .maybeSingle();

        const { data: scenes } = await supabase
          .from('script_scenes')
          .select('*')
          .eq('act_id', act.id)
          .order('scene_number', { ascending: true });

        const translatedScenes = await Promise.all(
          (scenes || []).map(async (scene) => {
            const { data: sceneTranslation } = await supabase
              .from('script_scene_translations')
              .select('*')
              .eq('scene_id', scene.id)
              .eq('language_code', languageCode)
              .maybeSingle();

            return {
              ...scene,
              setting: sceneTranslation?.translated_setting || scene.setting,
              description: sceneTranslation?.translated_description || scene.description,
              dialogue: sceneTranslation?.translated_dialogue || scene.dialogue,
              stage_directions: sceneTranslation?.translated_stage_directions || scene.stage_directions
            };
          })
        );

        return {
          ...act,
          content: actTranslation?.translated_content || act.content,
          notes: actTranslation?.translated_notes || act.notes,
          scenes: translatedScenes
        };
      })
    );

    return {
      ...translation,
      acts: translatedActs
    };
  }

  static async deleteTranslation(scriptId: string, languageCode: string): Promise<boolean> {
    const { error } = await supabase
      .from('script_translations')
      .delete()
      .eq('script_id', scriptId)
      .eq('language_code', languageCode);

    return !error;
  }

  static async getAllTranslations(scriptId: string) {
    const { data, error } = await supabase
      .from('script_translations')
      .select('*')
      .eq('script_id', scriptId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }
}
