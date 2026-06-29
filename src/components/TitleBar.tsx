import type { CSSProperties } from 'react';
import { BrandMark, BrandWordmark } from '@/components/brand/BrandMark';

export function TitleBar() {
  return (
    <div
      className="pl-titlebar flex h-9 shrink-0 items-center justify-center gap-2.5 text-xs"
      style={{ WebkitAppRegion: 'drag' } as CSSProperties}
    >
      <BrandMark size={20} />
      <BrandWordmark className="text-sm text-pl-text" />
      <span className="pl-chip ml-1 hidden sm:inline-flex">Live Studio</span>
    </div>
  );
}
