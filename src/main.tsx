import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/500.css';
import '@fontsource/schibsted-grotesk/600.css';
import '@fontsource/schibsted-grotesk/700.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/600.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { mocksEnabled } from './lib/env';
import { App } from './routes/App';
import './styles/global.css';

async function start() {
  if (mocksEnabled) {
    const { startMocks } = await import('./mocks/browser');
    await startMocks();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
