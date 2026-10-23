import { test } from '@playwright/test';
import { interceptCatalog } from './catalog';
import { signIn } from './session';

// Capturas da redação na correção de exemplo, para revisão visual (PR, comparação com as telas aprovadas).
// Só rodam com CAPTURE_DIR definido: CAPTURE_DIR=caminho npx playwright test e2e/captures.spec.ts
const dir = process.env.CAPTURE_DIR;
test.skip(!dir, 'Defina CAPTURE_DIR para gerar as capturas.');

const views = [
  { name: 'texto-corrido', button: 'Texto corrido' },
  { name: 'como-na-folha', button: 'Como na folha' },
];

for (const width of [1440, 390]) {
  test(`redação em ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'As larguras são definidas aqui; basta um projeto.');
    await page.setViewportSize({ width, height: 1000 });
    await interceptCatalog(page);
    await signIn(page);
    await page.goto('/exemplo');

    const paper = page.locator('#texto');
    const toggle = page.getByRole('group', { name: 'Como mostrar a redação' });
    // A tela é carregada sob demanda: espera a redação aparecer antes de procurar o seletor.
    await page.locator('[data-line]').first().waitFor();
    // A barra de seções fica fixa no topo e cobriria o começo do quadro na captura.
    await page.addStyleTag({ content: 'nav[aria-label="Seções da correção"] { position: static !important; }' });
    // Antes do seletor existir, há um modo só.
    const modes = (await toggle.count()) > 0 ? views : [{ name: 'antes', button: null }];
    for (const view of modes) {
      if (view.button) {
        await toggle.getByRole('button', { name: view.button }).click();
      }
      // Seleciona o apontamento 4 (linhas 10 e 11), como ao abrir a tela.
      await page.getByRole('button', { name: /^Apontamento 4:/ }).first().click();
      await page.keyboard.press('Escape');
      await paper.scrollIntoViewIfNeeded();
      await paper.screenshot({ path: `${dir}/${view.name}-${width}.png` });
    }
  });
}
