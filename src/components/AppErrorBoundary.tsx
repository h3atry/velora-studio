import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Velora UI crash:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0a0b12] p-8 text-center text-[#eef0f8]">
          <h1 className="text-lg font-semibold">Velora encontrou um erro</h1>
          <p className="max-w-md text-sm text-[#8b8fa8]">{this.state.error.message}</p>
          <button
            type="button"
            className="rounded-lg bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
