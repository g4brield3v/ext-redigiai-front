import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { horizontalOverflow, interceptCatalog } from './catalog';
import { signIn } from './session';

// Tela da correção (docs/06-tela-correcao.md) sobre a correção de exemplo, que exige login: a sessão é a de teste,
// injetada por signIn. Em telas largas os apontamentos ficam no painel ao lado; nas estreitas, numa folha inferior.

test.beforeEach(async ({ page }) => {
  await interceptCatalog(page);
  await signIn(page);
  await page.goto('/exemplo');
});

const wide = (page: Page) => page.viewportSize()!.width > 980;
const pin = (page: Page, id: number) => page.getByRole('button', { name: new RegExp(`^Apontamento ${id}:`) });
const panel = (page: Page) => page.getByRole('complementary', { name: 'Apontamentos' });
const sheet = (page: Page) => page.getByRole('dialog');

test('nenhuma linha da redação é cortada e a página não rola para os lados', async ({ page }) => {
  const lines = page.locator('[data-line]');
  await expect(lines).toHaveCount(20);

  const clipped = await lines.evaluateAll((elements) =>
    elements.filter((element) => element.scrollWidth > element.clientWidth).map((element) => element.getAttribute('data-line')),
  );
  expect(clipped).toEqual([]);
  // O texto inteiro de cada linha está na tela, sobre a pauta.
  await expect(lines.nth(10)).toContainText('veem, e cada uma recebe só aquilo que gera mais engajamento.');
  expect(await horizontalOverflow(page)).toBe(0);
});

test('clicar num número seleciona o cartão, e clicar num cartão seleciona o número', async ({ page }) => {
  test.skip(!wide(page), 'O painel lateral só existe em telas largas.');
  const card = (id: number) => panel(page).locator(`[data-annotation-card="${id}"]`);

  // Abre com o primeiro apontamento do "Comece por aqui".
  await expect(card(4)).toHaveAttribute('aria-pressed', 'true');
  await expect(pin(page, 4)).toHaveAttribute('aria-pressed', 'true');

  await pin(page, 6).click();
  await expect(card(6)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(4)).toHaveAttribute('aria-pressed', 'false');
  await expect(card(6)).toBeInViewport();

  await card(1).click();
  await expect(pin(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await expect(pin(page, 1)).toBeInViewport();

  // O teclado percorre os apontamentos.
  await page.keyboard.press('j');
  await expect(card(2)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('k');
  await page.keyboard.press('k');
  await expect(card(8)).toHaveAttribute('aria-pressed', 'true');
});

test('"Tiraram pontos" com o critério 4 mostra só os desvios de escrita', async ({ page }) => {
  // No celular, a lista completa e os filtros abrem pelo botão flutuante.
  const list = wide(page) ? panel(page) : sheet(page);
  if (!wide(page)) {
    await page.getByRole('button', { name: 'Apontamentos (8)' }).click();
  }

  await list.getByRole('button', { name: /Tiraram pontos/ }).click();
  await list.getByRole('button', { name: /Escrita e vocabulário/ }).click();

  const cards = list.locator('[data-annotation-card]');
  await expect(cards).toHaveCount(3);
  await expect(cards).toContainText(['Regra: Vírgula entre sujeito e verbo', 'Regra: Marca de oralidade', 'Regra: Crase antes de verbo']);
  await expect(list.getByText('de 3 apontamentos')).toBeVisible();
  // Na folha, os outros apontamentos deixam de aparecer.
  await expect(page.locator('[data-line] button')).toHaveCount(3);
});

test('"Ver no texto" leva à redação, e o critério leva aos seus apontamentos', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver no texto' }).click();
  await expect(page.getByRole('heading', { name: 'Texto comentado' })).toBeInViewport();
  await expect(pin(page, 4)).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Ver 3 apontamentos no texto →' }).click();
  await expect(page.locator('[data-line] button')).toHaveCount(3);
  await expect(pin(page, 2)).toHaveAttribute('aria-pressed', 'true');
});

test('no celular, tocar num número abre o apontamento numa folha inferior', async ({ page }) => {
  test.skip(wide(page), 'Em telas largas os apontamentos ficam no painel ao lado.');

  await expect(panel(page)).toBeHidden();
  await pin(page, 6).click();
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page)).toContainText('Regra: Crase antes de verbo');
  await expect(sheet(page).getByText('Escreva')).toBeVisible();

  await sheet(page).getByRole('button', { name: 'Próximo →' }).click();
  await expect(sheet(page)).toContainText('Repertório próprio, além da coletânea: mostra autoria.');

  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();

  await page.getByRole('button', { name: 'Apontamentos (8)' }).click();
  await expect(sheet(page).locator('[data-annotation-card]')).toHaveCount(8);
  await sheet(page).getByRole('button', { name: 'Fechar' }).click();
  await expect(sheet(page)).toBeHidden();
  expect(await horizontalOverflow(page)).toBe(0);
});

test('os passos marcados no plano continuam marcados ao voltar', async ({ page }) => {
  const second = page.getByRole('checkbox', { name: /Passo 2/ });
  await second.check();
  await page.reload();

  await expect(second).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Passo 1/ })).not.toBeChecked();
});
