import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedScript {
  content: string;
  format: 'plain_text' | 'docx' | 'pdf';
  filename: string;
  wordCount: number;
}

export class ScriptUploadService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_EXTENSIONS = ['.txt', '.docx', '.pdf'];

  static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds 10MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
      };
    }

    // Check file extension
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Unsupported file type. Please upload .txt, .docx, or .pdf files`
      };
    }

    return { valid: true };
  }

  static async parseFile(file: File): Promise<ParsedScript> {
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    let content: string;
    let format: 'plain_text' | 'docx' | 'pdf';

    try {
      if (extension === '.txt') {
        content = await this.parseTextFile(file);
        format = 'plain_text';
      } else if (extension === '.docx') {
        content = await this.parseDocxFile(file);
        format = 'docx';
      } else if (extension === '.pdf') {
        content = await this.parsePdfFile(file);
        format = 'pdf';
      } else {
        throw new Error('Unsupported file type');
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        throw new Error('File appears to be empty or contains no readable text');
      }

      const wordCount = this.countWords(content);

      if (wordCount < 10) {
        throw new Error('Script content is too short. Please upload a complete script');
      }

      return {
        content: content.trim(),
        format,
        filename: file.name,
        wordCount
      };
    } catch (error) {
      throw new Error(
        `Failed to parse ${extension} file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private static async parseTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  private static async parseDocxFile(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });

      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX parsing warnings:', result.messages);
      }

      return result.value;
    } catch (error) {
      throw new Error('Failed to parse DOCX file. The file may be corrupted or password-protected');
    }
  }

  private static async parsePdfFile(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      return fullText;
    } catch (error) {
      throw new Error('Failed to parse PDF file. The file may be corrupted or password-protected');
    }
  }

  private static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  static formatContentPreview(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  static estimateReadingTime(wordCount: number): number {
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  }

  static estimateScriptLength(wordCount: number): string {
    // Rough estimates for script lengths
    if (wordCount < 500) {
      return 'Short scene (2-5 min)';
    } else if (wordCount < 2000) {
      return 'Short episode (5-10 min)';
    } else if (wordCount < 5000) {
      return 'Standard episode (10-22 min)';
    } else if (wordCount < 10000) {
      return 'Long episode (22-45 min)';
    } else {
      return 'Feature-length (45+ min)';
    }
  }
}
