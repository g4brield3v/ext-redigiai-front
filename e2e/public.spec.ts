import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { THEME_ID, horizontalOverflow, interceptCatalog } from './catalog';

// Telas públicas, em 1440 px e 360 px. As respostas da API são interceptadas pelo teste.

test.beforeEach(async ({ page }) => {
  await interceptCatalog(page);
});

async function choosePhoto(page: Page) {
  await page.getByRole('radio', { name: /Dissertação/ }).check();
  await page.getByLabel('Foto da folha').setInputFiles({
    name: 'foto-redacao.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(300 * 1024),
  });
}

test.describe('Início', () => {
  test('apresenta a correção, mostra a conta da nota e leva aos temas', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uma correção que mostra onde e como melhorar.');
    const table = page.getByRole('table', { name: 'Cálculo da nota do exemplo' });
    await expect(table.getByRole('row')).toHaveCount(6);
    await expect(table.getByRole('row').nth(5)).toContainText('27 / 40');
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole('link', { name: 'Ver os temas' }).first().click();
    await expect(page).toHaveURL(/\/temas$/);
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
    const wide = page.viewportSize()!.width > 620;

    await expect(notes.first()).toBeVisible({ visible: wide });
    await expect(notes.last()).toBeVisible({ visible: !wide });
  });

  test('a correção de exemplo é pública e não oferece foto nem avaliação', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Abrir uma correção completa →' }).click();

    await expect(page).toHaveURL(/\/exemplo$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fuvest – Dissertação – Algoritmos e o debate público');
    await expect(page.getByText('+2 desde a 1ª versão')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver foto original' })).toHaveCount(0);
    await expect(page.getByText('Avalie esta correção')).toHaveCount(0);

    await page.getByRole('button', { name: /À partir: ver o critério 4/ }).click();
    await expect(page.locator('#criterio-4')).toBeFocused();
    await page.getByRole('button', { name: 'Linhas 27 a 30' }).click();
    await expect(page.locator('[data-line="30"]')).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('Temas', () => {
  test('lista vestibulares e temas, e a busca filtra pelo título', async ({ page }) => {
    await page.goto('/temas');
    const cards = page.locator('main a[href^="/temas/"]');

    await expect(page.getByRole('button', { name: /Fuvest/ })).toContainText('Grade com 4 critérios');
    await expect(page.getByRole('button', { name: /Unicamp/ })).toBeDisabled();
    await expect(cards).toHaveCount(3);
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole('searchbox', { name: 'Buscar tema' }).fill('silêncio');
    await expect(cards).toHaveCount(1);
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

test.describe('Proposta e coletânea', () => {
  test('mostra a proposta, a instrução de cada tipo e a coletânea inteira, e leva ao envio', async ({ page }) => {
    await page.goto(`/temas/${THEME_ID}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Algoritmos e o debate público' })).toBeVisible();
    await expect(page.getByText('Enunciado da proposta.')).toBeVisible();
    await expect(page.getByText('Defenda um ponto de vista.')).toBeVisible();
    await expect(page.getByText('Conte uma história com reflexão.')).toBeVisible();
    await expect(page.getByText('Trecho do texto 1.')).toBeVisible();
    await expect(page.getByText('Texto 2', { exact: true })).toBeVisible();
    // O tipo e a foto ficam na página de envio.
    await expect(page.getByRole('radio')).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole('link', { name: 'Enviar minha redação' }).click();

    await expect(page).toHaveURL(`/temas/${THEME_ID}/enviar`);
    await expect(page.getByRole('heading', { level: 1, name: 'Envie sua redação' })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(2);
    await expect(page.getByText('Trecho do texto 1.')).toHaveCount(0);
    await page.getByRole('link', { name: 'Ver proposta e coletânea' }).click();
    await expect(page).toHaveURL(`/temas/${THEME_ID}`);
  });

  test('no celular, o botão de enviar fica preso ao pé da tela', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`/temas/${THEME_ID}`);

    const button = page.getByRole('link', { name: 'Enviar minha redação' });
    await expect(button).toBeInViewport();
    await page.mouse.wheel(0, 600);
    await expect(button).toBeInViewport();
    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('Tema e envio', () => {
  test('o botão só libera com tipo e foto, e sem sessão a foto fica guardada e o login abre', async ({ page }) => {
    await page.goto(`/temas/${THEME_ID}/enviar`);
    const send = page.getByRole('button', { name: 'Enviar para correção' });
    await expect(send).toBeDisabled();

    await choosePhoto(page);
    await expect(page.getByText('Fuvest – Dissertação – Algoritmos e o debate público')).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);
    await send.click();

    await expect(page).toHaveURL(/\/entrar\?next=/);
    const login = page.getByRole('dialog', { name: 'Entre para enviar sua redação' });
    await expect(login.getByText('A foto está guardada. O envio continua depois de entrar.')).toBeVisible();
    await expect(login.getByText(/inclusive o envio do texto a um serviço de IA para correção/)).toBeVisible();
  });

  test('arquivo que não é imagem é recusado com a mensagem da regra', async ({ page }) => {
    await page.goto(`/temas/${THEME_ID}/enviar`);
    await page.getByLabel('Foto da folha').setInputFiles({ name: 'redacao.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10) });

    await expect(page.getByRole('alert')).toHaveText('Envie uma foto JPG da folha, com até 10 MB.');
  });
});

test.describe('rotas logadas', () => {
  for (const path of ['/painel', '/perfil', '/comprar', '/redacoes/abc', '/redacoes/abc/revisao']) {
    test(`${path} sem sessão leva ao login`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(path)}`);
      await expect(page.getByRole('dialog', { name: 'Entre para enviar sua redação' })).toBeVisible();
    });
  }

  test('o destino depois do login nunca aponta para fora do site', async ({ page }) => {
    await page.goto('/entrar?next=//evil.test/roubo');

    // O X do diálogo usa o mesmo destino validado.
    await page.getByRole('button', { name: 'Fechar' }).click();
    await expect(page).toHaveURL('/temas');
  });
});
