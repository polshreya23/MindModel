import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface SlideContent {
  slideNumber: number;
  title: string;
  text: string;
  bulletPoints: string[];
  tables: string[][][];
  notes?: string;
  charCount: number;
}

export interface PptxMetadata {
  title: string;
  author?: string;
  slideCount: number;
  tableCount: number;
  bulletCount: number;
  charCount: number;
  wordCount: number;
  sourceFormat: string;
  filename: string;
}

export interface SlideReference {
  slideNumber: number;
  title: string;
}

export class PptxBridge {
  public static cleanupFile(filePath?: string): void {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore cleanup errors
    }
  }

  public static async extractFromPresentation(
    filePath: string,
    originalFilename: string
  ): Promise<{
    success: boolean;
    text?: string;
    slides?: SlideContent[];
    metadata?: PptxMetadata;
    error?: string;
  }> {
    const cwd = process.cwd();
    const scriptPath = path.join(cwd, 'python_nlp', 'pptx_extractor.py');

    if (!fs.existsSync(scriptPath)) {
      this.cleanupFile(filePath);
      throw new Error(`PowerPoint extractor script not found at '${scriptPath}'`);
    }

    return new Promise((resolve, reject) => {
      const pythonExec = process.platform === 'win32' ? 'python' : 'python3';
      const child = spawn(pythonExec, [scriptPath, filePath, originalFilename], {
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        this.cleanupFile(filePath);
        reject(new Error(`Failed to launch PowerPoint extractor: ${err.message}`));
      });

      child.on('close', (code) => {
        this.cleanupFile(filePath);

        if (code !== 0 && !stdout) {
          return reject(
            new Error(`PowerPoint extractor failed with code ${code}. Stderr: ${stderr}`)
          );
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e: any) {
          reject(
            new Error(`Failed to parse PowerPoint extractor output: ${e.message}. Output was: ${stdout}`)
          );
        }
      });
    });
  }

  /**
   * Maps extracted concepts back to the slides where they appear,
   * preserving slide-level provenance while keeping holistic NLP analysis.
   */
  public static mapConceptSlideReferences(
    nodes: Array<{ id: string; name: string }>,
    slides: SlideContent[]
  ): Record<string, SlideReference[]> {
    const refs: Record<string, SlideReference[]> = {};

    for (const node of nodes) {
      const term = (node.name || '').trim().toLowerCase();
      if (!term) continue;
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');

      const matchedSlides: SlideReference[] = [];
      for (const slide of slides) {
        const haystack = `${slide.title}\n${slide.text}`;
        if (regex.test(haystack) || haystack.toLowerCase().includes(term)) {
          matchedSlides.push({
            slideNumber: slide.slideNumber,
            title: slide.title,
          });
        }
      }

      if (matchedSlides.length > 0) {
        refs[node.id] = matchedSlides;
      }
    }

    return refs;
  }
}
