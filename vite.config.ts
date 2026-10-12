import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  // Os alunos de teste sem login nunca podem ir para um build publicado.
  if (command === 'build' && loadEnv(mode, process.cwd(), 'VITE_').VITE_DEV_AUTH === 'true') {
    throw new Error('VITE_DEV_AUTH=true só vale no servidor de desenvolvimento. Remova a variável para gerar o build.');
  }

  return {
    plugins: [react()],
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
