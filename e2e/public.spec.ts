import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PROMPT_SLUG, horizontalOverflow, interceptCatalog } from './catalog';

// Telas públicas, em 1440 px e 360 px. As respostas da API são interceptadas pelo teste.

test.beforeEach(async ({ page }) => {
  await interceptCatalog(page);
});

async function choosePhoto(page: Page) {
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
    await expect(page).toHaveURL(/\/propostas$/);
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
    await expect(page.getByText('+4 desde a 1ª versão')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver foto original' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Enviar avaliação' })).toHaveCount(0);

    await page.getByRole('link', { name: /Escrita e vocabulário/ }).click();
    await expect(page.locator('#criterio-4')).toBeFocused();
    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('Propostas', () => {
  test('lista vestibulares e propostas, e a busca filtra pelo título', async ({ page }) => {
    await page.goto('/propostas');
    const cards = page.locator('main a[href^="/propostas/"]');

    await expect(page.getByRole('button', { name: /Fuvest/ })).toContainText('Grade com 4 critérios');
    await expect(page.getByRole('button', { name: /Unicamp/ })).toBeDisabled();
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toContainText('Dissertação em prosa');
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole('searchbox', { name: 'Buscar proposta' }).fill('silêncio');
    await expect(cards).toHaveCount(1);
    await page.getByRole('searchbox', { name: 'Buscar proposta' }).fill('zzz');
    await expect(page.getByText('Nenhuma proposta encontrada para essa busca.')).toBeVisible();
  });

  test('o endereço antigo da lista leva às propostas', async ({ page }) => {
    await page.goto('/temas');

    await expect(page).toHaveURL('/propostas');
  });

  test('mostra a mensagem da API quando o catálogo falha', async ({ page }) => {
    await page.route('**/v1/exams', (route) =>
      route.fulfill({
        status: 500,
        json: { code: 'INTERNAL_ERROR', message: 'Algo deu errado do nosso lado. Tente novamente em instantes.', retryable: false, traceId: 't' },
      }),
    );
    await page.goto('/propostas');

    await expect(page.getByRole('alert')).toContainText('Algo deu errado do nosso lado. Tente novamente em instantes.');
  });
});

test.describe('Proposta e coletânea', () => {
  test('mostra a coletânea, o comando e as instruções na ordem da prova, e leva ao envio', async ({ page }) => {
    await page.goto(`/propostas/${PROMPT_SLUG}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Algoritmos e o debate público' })).toBeVisible();
    await expect(page.getByText('20 a 30 linhas · com título')).toBeVisible();
    await expect(page.getByText('Trecho do texto 2, exatamente como na prova.')).toBeVisible();
    await expect(page.getByText('Primeiro verso da coluna três')).toBeVisible();
    await expect(page.getByText('Trecho do texto 4.')).toBeVisible();
    // O comando traz o negrito do cadastro, e as instruções começam pelo tipo de redação.
    await expect(page.locator('strong', { hasText: 'algoritmos e o debate público' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Tipo de redação:' })).toHaveText('Tipo de redação: dissertação em prosa.');
    // O aluno não escolhe tipo, nem aqui nem no envio.
    await expect(page.getByRole('radio')).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBe(0);

    await page.getByRole('link', { name: 'Enviar minha redação' }).first().click();

    await expect(page).toHaveURL(`/propostas/${PROMPT_SLUG}/enviar`);
    await expect(page.getByRole('heading', { level: 1, name: 'Envie sua redação' })).toBeVisible();
    await expect(page.getByText('Tipo de redação, definido pela proposta')).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByText('Trecho do texto 4.')).toHaveCount(0);
    await page.getByRole('link', { name: 'Ver coletânea' }).click();
    await expect(page).toHaveURL(`/propostas/${PROMPT_SLUG}`);
  });

  test('o verso fica em colunas lado a lado no computador e em sequência no celular', async ({ page }) => {
    await page.goto(`/propostas/${PROMPT_SLUG}`);
    const first = page.getByText('Primeiro verso da coluna um');
    const second = page.getByText('Primeiro verso da coluna dois');
    await expect(first).toBeVisible();
    const [a, b] = [(await first.boundingBox())!, (await second.boundingBox())!];

    if (page.viewportSize()!.width > 980) {
      expect(Math.abs(a.y - b.y)).toBeLessThan(2);
      expect(b.x).toBeGreaterThan(a.x);
    } else {
      expect(b.y).toBeGreaterThan(a.y);
      expect(Math.abs(a.x - b.x)).toBeLessThan(2);
    }
    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('Envio', () => {
  test('o botão libera com a foto, e sem sessão a foto fica guardada e o login abre', async ({ page }) => {
    await page.goto(`/propostas/${PROMPT_SLUG}/enviar`);
    const send = page.getByRole('button', { name: 'Enviar para correção' });
    await expect(send).toBeDisabled();
    // O título vem da API e já aparece antes da foto: não depende de nenhuma escolha do aluno.
    await expect(page.getByText('Fuvest – Dissertação – Algoritmos e o debate público')).toBeVisible();

    await choosePhoto(page);
    expect(await horizontalOverflow(page)).toBe(0);
    await send.click();

    await expect(page).toHaveURL(/\/entrar\?next=/);
    const login = page.getByRole('dialog', { name: 'Entre para enviar sua redação' });
    await expect(login.getByText('A foto está guardada. O envio continua depois de entrar.')).toBeVisible();
    await expect(login.getByText(/inclusive o envio do texto a um serviço de IA para correção/)).toBeVisible();
  });

  test('arquivo que não é imagem é recusado com a mensagem da regra', async ({ page }) => {
    await page.goto(`/propostas/${PROMPT_SLUG}/enviar`);
    await page.getByLabel('Foto da folha').setInputFiles({ name: 'redacao.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10) });

    await expect(page.getByRole('alert')).toHaveText('Envie uma foto JPG da folha, com até 10 MB.');
  });
});

test.describe('Administração', () => {
  for (const path of ['/admin', '/admin/propostas', '/admin/propostas/0198f0c0-0000-7000-8000-000000000001']) {
    test(`${path} sem sessão é a página de não encontrado, sem nenhuma chamada à administração`, async ({ page }) => {
      const calls: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/v1/admin')) {
          calls.push(request.url());
        }
      });

      await page.goto(path);

      await expect(page.getByRole('heading', { level: 1, name: 'Não encontramos essa página.' })).toBeVisible();
      // Nada indica que a área existe: nem o selo, nem o pedido de login.
      await expect(page.getByText('Admin', { exact: true })).toHaveCount(0);
      await expect(page).toHaveURL(path);
      expect(calls).toEqual([]);
    });
  }
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
    await expect(page).toHaveURL('/propostas');
  });
});
