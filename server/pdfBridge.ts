import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class PdfBridge {
  public static async extractTextFromPdf(filePath: string): Promise<{
    success: boolean;
    text?: string;
    metadata?: any;
    error?: string;
  }> {
    const cwd = process.cwd();
    const scriptPath = path.join(cwd, 'python_nlp', 'pdf_extractor.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`PDF extractor script not found at '${scriptPath}'`);
    }

    return new Promise((resolve, reject) => {
      const pythonExec = process.platform === 'win32' ? 'python' : 'python3';
      const child = spawn(pythonExec, [scriptPath, filePath], {
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
        reject(new Error(`Failed to launch PDF extractor: ${err.message}`));
      });

      child.on('close', (code) => {
        // Clean up temp file safely
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch {
          // ignore cleanup errors
        }

        if (code !== 0 && !stdout) {
          return reject(
            new Error(`PDF extractor failed with code ${code}. Stderr: ${stderr}`)
          );
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e: any) {
          reject(
            new Error(`Failed to parse PDF extractor output: ${e.message}. Output was: ${stdout}`)
          );
        }
      });
    });
  }
}
