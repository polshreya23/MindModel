import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class NlpBridge {
  private static runPythonScript(scriptRelativePath: string, inputPayload: any): Promise<any> {
    const cwd = process.cwd();
    const scriptPath = path.join(cwd, scriptRelativePath);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python script not found at '${scriptPath}'`);
    }

    return new Promise((resolve, reject) => {
      // Try python3 first, fallback to python
      const pythonExec = process.platform === 'win32' ? 'python' : 'python3';
      const child = spawn(pythonExec, [scriptPath], {
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
        reject(new Error(`Failed to launch Python process: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0 && !stdout) {
          return reject(
            new Error(`Python script '${scriptRelativePath}' exited with code ${code}. Stderr: ${stderr}`)
          );
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e: any) {
          reject(
            new Error(`Failed to parse Python JSON output: ${e.message}. Output was: ${stdout}`)
          );
        }
      });

      child.stdin.write(JSON.stringify(inputPayload));
      child.stdin.end();
    });
  }

  public static async extractConcepts(text: string): Promise<any> {
    return this.runPythonScript('python_nlp/extractor.py', { text });
  }

  public static async summarizeText(text: string, maxSentences: number = 4): Promise<any> {
    return this.runPythonScript('python_nlp/summarizer.py', { text, maxSentences });
  }
}
