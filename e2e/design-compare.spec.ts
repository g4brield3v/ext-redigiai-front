import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { openScreen, screens, viewports } from './screens';
import type { Device } from './screens';

// Ferramenta de comparação com as telas aprovadas (docs/04-construir-front.md, passo 4). Não é um teste:
// para cada tela, grava em design-diff a captura atual, a imagem aprovada e a diferença entre as duas
// (preto = igual). Uso: npx playwright test design-compare [-g 08-painel]

const reference = path.resolve(import.meta.dirname, '../../docs/telas/png');
const output = path.resolve(import.meta.dirname, '../design-diff');

test.describe('@local comparação com as telas aprovadas', () => {
  test.skip(({ viewport }) => viewport?.width !== 1440, 'roda uma vez só; os tamanhos são definidos aqui');

  for (const screen of screens) {
    for (const device of screen.devices ?? (Object.keys(viewports) as Device[])) {
      test(`${screen.name} · ${device}`, async ({ page, browser }) => {
        await openScreen(page, screen, device);
        const current = await page.screenshot({ fullPage: true, animations: 'disabled' });
        const approved = readFileSync(path.join(reference, `${screen.name}-${device}.png`));

        mkdirSync(output, { recursive: true });
        writeFileSync(path.join(output, `${screen.name}-${device}.atual.png`), current);

        // A diferença é desenhada por uma página auxiliar: as duas imagens sobrepostas em modo "difference".
        const diffPage = await browser.newPage({ viewport: viewports[device] });
        const toUrl = (image: Buffer) => `data:image/png;base64,${image.toString('base64')}`;
        await diffPage.setContent(
          `<body style="margin:0;background:#000"><div style="position:relative">
             <img id="a" src="${toUrl(approved)}" style="display:block">
             <img id="b" src="${toUrl(current)}" style="position:absolute;top:0;left:0;mix-blend-mode:difference">
           </div></body>`,
        );
        const sizes = await diffPage.evaluate(async () => {
          const [a, b] = [document.getElementById('a'), document.getElementById('b')] as HTMLImageElement[];
          await Promise.all([a!.decode(), b!.decode()]);
          return { approved: a!.naturalHeight, current: b!.naturalHeight };
        });
        writeFileSync(
          path.join(output, `${screen.name}-${device}.diferenca.png`),
          await diffPage.screenshot({ fullPage: true }),
        );
        await diffPage.close();

        console.log(`${screen.name}-${device}: altura aprovada ${sizes.approved}px, atual ${sizes.current}px`);
      });
    }
  }
});
