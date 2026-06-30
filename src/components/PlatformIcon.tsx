import type { Platform } from '@/types';

const TWITCH_PATH =
  'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z';

export function PlatformIcon({
  platform,
  size = 16,
  className = '',
  variant = 'brand',
}: {
  platform: Platform;
  size?: number;
  className?: string;
  /** brand = logos oficiais a cores; mono = cor unica (currentColor) */
  variant?: 'brand' | 'mono';
}) {
  const label = platform === 'tiktok' ? 'TikTok' : 'Twitch';

  if (platform === 'twitch') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        role="img"
        aria-label={label}
        className={`inline-block shrink-0 select-none ${className}`}
      >
        <path
          fill={variant === 'brand' ? '#9146FF' : 'currentColor'}
          d={TWITCH_PATH}
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={`inline-block shrink-0 select-none ${className}`}
    >
      {variant === 'brand' ? (
        <>
          <path
            fill="#25F4EE"
            d="M34.5 14.1V11a8.8 8.8 0 0 1-5.3-1.6v11.9a9.3 9.3 0 1 1-8.3-9.2v4.8a4.5 4.5 0 1 0 3.2 4.3V2h4.7a8.8 8.8 0 0 0 8.8 8.8v3.3a15.4 15.4 0 0 1-8.8-2.7V14.1z"
          />
          <path
            fill="#FE2C55"
            d="M32.5 12.1V9a8.8 8.8 0 0 1-5.3-1.6v11.9a9.3 9.3 0 1 1-8.3-9.2v4.8a4.5 4.5 0 1 0 3.2 4.3V0h4.7a8.8 8.8 0 0 0 8.8 8.8v3.3a15.4 15.4 0 0 1-8.8-2.7V12.1z"
          />
          <path
            fill="#000"
            d="M33 13.1V10a8.8 8.8 0 0 1-5.3-1.6v11.9a9.3 9.3 0 1 1-8.3-9.2v4.8a4.5 4.5 0 1 0 3.2 4.3V1h4.7a8.8 8.8 0 0 0 8.8 8.8v3.3a15.4 15.4 0 0 1-8.8-2.7V13.1z"
          />
        </>
      ) : (
        <path
          fill="currentColor"
          d="M33 13.1V10a8.8 8.8 0 0 1-5.3-1.6v11.9a9.3 9.3 0 1 1-8.3-9.2v4.8a4.5 4.5 0 1 0 3.2 4.3V1h4.7a8.8 8.8 0 0 0 8.8 8.8v3.3a15.4 15.4 0 0 1-8.8-2.7V13.1z"
        />
      )}
    </svg>
  );
}

export function platformAccentClass(platform: Platform) {
  return platform === 'tiktok' ? 'text-tiktok' : 'text-twitch';
}

export function platformBgClass(platform: Platform) {
  return platform === 'tiktok' ? 'bg-tiktok/15' : 'bg-twitch/15';
}
