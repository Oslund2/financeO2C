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
  text?: string;
  line?: string;
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

      const prompt = `You are a professional translator. Translate the following text COMPLETELY to ${targetLanguage}. ${
        context ? `Context: ${context}. ` : ''
      }

TRANSLATION REQUIREMENTS:
1. Translate EVERY word to ${targetLanguage} - do NOT leave anything in English
2. Preserve ALL character names exactly as they appear (Mrs. Higginbottom, Barnaby, Emma, Zora, Chad, Pickle, Sesquipedalian, etc.) - NEVER translate character names
3. Maintain the original tone, style, and formatting
4. The entire output MUST be in ${targetLanguage}, except for character names
5. If you see brackets like [text], translate the text inside but keep the brackets

CRITICAL: Return ONLY the translated text with no explanations, notes, or English text.

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

  console.log(`[Translation] Translating batch of ${dialogueLines.length} dialogue lines to ${targetLanguage}`);

  if (dialogueLines.length === 1) {
    const dialogueText = dialogueLines[0].text || dialogueLines[0].line || '';
    console.log(`[Translation] Single line translation: "${dialogueText.substring(0, 50)}..."`);

    const translatedText = await translateWithRetry(
      dialogueText,
      targetLanguage,
      `Dialogue spoken by character: ${dialogueLines[0].character || 'unknown'}. Translate ONLY the dialogue text, do NOT translate the character name.`,
      organizationId,
      scriptId
    );

    console.log(`[Translation] Translated to: "${translatedText.substring(0, 50)}..."`);

    // Preserve the original property name (text or line)
    const result = { ...dialogueLines[0] };
    if (dialogueLines[0].line !== undefined) {
      result.line = translatedText;
    } else {
      result.text = translatedText;
    }
    return [result];
  }

  const batchText = dialogueLines
    .map((line, idx) => {
      const dialogueText = line.text || line.line || '';
      return `[LINE ${idx + 1}] ${line.character || 'NARRATOR'}: ${dialogueText}`;
    })
    .join('\n\n');

  const prompt = `You are translating dialogue from an animated script to ${targetLanguage}.

CRITICAL TRANSLATION RULES:
1. Translate EVERY dialogue line completely to ${targetLanguage}
2. Maintain the exact format: [LINE X] CHARACTER: translated dialogue
3. Preserve ALL character names EXACTLY as shown (Mrs. Higginbottom, Barnaby, Zora, Emma, Chad, Pickle, Sesquipedalian, etc.) - NEVER translate character names
4. Translate ONLY the dialogue text after the colon, NOT the character names
5. Keep the line numbers and formatting identical
6. Return ALL lines, do not skip any

IMPORTANT: The output MUST be in ${targetLanguage}, not English. Translate every word of dialogue.

Only return the translated lines in the exact same format, nothing else.

Dialogue to translate:
${batchText}`;

  try {
    await delay(RATE_LIMIT_DELAY);
    const result = await generateText(prompt);

    console.log(`[Translation] Batch translation result preview: "${result.substring(0, 100)}..."`);

    // Parse all [LINE X] markers from the entire result
    const parsed: DialogueLine[] = [];

    for (let i = 0; i < dialogueLines.length; i++) {
      const lineNum = i + 1;
      // Match this specific line number with flexible whitespace handling
      const linePattern = new RegExp(`\\[LINE ${lineNum}\\]\\s*([^:]+):\\s*([^\\[]+?)(?=\\[LINE ${lineNum + 1}\\]|$)`, 's');
      const match = result.match(linePattern);

      if (match) {
        const translatedText = match[2].trim();

        // Preserve the original property name (text or line)
        const resultObj = { ...dialogueLines[i] };
        if (dialogueLines[i].line !== undefined) {
          resultObj.line = translatedText;
        } else {
          resultObj.text = translatedText;
        }
        parsed.push(resultObj);
        console.log(`[Translation] Line ${i + 1} translated: "${dialogueLines[i].character}": "${translatedText.substring(0, 40)}..."`);
      } else {
        console.warn(`[Translation] Missing translation for line ${i + 1}, keeping original`);
        parsed.push(dialogueLines[i]);
      }
    }

    if (parsed.length !== dialogueLines.length) {
      console.error(`[Translation] Mismatch in line count: expected ${dialogueLines.length}, got ${parsed.length}`);
      throw new Error('Line count mismatch in batch translation');
    }

    return parsed;
  } catch (error) {
    console.warn('[Translation] Batch translation failed, falling back to individual translation:', error);
    const results: DialogueLine[] = [];
    for (const line of dialogueLines) {
      const dialogueText = line.text || line.line || '';
      console.log(`[Translation] Individually translating: "${line.character}": "${dialogueText.substring(0, 40)}..."`);

      const translatedText = await translateWithRetry(
        dialogueText,
        targetLanguage,
        `Dialogue spoken by character: ${line.character || 'unknown'}. Translate ONLY the dialogue text to ${targetLanguage}, do NOT translate the character name.`,
        organizationId,
        scriptId
      );

      console.log(`[Translation] Individual translation result: "${translatedText.substring(0, 40)}..."`);

      // Preserve the original property name (text or line)
      const result = { ...line };
      if (line.line !== undefined) {
        result.line = translatedText;
      } else {
        result.text = translatedText;
      }
      results.push(result);
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
      console.log(`\n========================================`);
      console.log(`[Translation] Starting translation of script ${scriptId} to ${languageName} (${languageCode})`);
      console.log(`========================================\n`);

      const { script, acts } = await this.getScriptContent(scriptId);
      const organizationId = script.organization_id || undefined;

      console.log(`[Translation] Script loaded: "${script.title}"`);
      console.log(`[Translation] Total acts: ${acts.length}`);
      console.log(`[Translation] Total scenes: ${acts.reduce((sum, act) => sum + act.scenes.length, 0)}`);

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
        try {
          console.log(`\n[Translation] === Translating Act ${act.act_number} (${act.scenes.length} scenes) ===`);

          const translatedContent = await this.translateText(
            act.content || '',
            languageName,
            `This is Act ${act.act_number} of a script. Translate it completely.`,
            organizationId,
            scriptId
          );

          console.log(`[Translation] Act ${act.act_number} content translated: "${translatedContent.substring(0, 50)}..."`);


          const translatedNotes = act.notes
            ? await this.translateText(act.notes, languageName, 'These are act notes', organizationId, scriptId)
            : null;

          await supabase
            .from('script_act_translations')
            .upsert(
              {
                act_id: act.id,
                language_code: languageCode,
                translated_content: translatedContent,
                translated_notes: translatedNotes
              },
              {
                onConflict: 'act_id,language_code'
              }
            );

          updateProgress();
        } catch (actError) {
          console.error(`[Translation] ERROR in Act ${act.act_number}:`, actError);
          throw new Error(`Act ${act.act_number} failed: ${actError instanceof Error ? actError.message : 'Unknown error'}`);
        }

        for (const scene of act.scenes) {
          try {
            console.log(`\n[Translation] === Translating Scene ${scene.scene_number} ===`);

            // Translate setting
            console.log(`[Translation] Setting (original): "${(scene.setting || '').substring(0, 50)}..."`);
            let translatedSetting = '';
            try {
              translatedSetting = await this.translateText(
                scene.setting || '',
                languageName,
                'This is a scene setting/location description. Translate it completely.',
                organizationId,
                scriptId
              );
              console.log(`[Translation] Setting (translated): "${translatedSetting.substring(0, 50)}..."`);
            } catch (error) {
              console.error(`[Translation] ERROR translating setting for scene ${scene.scene_number}:`, error);
              throw new Error(`Failed to translate setting for scene ${scene.scene_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // Translate description
            console.log(`[Translation] Description (original): "${(scene.description || '').substring(0, 50)}..."`);
            let translatedDescription = '';
            try {
              translatedDescription = await this.translateText(
                scene.description || '',
                languageName,
                'This is a scene description. Translate it completely.',
                organizationId,
                scriptId
              );
              console.log(`[Translation] Description (translated): "${translatedDescription.substring(0, 50)}..."`);
            } catch (error) {
              console.error(`[Translation] ERROR translating description for scene ${scene.scene_number}:`, error);
              throw new Error(`Failed to translate description for scene ${scene.scene_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // Translate dialogue
            let translatedDialogue = scene.dialogue;
            console.log(`[Translation] Processing dialogue for scene ${scene.scene_number}`);
            console.log(`[Translation] Dialogue type: ${typeof scene.dialogue}, isArray: ${Array.isArray(scene.dialogue)}`);

            if (scene.dialogue && typeof scene.dialogue === 'object') {
              if (Array.isArray(scene.dialogue)) {
                console.log(`[Translation] Found array with ${scene.dialogue.length} items`);

                const dialogueLines: DialogueLine[] = scene.dialogue.filter(
                  (line: any) => typeof line === 'object' && (line.text || line.line)
                );

                console.log(`[Translation] Scene ${scene.scene_number}: Filtered to ${dialogueLines.length} valid dialogue lines`);

                if (dialogueLines.length > 0) {
                  try {
                    // Log sample of what we're translating
                    console.log(`[Translation] Sample dialogue line:`, {
                      character: dialogueLines[0].character,
                      text: (dialogueLines[0].text || dialogueLines[0].line || '').substring(0, 50)
                    });

                    const batches: DialogueLine[][] = [];
                    for (let i = 0; i < dialogueLines.length; i += BATCH_SIZE) {
                      batches.push(dialogueLines.slice(i, i + BATCH_SIZE));
                    }

                    console.log(`[Translation] Translating ${batches.length} batches of dialogue`);

                    const translatedBatches = await Promise.all(
                      batches.map(batch => translateDialogueBatch(batch, languageName, organizationId, scriptId))
                    );

                    translatedDialogue = translatedBatches.flat();

                    // Validate translation
                    console.log(`[Translation] Scene ${scene.scene_number}: Successfully translated ${translatedDialogue.length} dialogue lines`);
                    if (translatedDialogue.length !== dialogueLines.length) {
                      console.error(`[Translation] ERROR: Dialogue count mismatch! Original: ${dialogueLines.length}, Translated: ${translatedDialogue.length}`);
                    }

                    // Log sample of translated result
                    if (translatedDialogue.length > 0) {
                      console.log(`[Translation] Sample translated dialogue:`, {
                        character: translatedDialogue[0].character,
                        text: (translatedDialogue[0].text || translatedDialogue[0].line || '').substring(0, 50)
                      });
                    }
                  } catch (error) {
                    console.error(`[Translation] ERROR translating dialogue for scene ${scene.scene_number}:`, error);
                    throw new Error(`Failed to translate dialogue for scene ${scene.scene_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                } else if (scene.dialogue.length > 0) {
                  console.warn(`[Translation] Scene ${scene.scene_number}: No dialogue lines found with valid text/line properties.`);
                  console.warn(`[Translation] Original dialogue structure:`, JSON.stringify(scene.dialogue[0], null, 2));
                }
              } else {
                console.warn(`[Translation] Scene ${scene.scene_number}: Dialogue is not an array, type is: ${typeof scene.dialogue}`);
              }
            } else {
              console.log(`[Translation] Scene ${scene.scene_number}: No dialogue to translate`);
            }

            // Translate stage directions
            let translatedStageDirections = null;
            if (scene.stage_directions) {
              try {
                translatedStageDirections = await this.translateText(
                  scene.stage_directions,
                  languageName,
                  'These are stage directions. Translate them completely.',
                  organizationId,
                  scriptId
                );
                console.log(`[Translation] Stage directions translated: "${translatedStageDirections.substring(0, 50)}..."`);
              } catch (error) {
                console.error(`[Translation] ERROR translating stage directions for scene ${scene.scene_number}:`, error);
                throw new Error(`Failed to translate stage directions for scene ${scene.scene_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }

            // Save to database
            console.log(`[Translation] Saving translations to database for scene ${scene.scene_number}`);
            try {
              const { error: upsertError } = await supabase
                .from('script_scene_translations')
                .upsert(
                  {
                    scene_id: scene.id,
                    language_code: languageCode,
                    translated_setting: translatedSetting,
                    translated_description: translatedDescription,
                    translated_dialogue: translatedDialogue,
                    translated_stage_directions: translatedStageDirections
                  },
                  {
                    onConflict: 'scene_id,language_code'
                  }
                );

              if (upsertError) {
                console.error(`[Translation] ERROR saving scene ${scene.scene_number} translations:`, upsertError);
                throw upsertError;
              } else {
                console.log(`[Translation] Successfully saved scene ${scene.scene_number} translations`);
              }
            } catch (error) {
              console.error(`[Translation] ERROR saving to database for scene ${scene.scene_number}:`, error);
              throw new Error(`Failed to save translations for scene ${scene.scene_number}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            updateProgress();
          } catch (sceneError) {
            console.error(`[Translation] CRITICAL ERROR in scene ${scene.scene_number}:`, sceneError);
            throw new Error(`Scene ${scene.scene_number} failed: ${sceneError instanceof Error ? sceneError.message : 'Unknown error'}`);
          }
        }
      }

      // Final validation
      console.log(`\n[Translation] === Translation Complete - Validating ===`);
      const validationResult = await this.validateTranslation(scriptId, languageCode);
      console.log(`[Translation] Validation result:`, validationResult);

      if (!validationResult.isComplete) {
        console.warn(`[Translation] Translation validation failed:`, validationResult.issues);
        console.warn(`[Translation] Marking as completed anyway, but user should re-translate`);
      }

      await this.updateTranslationProgress(translationId, 100, 'completed');

      console.log(`\n========================================`);
      console.log(`[Translation] Translation completed successfully for ${languageName}`);
      console.log(`========================================\n`);

      return { success: true };
    } catch (error) {
      console.error('\n========================================');
      console.error('[Translation] TRANSLATION FAILED');
      console.error('========================================');
      console.error('[Translation] Error details:', error);

      if (error instanceof Error) {
        console.error('[Translation] Error name:', error.name);
        console.error('[Translation] Error message:', error.message);
        console.error('[Translation] Error stack:', error.stack);
      }

      let errorMessage = 'Translation failed: ';

      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
          errorMessage += 'Gemini API quota exceeded. Please try again in a few minutes. The service uses Gemini 2.5 Flash which has rate limits.';
        } else if (error.message.includes('INVALID_ARGUMENT')) {
          errorMessage += 'Invalid request to Gemini API. This might be due to content length or formatting issues.';
        } else if (error.message.includes('DEADLINE_EXCEEDED') || error.message.includes('timeout')) {
          errorMessage += 'Request timed out. The translation is taking too long. Try translating in smaller batches.';
        } else if (error.message.includes('PERMISSION_DENIED')) {
          errorMessage += 'API authentication failed. Please check your Gemini API key in settings.';
        } else if (error.message.includes('fetch')) {
          errorMessage += 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Unknown error occurred. Please check the console for details.';
      }

      console.error('[Translation] User-friendly error message:', errorMessage);

      // Get the translation record to find its ID
      const { data: translationRecord } = await supabase
        .from('script_translations')
        .select('id')
        .eq('script_id', scriptId)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (translationRecord) {
        // Update status to failed with error message
        await supabase
          .from('script_translations')
          .update({
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', translationRecord.id);
      }

      console.error('========================================\n');

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Validate that a translation is complete and has translated content
   */
  private static async validateTranslation(
    scriptId: string,
    languageCode: string
  ): Promise<{ isComplete: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const translatedScript = await this.getTranslatedScript(scriptId, languageCode);

      if (!translatedScript) {
        issues.push('Translation record not found');
        return { isComplete: false, issues };
      }

      // Check if title is translated
      if (!translatedScript.translated_title || translatedScript.translated_title.length < 2) {
        issues.push('Title not translated');
      }

      let totalScenes = 0;
      let scenesWithDialogue = 0;
      let scenesWithTranslatedDialogue = 0;

      for (const act of translatedScript.acts) {
        for (const scene of act.scenes) {
          totalScenes++;

          // Check if scene has dialogue
          if (scene.dialogue && Array.isArray(scene.dialogue) && scene.dialogue.length > 0) {
            scenesWithDialogue++;

            // Check if dialogue is translated (not empty)
            const hasTranslatedDialogue = scene.dialogue.some((line: any) => {
              const text = line.text || line.line || '';
              return text.trim().length > 0;
            });

            if (hasTranslatedDialogue) {
              scenesWithTranslatedDialogue++;
            } else {
              issues.push(`Scene ${scene.scene_number} has empty translated dialogue`);
            }
          }
        }
      }

      // If we have scenes with dialogue, check that most are translated
      if (scenesWithDialogue > 0) {
        const translationRate = scenesWithTranslatedDialogue / scenesWithDialogue;
        if (translationRate < 0.9) {
          issues.push(`Only ${Math.round(translationRate * 100)}% of scenes with dialogue were translated`);
        }
      }

      console.log(`[Validation] Total scenes: ${totalScenes}, Scenes with dialogue: ${scenesWithDialogue}, Translated: ${scenesWithTranslatedDialogue}`);

      return {
        isComplete: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('[Validation] Error during validation:', error);
      issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isComplete: false, issues };
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
