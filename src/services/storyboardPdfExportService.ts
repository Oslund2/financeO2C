import { jsPDF } from 'jspdf';

interface StoryboardShot {
  id: string;
  shot_number: number;
  scene_shot_number: number;
  shot_type: string;
  camera_angle: string;
  camera_movement: string;
  shot_description: string | null;
  dialogue_text: string | null;
  stage_directions: string | null;
  duration_seconds: number;
  image_url: string | null;
  character_positions: any;
}

interface Storyboard {
  id: string;
  title: string;
  series_id: string | null;
  episode_id: string | null;
}

interface ExportOptions {
  includeDialogue: boolean;
  includeStageDirections: boolean;
  includeCameraInfo: boolean;
  shotsPerPage: 2 | 4 | 6;
  pageOrientation: 'portrait' | 'landscape';
}

const DEFAULT_OPTIONS: ExportOptions = {
  includeDialogue: true,
  includeStageDirections: true,
  includeCameraInfo: true,
  shotsPerPage: 2,
  pageOrientation: 'landscape'
};

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const avgCharWidth = fontSize * 0.5;
  const charsPerLine = Math.floor(maxWidth / avgCharWidth);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= charsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function formatShotType(shotType: string): string {
  return shotType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function exportStoryboardToPDF(
  storyboard: Storyboard,
  shots: StoryboardShot[],
  options: Partial<ExportOptions> = {},
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const isLandscape = opts.pageOrientation === 'landscape';

  const pdf = new jsPDF({
    orientation: opts.pageOrientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(30, 64, 175);
  pdf.text(storyboard.title, margin, margin + 10);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  pdf.text(`Generated: ${dateStr}`, margin, margin + 18);
  pdf.text(`Total Shots: ${shots.length}`, margin, margin + 24);

  const totalDuration = shots.reduce((sum, shot) => sum + (shot.duration_seconds || 0), 0);
  const minutes = Math.floor(totalDuration / 60);
  const seconds = totalDuration % 60;
  pdf.text(`Estimated Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`, margin, margin + 30);

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, margin + 35, pageWidth - margin, margin + 35);

  const shotsWithImages = shots.filter(s => s.image_url);
  const shotsPerPage = opts.shotsPerPage;

  const cols = shotsPerPage <= 2 ? 1 : 2;
  const rows = Math.ceil(shotsPerPage / cols);

  const shotWidth = (contentWidth - (cols - 1) * 10) / cols;
  const availableHeight = pageHeight - margin - 45;
  const shotHeight = (availableHeight - (rows - 1) * 10) / rows;

  let currentPage = 1;
  let shotIndex = 0;

  for (const shot of shots) {
    const positionOnPage = shotIndex % shotsPerPage;

    if (shotIndex > 0 && positionOnPage === 0) {
      pdf.addPage();
      currentPage++;
    }

    if (onProgress) {
      const progress = Math.round((shotIndex / shots.length) * 100);
      onProgress(progress, `Processing shot ${shotIndex + 1} of ${shots.length}...`);
    }

    const col = positionOnPage % cols;
    const row = Math.floor(positionOnPage / cols);

    const xPos = margin + col * (shotWidth + 10);
    const yPos = margin + 40 + row * (shotHeight + 10);

    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(xPos, yPos, shotWidth, shotHeight, 3, 3, 'FD');

    pdf.setFillColor(30, 64, 175);
    pdf.roundedRect(xPos, yPos, shotWidth, 8, 3, 3, 'F');
    pdf.rect(xPos, yPos + 5, shotWidth, 3, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`#${shot.shot_number}`, xPos + 3, yPos + 5.5);

    const shotTypeLabel = formatShotType(shot.shot_type);
    pdf.setFontSize(8);
    pdf.text(shotTypeLabel.toUpperCase(), xPos + 15, yPos + 5.5);

    const durationLabel = `${shot.duration_seconds}s`;
    pdf.text(durationLabel, xPos + shotWidth - 10, yPos + 5.5);

    const imageYStart = yPos + 10;
    const imageWidth = shotWidth - 6;
    const imageXPos = xPos + 3;
    const lineHeight = 3.5;
    const maxTextWidth = shotWidth - 8;

    let dialogueLines: string[] = [];
    if (opts.includeDialogue && shot.dialogue_text) {
      dialogueLines = wrapText(shot.dialogue_text, maxTextWidth - 4, 7);
    }

    const dialogueHeaderHeight = opts.includeDialogue && shot.dialogue_text ? 5 : 0;
    const dialogueLinesHeight = dialogueLines.length * lineHeight;
    const totalDialogueHeight = opts.includeDialogue && shot.dialogue_text
      ? dialogueHeaderHeight + dialogueLinesHeight + 4
      : 0;

    const cameraInfoHeight = opts.includeCameraInfo ? lineHeight + 1 : 0;
    const descriptionHeight = shot.shot_description ? lineHeight * 2 : 0;
    const stageDirectionsHeight = opts.includeStageDirections && shot.stage_directions && !shot.dialogue_text ? lineHeight * 2 : 0;

    const totalTextHeight = cameraInfoHeight + descriptionHeight + totalDialogueHeight + stageDirectionsHeight + 6;

    const imageHeight = shotHeight - totalTextHeight - 12;

    if (shot.image_url) {
      try {
        const imageData = await loadImageAsBase64(shot.image_url);
        if (imageData) {
          const aspectRatio = 16 / 9;
          let imgWidth = imageWidth;
          let imgHeight = imgWidth / aspectRatio;

          if (imgHeight > imageHeight) {
            imgHeight = imageHeight;
            imgWidth = imgHeight * aspectRatio;
          }

          const imgXOffset = (imageWidth - imgWidth) / 2;

          pdf.addImage(
            imageData,
            'JPEG',
            imageXPos + imgXOffset,
            imageYStart,
            imgWidth,
            imgHeight
          );
        }
      } catch (error) {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(imageXPos, imageYStart, imageWidth, imageHeight, 'F');
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text('Image not available', imageXPos + imageWidth / 2 - 15, imageYStart + imageHeight / 2);
      }
    } else {
      pdf.setFillColor(240, 240, 240);
      pdf.rect(imageXPos, imageYStart, imageWidth, imageHeight, 'F');
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(8);
      pdf.text('No image', imageXPos + imageWidth / 2 - 8, imageYStart + imageHeight / 2);
    }

    const textYStart = imageYStart + imageHeight + 2;
    let currentTextY = textYStart;

    if (opts.includeCameraInfo) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      const cameraInfo = `${shot.camera_angle.replace('_', ' ')} | ${shot.camera_movement.replace('_', ' ')}`;
      pdf.text(cameraInfo, xPos + 4, currentTextY + 3);
      currentTextY += lineHeight + 1;
    }

    if (shot.shot_description) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(60, 60, 60);
      const descLines = wrapText(shot.shot_description, maxTextWidth, 7);
      const maxDescLines = 2;
      for (let i = 0; i < Math.min(descLines.length, maxDescLines); i++) {
        let line = descLines[i];
        if (i === maxDescLines - 1 && descLines.length > maxDescLines) {
          line = line.substring(0, line.length - 3) + '...';
        }
        pdf.text(line, xPos + 4, currentTextY + 3);
        currentTextY += lineHeight;
      }
    }

    if (opts.includeDialogue && shot.dialogue_text && dialogueLines.length > 0) {
      currentTextY += 2;

      const dialogueBoxHeight = dialogueHeaderHeight + dialogueLinesHeight + 2;
      pdf.setFillColor(254, 249, 195);
      pdf.roundedRect(xPos + 3, currentTextY, shotWidth - 6, dialogueBoxHeight, 1, 1, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.setTextColor(161, 98, 7);
      pdf.text('DIALOGUE', xPos + 5, currentTextY + 3);

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      pdf.setTextColor(80, 60, 20);

      for (let i = 0; i < dialogueLines.length; i++) {
        const line = dialogueLines[i];
        pdf.text(line, xPos + 5, currentTextY + 6 + (i * lineHeight));
      }

      currentTextY += dialogueBoxHeight;
    }

    if (opts.includeStageDirections && shot.stage_directions && !shot.dialogue_text) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(6);
      pdf.setTextColor(100, 100, 100);
      const stageLines = wrapText(shot.stage_directions, maxTextWidth, 6);
      for (let i = 0; i < Math.min(stageLines.length, 2); i++) {
        pdf.text(`[${stageLines[i]}]`, xPos + 4, currentTextY + 3 + (i * lineHeight));
      }
    }

    shotIndex++;
  }

  const totalPages = currentPage;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    pdf.text(
      storyboard.title,
      margin,
      pageHeight - 8
    );
  }

  if (onProgress) {
    onProgress(100, 'PDF generation complete!');
  }

  return pdf.output('blob');
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
