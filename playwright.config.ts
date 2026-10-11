import { defineConfig } from '@playwright/test';

// As telas precisam funcionar de 360 px a 1440 px (docs/02-frontend.md, princípio 9).
// Os testes rodam sobre o build de produção com os dados simulados (MSW) no lugar da API.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Mais de dois navegadores abrindo ao mesmo tempo travam a primeira carga em máquinas com pouca memória.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Os testes @local (comparação com as telas e regressão visual) dependem das fontes e do antialiasing da máquina.
  grepInvert: process.env.CI ? /@local/ : undefined,
  snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
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
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    env: { VITE_USE_MOCKS: 'true' },
  },
});
