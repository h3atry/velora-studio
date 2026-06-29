import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { logInfo, logWarn } from '../crashLogger';

let checked = false;

function hasUpdateManifest(): boolean {
  try {
    const yml = path.join(process.resourcesPath, 'app-update.yml');
    return fs.existsSync(yml);
  } catch {
    return false;
  }
}

export async function initAutoUpdater(): Promise<void> {
  if (checked || !app.isPackaged) return;
  checked = true;

  if (!hasUpdateManifest()) {
    logInfo('Auto-update ignorado (build dir sem app-update.yml)');
    return;
  }

  try {
    const { autoUpdater } = await import('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      logInfo('Atualização disponível', { version: info.version });
    });

    autoUpdater.on('error', (err) => {
      logWarn('Auto-update falhou', { message: err.message });
    });

    void autoUpdater.checkForUpdates().catch(() => undefined);
  } catch {
    logWarn('electron-updater não disponível');
  }
}
