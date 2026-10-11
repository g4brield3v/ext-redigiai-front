import { rmSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// `npm run dev:mock`: dados simulados (MSW) e sessão simulada, sem backend nem Clerk.
if (process.env.npm_lifecycle_event === 'dev:mock') {
  process.env.VITE_USE_MOCKS = 'true';
}

/** O service worker do MSW fica em public/ para o desenvolvimento; não vai para o build de produção. */
function dropMockWorker(enabled: boolean): Plugin {
  return {
    name: 'drop-mock-worker',
    apply: 'build',
    closeBundle() {
      if (enabled) {
        rmSync(path.resolve(import.meta.dirname, 'dist', 'mockServiceWorker.js'), { force: true });
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // O .env fica na raiz do repositório, junto com o do back-end; só chaves VITE_ chegam ao navegador.
  const envDir = '..';
  const mocks = (process.env.VITE_USE_MOCKS ?? loadEnv(mode, envDir, 'VITE_').VITE_USE_MOCKS) === 'true';
  const production = command === 'build' && mode !== 'e2e';
  if (production && mocks) {
    throw new Error('VITE_USE_MOCKS=true não pode ser usado num build de produção. Use `npm run dev:mock` ou o build de teste (--mode e2e).');
  }

  return {
    plugins: [react(), dropMockWorker(production)],
    envDir,
    server: { port: 5173, strictPort: true },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  };
});
