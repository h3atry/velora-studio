import { app, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function iconCandidates(): string[] {
  const root = app.isPackaged ? app.getAppPath() : path.join(moduleDir, '..');
  return [
    path.join(root, 'public', 'brand', 'icon.ico'),
    path.join(root, 'dist', 'brand', 'icon.ico'),
    path.join(root, 'public', 'brand', 'icon.png'),
    path.join(root, 'dist', 'brand', 'icon.png'),
    path.join(process.cwd(), 'public', 'brand', 'icon.ico'),
    path.join(process.cwd(), 'public', 'brand', 'icon.png'),
  ];
}

export function resolveAppIconPath(): string | undefined {
  return iconCandidates().find((p) => fs.existsSync(p));
}

export function resolveAppIcon() {
  const iconPath = resolveAppIconPath();
  if (!iconPath) return undefined;
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? undefined : image;
}

export function applyAppIcon(win: Electron.BrowserWindow): void {
  const icon = resolveAppIcon();
  if (icon) win.setIcon(icon);
}

export function configureAppIdentity(): void {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.velora.studio');
  }
  const iconPath = resolveAppIconPath();
  if (iconPath && process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) app.dock?.setIcon(icon);
  }
}
