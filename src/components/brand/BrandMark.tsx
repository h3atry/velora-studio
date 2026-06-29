/**
 * Marca autoral Velora — núcleo luminoso com duas auroras (TikTok + Twitch).
 */
export function BrandMark({
  size = 24,
  className = '',
  variant = 'default',
}: {
  size?: number;
  className?: string;
  variant?: 'default' | 'mono' | 'on-dark';
}) {
  const uid = `vl-${size}`;
  const mono = variant === 'mono';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${uid}-core`} cx="50%" cy="42%" r="50%">
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#00e5cc" />
          <stop offset="1" stopColor="#7c5cff" stopOpacity="0.3" />
        </radialGradient>
        <linearGradient id={`${uid}-left`} x1="24" y1="20" x2="8" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00e5cc" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff4668" />
        </linearGradient>
        <linearGradient id={`${uid}-right`} x1="24" y1="20" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00e5cc" stopOpacity="0.9" />
          <stop offset="1" stopColor="#9b72f2" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Auroras */}
      <path
        d="M24 22 C18 26, 12 34, 8 42"
        stroke={mono ? 'currentColor' : `url(#${uid}-left)`}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M24 22 C30 26, 36 34, 40 42"
        stroke={mono ? 'currentColor' : `url(#${uid}-right)`}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />

      {/* Núcleo */}
      <circle
        cx="24"
        cy="20"
        r="7"
        fill={mono ? 'currentColor' : `url(#${uid}-core)`}
        filter={mono ? undefined : `url(#${uid}-glow)`}
      />

      {/* Anel sutil */}
      <circle
        cx="24"
        cy="20"
        r="10"
        stroke={mono ? 'currentColor' : '#7c5cff'}
        strokeWidth="0.75"
        strokeOpacity="0.35"
        fill="none"
      />
    </svg>
  );
}

export function BrandWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-sans font-semibold tracking-tight ${className}`}>
      Vel<span className="bg-gradient-to-r from-pl-primary-bright to-pl-accent bg-clip-text text-transparent">ora</span>
    </span>
  );
}
