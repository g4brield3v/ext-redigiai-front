import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { exampleLines } from '../src/features/correcao/example';
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

  // Abre com o primeiro apontamento da ordem por importância.
  await expect(card(4)).toHaveAttribute('aria-current', 'true');
  await expect(pin(page, 4)).toHaveAttribute('aria-pressed', 'true');

  await pin(page, 6).click();
  await expect(card(6)).toHaveAttribute('aria-current', 'true');
  await expect(card(4)).not.toHaveAttribute('aria-current');
  await expect(card(6)).toBeInViewport();

  // Em "Por linha", todos os cartões aparecem, inclusive os que funcionaram.
  await panel(page).getByRole('button', { name: 'Por linha' }).click();
  await card(1).click();
  await expect(pin(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await expect(pin(page, 1)).toBeInViewport();

  // O teclado percorre os apontamentos.
  await page.keyboard.press('j');
  await expect(card(2)).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('k');
  await page.keyboard.press('k');
  await expect(card(8)).toHaveAttribute('aria-current', 'true');
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
  // Na folha o cartão já vem aberto: o porquê e o campo para tentar.
  await expect(sheet(page).getByText('Por quê')).toBeVisible();
  await expect(sheet(page).getByRole('button', { name: 'Ver resposta' })).toBeVisible();

  // Por importância, depois do último ajuste de escrita volta ao primeiro da lista.
  await sheet(page).getByRole('button', { name: 'Próximo →' }).click();
  await expect(sheet(page)).toContainText('Este parágrafo repete a ideia das linhas 6 a 8');

  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();

  // Na lista, os três que funcionaram ficam recolhidos.
  await page.getByRole('button', { name: 'Apontamentos (8)' }).click();
  await expect(sheet(page).locator('[data-annotation-card]')).toHaveCount(5);
  await sheet(page)
    .getByRole('button', { name: /3 trechos que funcionaram/ })
    .click();
  await expect(sheet(page).locator('[data-annotation-card]')).toHaveCount(8);
  await sheet(page).getByRole('button', { name: 'Fechar' }).click();
  await expect(sheet(page)).toBeHidden();
  expect(await horizontalOverflow(page)).toBe(0);
});

test('cada linha da folha está inteira no texto corrido e a página não rola para os lados', async ({ page }) => {
  const lines = page.locator('[data-line]');
  await expect(lines).toHaveCount(exampleLines.length);

  // O texto de cada linha, sem os números dos apontamentos e da linha: tem que ser exatamente o que o aluno escreveu.
  const texts = await lines.evaluateAll((elements) =>
    elements.map((element) => {
      const copy = element.cloneNode(true) as Element;
      copy.querySelectorAll('button, [aria-hidden="true"]').forEach((extra) => extra.remove());
      return copy.textContent;
    }),
  );
  expect(texts).toEqual(exampleLines.map((line) => line.text));
  expect(await horizontalOverflow(page)).toBe(0);
});

test('clicar no número de um apontamento seleciona o cartão', async ({ page }) => {
  await pin(page, 6).click();

  if (wide(page)) {
    await expect(panel(page).locator('[data-annotation-card="6"]')).toHaveAttribute('aria-current', 'true');
  } else {
    await expect(sheet(page)).toContainText('Regra: Crase antes de verbo');
  }
  await expect(pin(page, 6)).toHaveAttribute('aria-pressed', 'true');
});

test('o número da linha não quebra a pauta (cada parágrafo tem altura múltipla de 40 px)', async ({ page }) => {
  const paragraphs = page.locator('#texto p:has([data-line])');
  await expect(paragraphs).toHaveCount(5);

  const heights = await paragraphs.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  for (const height of heights) {
    expect(height % 40).toBeCloseTo(0, 1);
  }
});

test('os passos marcados no plano continuam marcados ao voltar', async ({ page }) => {
  const second = page.getByRole('checkbox', { name: /Passo 2/ });
  await second.check();
  await page.reload();

  await expect(second).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Passo 1/ })).not.toBeChecked();
});

// Versão 3 · aprendizado (docs/09-aprendizado-correcao.md, B5).

/** O cartão aberto de um apontamento: no painel, em telas largas; na folha inferior, nas estreitas. */
async function openCard(page: Page, id: number) {
  await pin(page, id).click();
  return (wide(page) ? panel(page) : sheet(page)).locator(`[data-annotation-card="${id}"]`);
}

test('Enter no campo mostra a resposta, que antes não está na página', async ({ page }) => {
  const card = await openCard(page, 6);
  await expect(card.getByText('Forma correta', { exact: true })).toHaveCount(0);

  const field = card.getByRole('textbox', { name: 'Como você escreveria?' });
  await field.fill('a partir');
  await field.press('Enter');

  await expect(card.getByText('Você escreveu')).toBeVisible();
  await expect(card.getByText('Forma correta', { exact: true })).toBeVisible();
  await expect(card.getByText('✓ Igual à forma correta')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Ver resposta' })).toHaveCount(0);
});

test('clicar num número verde abre os que funcionaram e seleciona o cartão', async ({ page }) => {
  if (wide(page)) {
    const fold = panel(page).getByRole('button', {
      name: /3 trechos que funcionaram/,
    });
    await expect(fold).toHaveAttribute('aria-expanded', 'false');
    await expect(panel(page).locator('[data-annotation-card="7"]')).toHaveCount(0);

    await pin(page, 7).click();
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    await expect(panel(page).locator('[data-annotation-card="7"]')).toHaveAttribute('aria-current', 'true');
    await expect(panel(page).getByText('de 8 apontamentos')).toBeVisible();
  } else {
    await pin(page, 7).click();
    await expect(sheet(page)).toContainText('Repertório próprio, além da coletânea: mostra autoria.');
    // Abertos, os que funcionaram entram no Anterior/Próximo.
    await expect(sheet(page).getByText('de 8 apontamentos')).toBeVisible();
  }
  await expect(pin(page, 7)).toHaveAttribute('aria-pressed', 'true');
});

test('"Por linha" e "Por importância" mudam a ordem dos cartões e o Anterior/Próximo', async ({ page }) => {
  const list = wide(page) ? panel(page) : sheet(page);
  if (!wide(page)) {
    await page.getByRole('button', { name: 'Apontamentos (8)' }).click();
  }
  const ids = () =>
    list.locator('[data-annotation-card]').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-annotation-card')));
  const current = list.locator('[data-annotation-card][aria-current="true"]');

  await expect(list.getByRole('button', { name: 'Por importância' })).toHaveAttribute('aria-pressed', 'true');
  await expect(list.getByText('Corrija primeiro')).toBeVisible();
  expect(await ids()).toEqual(['4', '8', '2', '5', '6']);
  await expect(current).toHaveAttribute('data-annotation-card', '4');
  await list.getByRole('button', { name: 'Próximo →' }).click();
  await expect(current).toHaveAttribute('data-annotation-card', '8');

  await list.getByRole('button', { name: 'Por linha' }).click();
  await expect(list.getByRole('button', { name: 'Por linha' })).toHaveAttribute('aria-pressed', 'true');
  await expect(list.getByText('Corrija primeiro')).toHaveCount(0);
  expect(await ids()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  // Por linha, o 8 é o último: o Próximo dá a volta até o 1.
  await list.getByRole('button', { name: 'Próximo →' }).click();
  await expect(current).toHaveAttribute('data-annotation-card', '1');
});

test('com um cartão aberto e a resposta à mostra, a página não rola para os lados', async ({ page }) => {
  const card = await openCard(page, 4);
  await card
    .getByRole('textbox')
    .fill('Além disso, uma frase bem comprida que o aluno escreveu para ver se o cartão quebra a linha direito');
  await card.getByRole('button', { name: 'Ver resposta' }).click();
  await expect(card.getByText('Uma forma possível')).toBeVisible();

  expect(await horizontalOverflow(page)).toBe(0);
});
