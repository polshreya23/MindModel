import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface CppBridgePayload {
  action: 'build_graph' | 'bfs' | 'dfs' | 'dijkstra' | 'topological_sort' | 'autocomplete' | 'get_heap';
  nodes?: any[];
  edges?: any[];
  startId?: string;
  targetId?: string;
  prefix?: string;
  maxResults?: number;
  topK?: number;
}

export class CppBridge {
  private static getBinaryPath(): string {
    const isWindows = process.platform === 'win32';
    const cwd = process.cwd();

    // Check potential binary locations
    const candidates = isWindows
      ? [
          path.join(cwd, 'cxx', 'bin', 'modelmind_engine.exe'),
          path.join(cwd, 'cxx', 'modelmind_engine.exe'),
          path.join(cwd, 'bin', 'modelmind_engine.exe'),
        ]
      : [
          path.join(cwd, 'cxx', 'bin', 'modelmind_engine'),
          path.join(cwd, 'cxx', 'modelmind_engine'),
          path.join(cwd, 'bin', 'modelmind_engine'),
        ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Default fallback
    return candidates[0];
  }

  public static async execute(payload: CppBridgePayload): Promise<any> {
    const binaryPath = this.getBinaryPath();

    if (!fs.existsSync(binaryPath)) {
      throw new Error(
        `C++ ModelMind binary not found at '${binaryPath}'. Run 'make -C cxx' or 'cxx/build.bat' to build.`
      );
    }

    return new Promise((resolve, reject) => {
      const child = spawn(binaryPath, [], {
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
        reject(new Error(`Failed to execute C++ binary: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0 && !stdout) {
          return reject(
            new Error(`C++ binary exited with code ${code}. Stderr: ${stderr}`)
          );
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (e: any) {
          reject(
            new Error(
              `Failed to parse C++ JSON output: ${e.message}. Raw output: ${stdout}`
            )
          );
        }
      });

      // Write payload to C++ standard input
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }
}
