import { PlatformIcon, platformAccentClass } from '@/components/PlatformIcon';
import type { ChatBadge, ChatMessage } from '@/types';

const badgeLabels: Record<ChatBadge, string> = {
  prime: 'Prime',
  fan: 'Fã',
  mod: 'Mod',
  follower: 'Seguidor',
  vip: 'VIP',
  sub: 'Sub',
};

const badgeStyles: Record<ChatBadge, string> = {
  prime: 'bg-blue-600/30 text-blue-300',
  fan: 'bg-tiktok/20 text-tiktok',
  mod: 'bg-green-600/30 text-green-300',
  follower: 'bg-zinc-600/30 text-zinc-300',
  vip: 'bg-purple-600/30 text-purple-300',
  sub: 'bg-indigo-600/30 text-indigo-300',
};

export function ChatMessageLine({ msg }: { msg: ChatMessage }) {
  const nameColor = msg.nameColor ?? undefined;
  const borderColor = msg.platform === 'tiktok' ? 'border-l-tiktok' : 'border-l-twitch';

  return (
    <div
      className={`flex gap-2 border-l-2 py-1.5 pl-2 pr-1 ${borderColor} ${msg.platform === 'tiktok' ? 'bg-tiktok/5' : 'bg-twitch/5'}`}
    >
      <div className="mt-0.5 shrink-0">
        <PlatformIcon platform={msg.platform} size={14} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={`text-xs font-semibold ${!nameColor ? platformAccentClass(msg.platform) : ''}`}
            style={nameColor ? { color: nameColor } : undefined}
          >
            {msg.displayName}
          </span>

          {msg.badges.map((badge) => (
            <span
              key={badge}
              className={`rounded px-1 py-px text-[9px] font-medium leading-none ${badgeStyles[badge]}`}
            >
              {badgeLabels[badge]}
            </span>
          ))}
        </div>

        <p className="mt-0.5 break-words text-xs text-zinc-200">{msg.message}</p>
      </div>
    </div>
  );
}
