import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ChatStandaloneView } from './views/ChatStandaloneView';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { PersistBootstrap } from './components/PersistBootstrap';
import './index.css';

const params = new URLSearchParams(window.location.search);
const view = params.get('view');
const mode = params.get('mode') as 'popout' | 'overlay' | null;

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (typeof performance !== 'undefined') {
  performance.mark('velora-boot');
}

const tree =
  view === 'chat' && mode ? (
    <ChatStandaloneView mode={mode} />
  ) : (
    <PersistBootstrap>
      <App />
    </PersistBootstrap>
  );

root.render(
  <React.StrictMode>
    <AppErrorBoundary>{tree}</AppErrorBoundary>
  </React.StrictMode>
);

requestAnimationFrame(() => {
  if (typeof performance !== 'undefined') {
    performance.mark('velora-first-paint');
    try {
      performance.measure('velora-tti', 'velora-boot', 'velora-first-paint');
    } catch {
      /* marks ausentes */
    }
  }
});
