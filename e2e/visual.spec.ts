import { expect, test } from '@playwright/test';
import { openScreen, screens, viewports } from './screens';
import type { Device } from './screens';

// Regressão visual: cada tela, no estado da imagem aprovada, comparada com a captura guardada
// depois da conferência com docs/telas/png. As capturas dependem do sistema (fontes, antialiasing),
// por isso este arquivo roda só localmente (@local); o CI roda os testes de comportamento.
// Para aceitar uma mudança intencional: npx playwright test visual --update-snapshots

test.describe('@local regressão visual', () => {
  test.skip(({ viewport }) => viewport?.width !== 1440, 'roda uma vez só; os tamanhos são definidos aqui');

  for (const screen of screens) {
    for (const device of screen.devices ?? (Object.keys(viewports) as Device[])) {
      test(`${screen.name} · ${device}`, async ({ page }) => {
        await openScreen(page, screen, device);

        await expect(page).toHaveScreenshot(`${screen.name}-${device}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.002,
        });
      });
    }
  }
});
