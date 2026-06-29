import { app } from 'electron';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function timestampLabel(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function runPowerShell(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true }
    );
    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `PowerShell exit ${code}`));
    });
    proc.on('error', reject);
  });
}

/** Exporta userData como ZIP na pasta Downloads do usuário. */
export async function exportUserDataZip(): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) {
    return { ok: false, error: 'Pasta de dados não encontrada' };
  }

  const downloads = app.getPath('downloads');
  const zipPath = path.join(downloads, `velora-export-${timestampLabel()}.zip`);

  const src = userData.replace(/'/g, "''");
  const dest = zipPath.replace(/'/g, "''");
  const script = `
    $src = '${src}'
    $dest = '${dest}'
    if (Test-Path $dest) { Remove-Item $dest -Force }
    Compress-Archive -Path (Join-Path $src '*') -DestinationPath $dest -Force
  `;

  try {
    await runPowerShell(script);
    return { ok: true, path: zipPath };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao exportar dados',
    };
  }
}

/** Remove conteúdo de userData (exceto o diretório raiz). */
export async function wipeUserData(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userData = app.getPath('userData');

  try {
    if (!fs.existsSync(userData)) {
      return { ok: true };
    }

    for (const entry of fs.readdirSync(userData)) {
      const full = path.join(userData, entry);
      fs.rmSync(full, { recursive: true, force: true });
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao apagar dados',
    };
  }
}
