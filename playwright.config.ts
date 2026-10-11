import { defineConfig } from '@playwright/test';

// As telas precisam funcionar de 360 px a 1440 px (docs/02-frontend.md, princípio 9).
// Os testes cobrem as telas públicas sobre um build próprio (dist-e2e); as respostas da API são
// interceptadas dentro de cada teste. As telas logadas são testadas com o Vitest (src/**/*.test.tsx).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Mais de dois navegadores abrindo ao mesmo tempo travam a primeira carga em máquinas com pouca memória.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-360', use: { viewport: { width: 360, height: 740 }, hasTouch: true } },
  ],
  webServer: {
    // Build próprio dos testes (dist-e2e), separado do build de produção (dist).
    command: 'npm run build:e2e && npm run preview:e2e',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    // Sem chave do Clerk: os testes não dependem de um serviço externo de login.
    env: { VITE_CLERK_PUBLISHABLE_KEY: '', VITE_API_URL: 'http://localhost:5080' },
  },
});
