import { BrowserWindow } from 'electron';

let activeOAuthWindow: BrowserWindow | null = null;

/** Janela modal estilo OBS — login Twitch/TikTok dentro do Velora. */
export function openOAuthWindow(authUrl: string, title = 'Conectar conta'): void {
  closeOAuthWindow();

  activeOAuthWindow = new BrowserWindow({
    width: 520,
    height: 780,
    minWidth: 400,
    minHeight: 560,
    title,
    autoHideMenuBar: true,
    backgroundColor: '#18181b',
    parent: BrowserWindow.getFocusedWindow() ?? undefined,
    modal: Boolean(BrowserWindow.getFocusedWindow()),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  activeOAuthWindow.on('closed', () => {
    activeOAuthWindow = null;
  });

  void activeOAuthWindow.loadURL(authUrl);
}

export function closeOAuthWindow(): void {
  if (activeOAuthWindow && !activeOAuthWindow.isDestroyed()) {
    activeOAuthWindow.close();
  }
  activeOAuthWindow = null;
}
