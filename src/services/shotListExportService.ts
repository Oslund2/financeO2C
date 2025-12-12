import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeReferenceImages: boolean;
  filterByAct?: number;
  filterByScene?: number;
  filterByStatus?: string;
}

export interface ShotExportData {
  shot_number: number;
  act_number: number;
  scene_number: number;
  shot_type: string;
  camera_angle: string;
  camera_movement: string;
  duration_seconds: number;
  narrative_description: string;
  technical_description: string;
  characters: string[];
  location: string;
  dialogue_content: any[];
  audio_directives: string;
  nat_sound_description: string;
  prompt_text: string;
  negative_prompt: string;
  audio_cues: string;
  dialogue_cues: any[];
  character_references: string[];
  reference_images: string[];
  status: string;
}

export async function exportShotList(
  shotIds: string[],
  episodeId: string | null,
  seriesId: string,
  organizationId: string,
  options: ExportOptions
): Promise<Blob> {
  const exportData = await fetchShotExportData(shotIds, options);

  let blob: Blob;
  let fileName: string;
  let fileUrl: string | null = null;

  switch (options.format) {
    case 'csv':
      blob = generateCSV(exportData);
      fileName = `shot-list-${Date.now()}.csv`;
      break;
    case 'excel':
      blob = await generateExcel(exportData);
      fileName = `shot-list-${Date.now()}.xlsx`;
      break;
    case 'pdf':
      blob = await generatePDF(exportData);
      fileName = `shot-list-${Date.now()}.pdf`;
      break;
    case 'json':
      blob = generateJSON(exportData);
      fileName = `shot-list-${Date.now()}.json`;
      break;
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }

  await trackExport(episodeId, seriesId, organizationId, options, shotIds.length, blob.size, fileName);

  return blob;
}

async function fetchShotExportData(
  shotIds: string[],
  options: ExportOptions
): Promise<ShotExportData[]> {
  let query = supabase
    .from('production_shot_plans')
    .select(`
      *,
      production_shot_prompts (
        veo3_prompt_text,
        negative_prompt,
        audio_cues,
        dialogue_cues,
        character_references
      )
    `)
    .in('id', shotIds)
    .order('shot_number');

  if (options.filterByAct) {
    query = query.eq('act_number', options.filterByAct);
  }

  if (options.filterByScene) {
    query = query.eq('scene_number', options.filterByScene);
  }

  if (options.filterByStatus) {
    query = query.eq('status', options.filterByStatus);
  }

  const { data: shots, error } = await query;

  if (error || !shots) {
    throw new Error('Failed to fetch shot data');
  }

  const referenceImages: Map<string, string[]> = new Map();

  if (options.includeReferenceImages) {
    const allCharacterIds = new Set<string>();
    shots.forEach(shot => {
      if (shot.characters && Array.isArray(shot.characters)) {
        shot.characters.forEach((id: string) => allCharacterIds.add(id));
      }
    });

    if (allCharacterIds.size > 0) {
      const { data: characters } = await supabase
        .from('characters')
        .select('id, reference_image_url')
        .in('id', Array.from(allCharacterIds));

      characters?.forEach(char => {
        if (char.reference_image_url) {
          referenceImages.set(char.id, [char.reference_image_url]);
        }
      });
    }
  }

  return shots.map(shot => {
    const prompt = Array.isArray(shot.production_shot_prompts) && shot.production_shot_prompts.length > 0
      ? shot.production_shot_prompts[0]
      : null;

    const shotRefImages: string[] = [];
    if (shot.characters && Array.isArray(shot.characters)) {
      shot.characters.forEach((charId: string) => {
        const images = referenceImages.get(charId);
        if (images) {
          shotRefImages.push(...images);
        }
      });
    }

    return {
      shot_number: shot.shot_number,
      act_number: shot.act_number,
      scene_number: shot.scene_number,
      shot_type: shot.shot_type,
      camera_angle: shot.camera_angle,
      camera_movement: shot.camera_movement,
      duration_seconds: shot.duration_seconds,
      narrative_description: shot.narrative_description || '',
      technical_description: shot.technical_description || '',
      characters: shot.characters || [],
      location: shot.location || '',
      dialogue_content: shot.dialogue_content || [],
      audio_directives: shot.audio_directives || '',
      nat_sound_description: shot.nat_sound_description || '',
      prompt_text: prompt?.veo3_prompt_text || '',
      negative_prompt: prompt?.negative_prompt || '',
      audio_cues: prompt?.audio_cues || '',
      dialogue_cues: prompt?.dialogue_cues || [],
      character_references: prompt?.character_references || [],
      reference_images: shotRefImages,
      status: shot.status
    };
  });
}

function generateCSV(data: ShotExportData[]): Blob {
  const headers = [
    'Shot Number',
    'Act',
    'Scene',
    'Shot Type',
    'Camera Angle',
    'Camera Movement',
    'Duration (s)',
    'Narrative Description',
    'Location',
    'Characters',
    'Dialogue',
    'Audio Directives',
    'Nat Sound',
    'Veo 3 Prompt',
    'Negative Prompt',
    'Audio Cues',
    'Reference Images',
    'Status'
  ];

  const rows = data.map(shot => [
    shot.shot_number,
    shot.act_number,
    shot.scene_number,
    shot.shot_type,
    shot.camera_angle,
    shot.camera_movement,
    shot.duration_seconds,
    `"${shot.narrative_description.replace(/"/g, '""')}"`,
    shot.location,
    shot.characters.join('; '),
    `"${JSON.stringify(shot.dialogue_content).replace(/"/g, '""')}"`,
    `"${shot.audio_directives.replace(/"/g, '""')}"`,
    `"${shot.nat_sound_description.replace(/"/g, '""')}"`,
    `"${shot.prompt_text.replace(/"/g, '""')}"`,
    `"${shot.negative_prompt.replace(/"/g, '""')}"`,
    `"${shot.audio_cues.replace(/"/g, '""')}"`,
    shot.reference_images.join('; '),
    shot.status
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv' });
}

async function generateExcel(data: ShotExportData[]): Blob {
  const csvBlob = generateCSV(data);
  return csvBlob;
}

async function generatePDF(data: ShotExportData[]): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPosition = 20;

  doc.setFontSize(16);
  doc.text('Shot List Export', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 10;

  doc.setFontSize(8);

  data.forEach((shot, index) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Shot ${shot.shot_number} - Act ${shot.act_number}, Scene ${shot.scene_number}`, margin, yPosition);
    yPosition += 6;

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');

    const details = [
      `Type: ${shot.shot_type} | Angle: ${shot.camera_angle} | Movement: ${shot.camera_movement}`,
      `Duration: ${shot.duration_seconds}s | Location: ${shot.location}`,
      `Characters: ${shot.characters.join(', ')}`,
      `Description: ${shot.narrative_description.substring(0, 100)}...`,
      `Veo 3 Prompt: ${shot.prompt_text.substring(0, 150)}...`,
      `Audio: ${shot.audio_directives}`,
      `Status: ${shot.status}`
    ];

    details.forEach(detail => {
      const lines = doc.splitTextToSize(detail, pageWidth - 2 * margin);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 5;
    });

    if (shot.reference_images.length > 0) {
      doc.text(`Reference Images: ${shot.reference_images.length} image(s)`, margin, yPosition);
      yPosition += 5;
      shot.reference_images.forEach(url => {
        const urlLine = doc.splitTextToSize(url, pageWidth - 2 * margin);
        doc.text(urlLine, margin + 5, yPosition);
        yPosition += urlLine.length * 4;
      });
    }

    yPosition += 8;

    if (index < data.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition - 4, pageWidth - margin, yPosition - 4);
    }
  });

  return doc.output('blob');
}

function generateJSON(data: ShotExportData[]): Blob {
  const exportData = {
    metadata: {
      export_date: new Date().toISOString(),
      shot_count: data.length,
      total_duration: data.reduce((sum, shot) => sum + shot.duration_seconds, 0),
      format_version: '1.0'
    },
    shots: data.map(shot => ({
      shot_number: shot.shot_number,
      act_number: shot.act_number,
      scene_number: shot.scene_number,
      shot_type: shot.shot_type,
      camera: {
        angle: shot.camera_angle,
        movement: shot.camera_movement
      },
      duration_seconds: shot.duration_seconds,
      descriptions: {
        narrative: shot.narrative_description,
        technical: shot.technical_description
      },
      location: shot.location,
      characters: shot.characters,
      dialogue: shot.dialogue_content,
      audio: {
        directives: shot.audio_directives,
        nat_sound: shot.nat_sound_description,
        cues: shot.audio_cues
      },
      veo3_prompt: {
        main_prompt: shot.prompt_text,
        negative_prompt: shot.negative_prompt,
        dialogue_cues: shot.dialogue_cues
      },
      reference_images: shot.reference_images,
      status: shot.status
    }))
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

async function trackExport(
  episodeId: string | null,
  seriesId: string,
  organizationId: string,
  options: ExportOptions,
  shotCount: number,
  fileSize: number,
  fileName: string
): Promise<void> {
  try {
    await supabase
      .from('shot_exports')
      .insert([{
        episode_id: episodeId,
        series_id: seriesId,
        organization_id: organizationId,
        export_format: options.format,
        export_name: fileName,
        filters: {
          act: options.filterByAct,
          scene: options.filterByScene,
          status: options.filterByStatus
        },
        include_reference_images: options.includeReferenceImages,
        shot_count: shotCount,
        file_size_bytes: fileSize,
        metadata: {
          export_date: new Date().toISOString()
        }
      }]);
  } catch (error) {
    console.error('Failed to track export:', error);
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
