import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { UnifiedChatMessage } from '../chatTypes';
import { getChatMessages, getPerformanceStats } from '../chatService';

export function exportChatLog(format: 'json' | 'txt'): string {
  const messages = getChatMessages();
  const performance = getPerformanceStats();
  const dir = path.join(app.getPath('documents'), 'Velora', 'chat-logs');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `chat-${stamp}.${format}`);

  if (format === 'json') {
    fs.writeFileSync(
      file,
      JSON.stringify({ exportedAt: new Date().toISOString(), performance, messages }, null, 2),
      'utf-8'
    );
  } else {
    const header = [
      `Exportado: ${new Date().toISOString()}`,
      `TikTok viewers: ${performance.tiktokViewers} | Twitch viewers: ${performance.twitchViewers}`,
      `TikTok likes: ${performance.tiktokLikes} | Diamonds: ${performance.tiktokDiamonds}`,
      '---',
    ];
    const lines = messages.map(
      (m) => `[${new Date(m.timestamp).toISOString()}] [${m.platform}] ${m.displayName}: ${m.message}`
    );
    fs.writeFileSync(file, [...header, ...lines].join('\n'), 'utf-8');
  }

  return file;
}

export function filterMessages(
  messages: UnifiedChatMessage[],
  opts: { blockedWords: string[]; followersOnly: boolean }
): UnifiedChatMessage[] {
  return messages.filter((m) => {
    if (opts.followersOnly && !m.badges.includes('follower') && !m.badges.includes('fan')) {
      return false;
    }
    const lower = m.message.toLowerCase();
    return !opts.blockedWords.some((w) => w && lower.includes(w.toLowerCase()));
  });
}
