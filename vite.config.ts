import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// `npm run dev:mock`: dados simulados (MSW) e sessão simulada, sem backend nem Clerk.
if (process.env.npm_lifecycle_event === 'dev:mock') {
  process.env.VITE_USE_MOCKS = 'true';
}

export default defineConfig({
  plugins: [react()],
  // O .env fica na raiz do repositório, junto com o do back-end; só chaves VITE_ chegam ao navegador.
  envDir: '..',
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
