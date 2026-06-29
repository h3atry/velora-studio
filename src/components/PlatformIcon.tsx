import type { Platform } from '@/types';

const paths: Record<Platform, string> = {
  tiktok: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z',
  twitch: 'M11.64 5.5H9.5v7h2.14V5.5zm4.29 0h-2.14v7h2.14V5.5zM5 2L2.5 4.5v13L5 20h13l2.5-2.5V4.5L18 2H5zm11.5 13.5H7V6.5h9.5v9z',
};

const colors: Record<Platform, string> = {
  tiktok: '#ff4668',
  twitch: '#9b72f2',
};

export function PlatformIcon({
  platform,
  size = 16,
  className = '',
}: {
  platform: Platform;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={colors[platform]}
      className={className}
      aria-label={platform}
    >
      <path d={paths[platform]} />
    </svg>
  );
}

export function platformAccentClass(platform: Platform) {
  return platform === 'tiktok' ? 'text-tiktok' : 'text-twitch';
}

export function platformBgClass(platform: Platform) {
  return platform === 'tiktok' ? 'bg-tiktok/15' : 'bg-twitch/15';
}
