import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** A chave da sessão injetada pelos testes de navegador (src/features/auth/E2eAuthProvider.tsx). */
const E2E_SESSION_MARKER = '__redigiaiE2eSession';

/**
 * A sessão de teste só pode existir no build dos testes de navegador (`--mode e2e`). Qualquer outro build que a
 * contenha falha: nenhum site publicado aceita uma sessão que não vem do Clerk.
 */
function rejectTestSession(mode: string): Plugin {
  return {
    name: 'reject-test-session',
    apply: 'build',
    generateBundle(_, bundle) {
      if (mode === 'e2e') {
        return;
      }
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk' && file.code.includes(E2E_SESSION_MARKER)) {
          this.error(`O build "${mode}" contém a sessão de teste (${file.fileName}). Ela só pode existir com --mode e2e.`);
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), rejectTestSession(mode)],
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
}));
