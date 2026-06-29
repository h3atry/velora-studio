import { CameraPreview, PreviewEmptyState } from '@/hooks/useCamera';
import { useHasEnabledCamera } from '@/hooks/useSceneSources';
import { useAppStore } from '@/stores/appStore';
import { SourcePreviewLayer } from '@/components/SourcePreviewLayer';

function PreviewFrame({
  label,
  aspect,
  isPrimary,
}: {
  label: string;
  aspect: 'portrait' | 'landscape';
  isPrimary?: boolean;
}) {
  const hasCamera = useHasEnabledCamera();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="mb-1 text-center text-xs text-pl-muted">
        {label}
        {isPrimary && <span className="ml-1 text-pl-accent">(principal)</span>}
      </p>
      <div className="relative mx-auto flex w-full min-h-0 flex-1 flex-col justify-center">
        {hasCamera ? (
          <CameraPreview aspect={aspect} className="mx-auto w-full" />
        ) : (
          <PreviewEmptyState aspect={aspect} />
        )}
        <SourcePreviewLayer />
      </div>
    </div>
  );
}

export function PreviewArea() {
  const previewMode = useAppStore((s) => s.previewMode);

  if (previewMode === 'portrait') {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex h-full max-w-sm flex-col">
          <PreviewFrame label="Retrato" aspect="portrait" isPrimary />
        </div>
      </div>
    );
  }

  if (previewMode === 'landscape') {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <PreviewFrame label="Paisagem" aspect="landscape" isPrimary />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <PreviewFrame label="Retrato" aspect="portrait" isPrimary />
      <PreviewFrame label="Paisagem" aspect="landscape" />
    </div>
  );
}
