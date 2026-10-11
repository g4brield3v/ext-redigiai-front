import { expect, test } from '@playwright/test';
import { horizontalOverflow, mockCatalog } from './catalog';

test.beforeEach(async ({ page }) => {
  await mockCatalog(page);
});

test.describe('Início', () => {
  test('apresenta a correção e leva aos temas', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uma correção que mostra onde e como melhorar.');
    await expect(page.getByText('Você só cria conta na hora de enviar.')).toBeVisible();
    await expect(page.getByRole('figure', { name: 'Exemplo de redação corrigida' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole('link', { name: 'Ver os temas' }).first().click();
    await expect(page).toHaveURL(/\/temas$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Escolha o vestibular e o tema');
  });

  test('mostra a conta da nota com a grade publicada', async ({ page }) => {
    await page.goto('/');

    const table = page.getByRole('table', { name: 'Cálculo da nota do exemplo' });
    await expect(table.getByRole('row')).toHaveCount(6);
    await expect(table.getByRole('row').nth(4)).toContainText('4 · Convenções da escrita e vocabulário');
    await expect(table.getByRole('row').nth(5)).toContainText('23 / 30');
  });

  test('"Como a nota é calculada" rola até a seção', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Como a nota é calculada' }).click();

    await expect(page).toHaveURL(/#nota$/);
    await expect(page.getByRole('heading', { name: 'A mesma conta da grade da Fuvest, à vista em toda correção.' })).toBeInViewport();
  });

  test('o comentário da correção fica na margem em telas largas e abaixo da linha em telas estreitas', async ({ page }) => {
    await page.goto('/');

    const sheet = page.getByRole('img', { name: 'Linhas 8 a 16 da redação com marcações do corretor' });
    const notes = sheet.getByText('"A partir", sem crase');
    const marked = sheet.getByText('À partir', { exact: true });
    const wide = page.viewportSize()!.width > 620;

    await expect(notes.first()).toBeVisible({ visible: wide });
    await expect(notes.last()).toBeVisible({ visible: !wide });

    const markBox = (await marked.boundingBox())!;
    const noteBox = (await (wide ? notes.first() : notes.last()).boundingBox())!;
    if (wide) {
      // Mesma pauta da marca.
      expect(Math.abs(noteBox.y + noteBox.height - (markBox.y + markBox.height))).toBeLessThan(12);
      expect(noteBox.x).toBeGreaterThan(markBox.x + markBox.width);
    } else {
      expect(noteBox.y).toBeGreaterThanOrEqual(markBox.y + markBox.height - 8);
      expect(noteBox.y - (markBox.y + markBox.height)).toBeLessThan(24);
    }
  });

  test('as perguntas frequentes abrem pelo teclado', async ({ page }) => {
    await page.goto('/');

    const question = page.getByText('Quanto tempo leva?');
    await question.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Normalmente poucos minutos.', { exact: false })).toBeVisible();
  });
});

test.describe('Temas', () => {
  test('lista vestibulares e temas sem rolagem lateral', async ({ page }) => {
    await page.goto('/temas');

    await expect(page.getByRole('button', { name: /Fuvest/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /Fuvest/ })).toContainText('Grade com 4 critérios');
    await expect(page.getByRole('button', { name: /Unicamp/ })).toBeDisabled();
    await expect(page.getByRole('link', { name: /Algoritmos e o debate público/ })).toContainText('Coletânea com 4 textos');
    await expect(page.locator('main a[href^="/temas/"]')).toHaveCount(3);
    expect(await horizontalOverflow(page)).toBe(0);
  });

  test('os cartões ficam em três colunas no computador e em uma no celular', async ({ page }) => {
    await page.goto('/temas');

    const cards = page.locator('main a[href^="/temas/"]');
    await expect(cards).toHaveCount(3);
    const [first, second] = [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!];

    if (page.viewportSize()!.width >= 980) {
      expect(second.y).toBe(first.y);
      expect(second.x).toBeGreaterThan(first.x);
    } else {
      expect(second.x).toBe(first.x);
      expect(second.y).toBeGreaterThan(first.y);
    }
  });

  test('a busca filtra pelo título', async ({ page }) => {
    await page.goto('/temas');

    await page.getByRole('searchbox', { name: 'Buscar tema' }).fill('silêncio');

    await expect(page.locator('main a[href^="/temas/"]')).toHaveCount(1);
    await expect(page.getByRole('link', { name: /Cidades e o direito ao silêncio/ })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Buscar tema' }).fill('zzz');
    await expect(page.getByText('Nenhum tema encontrado para essa busca.')).toBeVisible();
  });

  test('mostra a mensagem da API quando o catálogo falha', async ({ page }) => {
    await page.route('**/v1/exams', (route) =>
      route.fulfill({
        status: 500,
        json: { code: 'INTERNAL_ERROR', message: 'Algo deu errado do nosso lado. Tente novamente em instantes.', retryable: false, traceId: 't' },
      }),
    );
    await page.goto('/temas');

    await expect(page.getByRole('alert')).toContainText('Algo deu errado do nosso lado. Tente novamente em instantes.');
  });
});
