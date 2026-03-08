import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';

export type ExportFormat = 'pdf' | 'docx' | 'txt' | 'json' | 'csv' | 'srt' | 'vtt' | 'zip';

interface DialogueLine {
  character: string;
  text: string;
}

interface Scene {
  id: string;
  scene_number: number;
  setting: string;
  description: string;
  dialogue: DialogueLine[];
  stage_directions: string;
  duration_estimate: number;
  characters: string[];
}

interface Act {
  id: string;
  act_number: number;
  content: string;
  notes: string;
  duration_estimate: number;
  scenes: Scene[];
}

interface TranslatedScript {
  id: string;
  script_id: string;
  language_code: string;
  language_name: string;
  translated_title: string;
  translated_synopsis: string | null;
  translated_theme: string | null;
  acts: Act[];
}

export class TranslationExportService {
  /**
   * Export a translated script in the specified format
   */
  static async exportTranslation(
    scriptId: string,
    languageCode: string,
    format: ExportFormat,
    options?: {
      includeSynopsis?: boolean;
      includeStageDirections?: boolean;
      includeSceneNumbers?: boolean;
    }
  ): Promise<Blob> {
    const translatedScript = await this.getTranslatedScriptForExport(scriptId, languageCode);

    if (!translatedScript) {
      throw new Error('Translation not found');
    }

    let blob: Blob;

    switch (format) {
      case 'pdf':
        blob = await this.exportToPDF(translatedScript, options);
        break;
      case 'txt':
        blob = this.exportToText(translatedScript, options);
        break;
      case 'json':
        blob = this.exportToJSON(translatedScript);
        break;
      case 'csv':
        blob = this.exportToCSV(translatedScript);
        break;
      case 'srt':
        blob = this.exportToSRT(translatedScript);
        break;
      case 'vtt':
        blob = this.exportToVTT(translatedScript);
        break;
      default:
        throw new Error(`Export format ${format} not supported`);
    }

    // Track the export
    await this.trackExport(scriptId, translatedScript.id, languageCode, format, blob.size);

    // Increment download count
    await supabase.rpc('increment_translation_download_count', {
      p_translation_id: translatedScript.id
    });

    return blob;
  }

  /**
   * Export all translations for a script as a ZIP file
   */
  static async exportAllTranslations(
    scriptId: string,
    format: ExportFormat
  ): Promise<{ files: Array<{ name: string; blob: Blob }> }> {
    const { data: translations } = await supabase
      .from('script_translations')
      .select('language_code, language_name')
      .eq('script_id', scriptId)
      .eq('status', 'completed');

    if (!translations || translations.length === 0) {
      throw new Error('No completed translations found');
    }

    const files: Array<{ name: string; blob: Blob }> = [];

    for (const translation of translations) {
      const blob = await this.exportTranslation(scriptId, translation.language_code, format);
      const extension = this.getFileExtension(format);
      const fileName = `${translation.language_name}_${translation.language_code}.${extension}`;
      files.push({ name: fileName, blob });
    }

    return { files };
  }

  /**
   * Get translated script data for export
   */
  private static async getTranslatedScriptForExport(
    scriptId: string,
    languageCode: string
  ): Promise<TranslatedScript | null> {
    const { data: translation } = await supabase
      .from('script_translations')
      .select('*')
      .eq('script_id', scriptId)
      .eq('language_code', languageCode)
      .maybeSingle();

    if (!translation) return null;

    const { data: acts } = await supabase
      .from('script_acts')
      .select('*')
      .eq('script_id', scriptId)
      .order('act_number', { ascending: true });

    const actIds = (acts || []).map(a => a.id);

    // Batch fetch all related data in parallel instead of per-act/per-scene loops
    const [actTranslationsResult, scenesResult] = await Promise.all([
      actIds.length > 0
        ? supabase
            .from('script_act_translations')
            .select('*')
            .in('act_id', actIds)
            .eq('language_code', languageCode)
        : { data: [] },
      actIds.length > 0
        ? supabase
            .from('script_scenes')
            .select('*')
            .in('act_id', actIds)
            .order('scene_number', { ascending: true })
        : { data: [] },
    ]);

    const allScenes = scenesResult.data || [];
    const sceneIds = allScenes.map(s => s.id);

    const { data: allSceneTranslations } = sceneIds.length > 0
      ? await supabase
          .from('script_scene_translations')
          .select('*')
          .in('scene_id', sceneIds)
          .eq('language_code', languageCode)
      : { data: [] as any[] };

    // Index translations by their foreign keys for O(1) lookup
    const actTranslationMap = new Map(
      (actTranslationsResult.data || []).map(t => [t.act_id, t])
    );
    const sceneTranslationMap = new Map(
      (allSceneTranslations || []).map(t => [t.scene_id, t])
    );

    const translatedActs = (acts || []).map(act => {
      const actTranslation = actTranslationMap.get(act.id);
      const actScenes = allScenes
        .filter(s => s.act_id === act.id)
        .map(scene => {
          const sceneTranslation = sceneTranslationMap.get(scene.id);
          return {
            ...scene,
            setting: sceneTranslation?.translated_setting || scene.setting,
            description: sceneTranslation?.translated_description || scene.description,
            dialogue: sceneTranslation?.translated_dialogue || scene.dialogue,
            stage_directions: sceneTranslation?.translated_stage_directions || scene.stage_directions
          };
        });

      return {
        ...act,
        content: actTranslation?.translated_content || act.content,
        notes: actTranslation?.translated_notes || act.notes,
        scenes: actScenes
      };
    });

    return {
      ...translation,
      acts: translatedActs
    };
  }

  /**
   * Export to PDF format
   */
  private static async exportToPDF(
    script: TranslatedScript,
    options?: any
  ): Promise<Blob> {
    const pdf = new jsPDF();
    let yPosition = 20;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;

    // Helper to add new page if needed
    const checkPageBreak = (increment: number = 10) => {
      if (yPosition + increment > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(script.translated_title, margin, yPosition);
    yPosition += 15;

    // Language info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Language: ${script.language_name}`, margin, yPosition);
    yPosition += 10;

    // Synopsis
    if (options?.includeSynopsis && script.translated_synopsis) {
      checkPageBreak(20);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Synopsis:', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const synopsisLines = pdf.splitTextToSize(script.translated_synopsis, 170);
      synopsisLines.forEach((line: string) => {
        checkPageBreak();
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
    }

    // Acts and Scenes
    script.acts.forEach((act) => {
      checkPageBreak(15);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Act ${act.act_number}`, margin, yPosition);
      yPosition += 10;

      act.scenes.forEach((scene) => {
        checkPageBreak(20);

        // Scene header
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        const sceneHeader = options?.includeSceneNumbers
          ? `Scene ${scene.scene_number} - ${scene.setting}`
          : scene.setting;
        pdf.text(sceneHeader, margin + 5, yPosition);
        yPosition += 8;

        // Scene description
        if (scene.description) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          const descLines = pdf.splitTextToSize(scene.description, 165);
          descLines.forEach((line: string) => {
            checkPageBreak();
            pdf.text(line, margin + 5, yPosition);
            yPosition += 5;
          });
          yPosition += 3;
        }

        // Dialogue
        if (scene.dialogue && Array.isArray(scene.dialogue)) {
          scene.dialogue.forEach((line: DialogueLine) => {
            checkPageBreak(12);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${line.character}:`, margin + 10, yPosition);
            yPosition += 6;

            pdf.setFont('helvetica', 'normal');
            const dialogueLines = pdf.splitTextToSize(line.text, 155);
            dialogueLines.forEach((dLine: string) => {
              checkPageBreak();
              pdf.text(dLine, margin + 15, yPosition);
              yPosition += 5;
            });
            yPosition += 3;
          });
        }

        // Stage directions
        if (options?.includeStageDirections && scene.stage_directions) {
          checkPageBreak();
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          const stageLines = pdf.splitTextToSize(`[${scene.stage_directions}]`, 165);
          stageLines.forEach((line: string) => {
            checkPageBreak();
            pdf.text(line, margin + 10, yPosition);
            yPosition += 5;
          });
          yPosition += 3;
        }

        yPosition += 5;
      });

      yPosition += 10;
    });

    return pdf.output('blob');
  }

  /**
   * Export to plain text format
   */
  private static exportToText(script: TranslatedScript, options?: any): Blob {
    let text = '';

    text += `${script.translated_title}\n`;
    text += `Language: ${script.language_name}\n`;
    text += '='.repeat(60) + '\n\n';

    if (options?.includeSynopsis && script.translated_synopsis) {
      text += 'SYNOPSIS:\n';
      text += script.translated_synopsis + '\n\n';
      text += '-'.repeat(60) + '\n\n';
    }

    script.acts.forEach((act) => {
      text += `\nACT ${act.act_number}\n`;
      text += '='.repeat(60) + '\n\n';

      if (act.content) {
        text += act.content + '\n\n';
      }

      act.scenes.forEach((scene) => {
        const sceneHeader = options?.includeSceneNumbers
          ? `Scene ${scene.scene_number} - ${scene.setting}`
          : scene.setting;

        text += `\n${sceneHeader}\n`;
        text += '-'.repeat(40) + '\n';

        if (scene.description) {
          text += `\n${scene.description}\n\n`;
        }

        if (scene.dialogue && Array.isArray(scene.dialogue)) {
          scene.dialogue.forEach((line: DialogueLine) => {
            text += `\n${line.character}:\n`;
            text += `  ${line.text}\n`;
          });
        }

        if (options?.includeStageDirections && scene.stage_directions) {
          text += `\n[${scene.stage_directions}]\n`;
        }

        text += '\n';
      });
    });

    return new Blob([text], { type: 'text/plain' });
  }

  /**
   * Export to JSON format
   */
  private static exportToJSON(script: TranslatedScript): Blob {
    const jsonData = JSON.stringify(script, null, 2);
    return new Blob([jsonData], { type: 'application/json' });
  }

  /**
   * Export to CSV format (dialogue lines)
   */
  private static exportToCSV(script: TranslatedScript): Blob {
    let csv = 'Act,Scene,Character,Dialogue,Setting,Stage Directions\n';

    script.acts.forEach((act) => {
      act.scenes.forEach((scene) => {
        if (scene.dialogue && Array.isArray(scene.dialogue)) {
          scene.dialogue.forEach((line: DialogueLine) => {
            const row = [
              act.act_number,
              scene.scene_number,
              this.escapeCsvField(line.character),
              this.escapeCsvField(line.text),
              this.escapeCsvField(scene.setting),
              this.escapeCsvField(scene.stage_directions || '')
            ].join(',');
            csv += row + '\n';
          });
        }
      });
    });

    return new Blob([csv], { type: 'text/csv' });
  }

  /**
   * Export to SRT subtitle format
   */
  private static exportToSRT(script: TranslatedScript): Blob {
    let srt = '';
    let index = 1;
    let currentTime = 0; // in seconds

    script.acts.forEach((act) => {
      act.scenes.forEach((scene) => {
        if (scene.dialogue && Array.isArray(scene.dialogue)) {
          scene.dialogue.forEach((line: DialogueLine) => {
            const duration = this.estimateDialogueDuration(line.text);
            const startTime = this.formatSRTTime(currentTime);
            const endTime = this.formatSRTTime(currentTime + duration);

            srt += `${index}\n`;
            srt += `${startTime} --> ${endTime}\n`;
            srt += `${line.character}: ${line.text}\n\n`;

            index++;
            currentTime += duration + 0.5; // Add 0.5s pause between lines
          });
        }
      });
    });

    return new Blob([srt], { type: 'text/plain' });
  }

  /**
   * Export to VTT subtitle format
   */
  private static exportToVTT(script: TranslatedScript): Blob {
    let vtt = 'WEBVTT\n\n';
    let currentTime = 0; // in seconds

    script.acts.forEach((act) => {
      act.scenes.forEach((scene) => {
        if (scene.dialogue && Array.isArray(scene.dialogue)) {
          scene.dialogue.forEach((line: DialogueLine) => {
            const duration = this.estimateDialogueDuration(line.text);
            const startTime = this.formatVTTTime(currentTime);
            const endTime = this.formatVTTTime(currentTime + duration);

            vtt += `${startTime} --> ${endTime}\n`;
            vtt += `<v ${line.character}>${line.text}\n\n`;

            currentTime += duration + 0.5; // Add 0.5s pause between lines
          });
        }
      });
    });

    return new Blob([vtt], { type: 'text/vtt' });
  }

  /**
   * Track export in database
   */
  private static async trackExport(
    scriptId: string,
    translationId: string,
    languageCode: string,
    format: ExportFormat,
    fileSize: number
  ): Promise<void> {
    await supabase.from('translation_export_history').insert({
      script_id: scriptId,
      translation_id: translationId,
      language_code: languageCode,
      export_format: format,
      file_size_bytes: fileSize,
      exported_at: new Date().toISOString()
    });
  }

  /**
   * Get export statistics for a translation
   */
  static async getExportStats(translationId: string) {
    const { data: analytics } = await supabase
      .from('translation_analytics')
      .select('*')
      .eq('translation_id', translationId)
      .maybeSingle();

    const { data: exportHistory } = await supabase
      .from('translation_export_history')
      .select('export_format, exported_at')
      .eq('translation_id', translationId)
      .order('exported_at', { ascending: false })
      .limit(10);

    return {
      viewCount: analytics?.view_count || 0,
      downloadCount: analytics?.download_count || 0,
      lastViewed: analytics?.last_viewed_at,
      lastDownloaded: analytics?.last_downloaded_at,
      recentExports: exportHistory || []
    };
  }

  /**
   * Helper: Escape CSV field
   */
  private static escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Helper: Estimate dialogue duration in seconds
   */
  private static estimateDialogueDuration(text: string): number {
    // Average reading speed: ~150 words per minute, ~2.5 words per second
    const words = text.split(/\s+/).length;
    const duration = words / 2.5;
    return Math.max(2, Math.min(duration, 10)); // Min 2s, max 10s per line
  }

  /**
   * Helper: Format time for SRT (00:00:00,000)
   */
  private static formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }

  /**
   * Helper: Format time for VTT (00:00:00.000)
   */
  private static formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  /**
   * Helper: Get file extension for format
   */
  private static getFileExtension(format: ExportFormat): string {
    return format === 'docx' ? 'docx' : format;
  }

  /**
   * Track when a translation is viewed
   */
  static async trackView(translationId: string): Promise<void> {
    await supabase.rpc('increment_translation_view_count', {
      p_translation_id: translationId
    });
  }
}
