import { openOAuthWindow } from './oauthWindow';

export { waitForOAuthCallback } from './oauthHttpsServer';

export async function openOAuthUrl(url: string, title?: string): Promise<void> {
  openOAuthWindow(url, title);
}
