import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { DESIGN_NOW, THEME_ID, screens } from './screens';

// Comportamento das telas sobre os dados simulados (MSW), em 1440 px e 360 px.

async function signIn(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('redigiai.mock.session', 'ana'));
}

async function scenario(page: Page, name: string) {
  await page.addInitScript((value) => localStorage.setItem('redigiai.mock.scenario', value), name);
}

async function choosePhoto(page: Page) {
  await page.getByRole('radio', { name: /Dissertação/ }).check();
  await page.getByLabel('Foto da folha').setInputFiles({
    name: 'foto-redacao.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(300 * 1024),
  });
}

function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe('páginas públicas', () => {
  test('Início apresenta a correção, mostra a conta da nota e leva aos temas', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uma correção que mostra onde e como melhorar.');
    const table = page.getByRole('table', { name: 'Cálculo da nota do exemplo' });
    await expect(table.getByRole('row')).toHaveCount(6);
    await expect(table.getByRole('row').nth(5)).toContainText('23 / 30');

    await page.getByRole('link', { name: 'Ver os temas' }).first().click();
    await expect(page).toHaveURL(/\/temas$/);
  });

  test('a correção de exemplo é pública', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Abrir uma correção completa →' }).click();

    await expect(page).toHaveURL(/\/exemplo$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fuvest – Dissertação – Algoritmos e o debate público');
    await expect(page.getByRole('button', { name: 'Ver foto original' })).toHaveCount(0);
  });

  test('Temas lista, busca e mostra o erro da API', async ({ page }) => {
    await page.goto('/temas');
    const cards = page.locator('main a[href^="/temas/"]');
    await expect(cards).toHaveCount(6);
    await expect(page.getByRole('button', { name: /Unicamp/ })).toBeDisabled();

    await page.getByRole('searchbox', { name: 'Buscar tema' }).fill('algoritmos');
    await expect(cards).toHaveCount(1);
    await page.getByRole('searchbox', { name: 'Buscar tema' }).fill('zzz');
    await expect(page.getByText('Nenhum tema encontrado para essa busca.')).toBeVisible();
  });

  test('Temas mostra a mensagem da API quando o catálogo falha', async ({ page }) => {
    await scenario(page, 'error');
    await page.goto('/temas');

    await expect(page.getByRole('alert')).toContainText('Algo deu errado do nosso lado. Tente novamente em instantes.');
  });

  test('rota logada sem sessão leva ao login e volta depois de entrar', async ({ page }) => {
    await page.goto('/perfil');
    await expect(page).toHaveURL(/\/entrar\?next=%2Fperfil$/);

    await page.getByRole('button', { name: 'Continuar com Google' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meu perfil');
  });
});

test.describe('envio', () => {
  test('o botão só libera com tipo e foto; a foto escolhida antes do login continua depois de entrar', async ({ page }) => {
    await page.goto(`/temas/${THEME_ID}`);
    const send = page.getByRole('button', { name: 'Enviar para correção' });
    await expect(send).toBeDisabled();

    await choosePhoto(page);
    await expect(page.getByText('Fuvest – Dissertação – Algoritmos e o debate público')).toBeVisible();
    await send.click();

    // Sem sessão: o rascunho fica guardado e o login abre.
    const login = page.getByRole('dialog', { name: 'Entre para enviar sua redação' });
    await expect(login.getByText('A foto está guardada. O envio continua depois de entrar.')).toBeVisible();
    await login.getByRole('button', { name: 'Continuar com Google' }).click();

    // De volta, a confirmação abre sozinha com a mesma foto.
    const confirm = page.getByRole('dialog', { name: 'Confirme o envio' });
    await expect(confirm.getByText('foto-redacao.jpg')).toBeVisible();
    await expect(confirm.getByText('1 correção', { exact: true })).toBeVisible();
    await expect(confirm.getByText('2 correções', { exact: true })).toBeVisible();
    await expect(confirm).toContainText('Não é possível trocar a foto nem cancelar o envio.');

    await confirm.getByRole('button', { name: 'Confirmar envio' }).click();
    await expect(page).toHaveURL(/\/painel$/);
    await expect(page.getByText('Lendo sua redação').filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator('main strong').first()).toHaveText('2');
  });

  test('envio em lote: cada foto é uma redação e o saldo precisa cobrir todas', async ({ page }) => {
    await signIn(page);
    await page.goto(`/temas/${THEME_ID}`);
    await page.getByRole('radio', { name: /Narrativa/ }).check();
    const files = [1, 2, 3, 4].map((index) => ({ name: `folha-${index}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.alloc(1024) }));
    await page.getByLabel('Foto da folha').setInputFiles(files);
    await expect(page.getByText('4 redações · Fuvest – Narrativa – Algoritmos e o debate público')).toBeVisible();

    await page.getByRole('button', { name: 'Enviar para correção' }).click();
    const confirm = page.getByRole('dialog', { name: 'Confirme o envio' });
    await expect(confirm.getByText('4 correções', { exact: true })).toBeVisible();
    await expect(confirm.getByRole('alert')).toContainText('Você não tem correções suficientes para este envio.');
    await expect(confirm.getByRole('button', { name: 'Confirmar envio' })).toBeDisabled();
    await expect(confirm.getByRole('link', { name: 'Comprar correções' })).toBeVisible();
  });

  test('arquivo que não é imagem é recusado com a mensagem da regra', async ({ page }) => {
    await page.goto(`/temas/${THEME_ID}`);
    await page.getByLabel('Foto da folha').setInputFiles({ name: 'redacao.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10) });

    await expect(page.getByRole('alert')).toHaveText('Envie uma foto JPG da folha, com até 10 MB.');
  });
});

test.describe('área logada', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(DESIGN_NOW);
    await signIn(page);
  });

  test('revisão: só envia com todas as palavras, confirma no modal e a redação vai para a fila', async ({ page }) => {
    await page.goto('/painel');
    await page.getByRole('region', { name: 'Precisa de você' }).getByRole('link', { name: 'Preencher palavras' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Não conseguimos ler 2 palavras');
    await expect(page.getByText('amanhã, 09:12')).toBeVisible();
    await expect(page.getByRole('button', { name: /Trocar foto|Cancelar/ })).toHaveCount(0);

    const send = page.getByRole('button', { name: 'Enviar para correção' });
    const fields = page.getByLabel('O que está escrito');
    await fields.nth(0).fill('controlam');
    await expect(page.getByText('1 de 2 preenchidas')).toBeVisible();
    await expect(send).toBeDisabled();

    // O que foi digitado continua lá depois de recarregar.
    await page.reload();
    await expect(fields.nth(0)).toHaveValue('controlam');

    await fields.nth(1).fill('recebe');
    await send.click();
    const confirm = page.getByRole('dialog', { name: 'Confira as palavras' });
    await expect(confirm).toContainText('Linha 6');
    await expect(confirm).toContainText('controlam');
    await confirm.getByRole('button', { name: 'Confirmar e enviar' }).click();

    await expect(page).toHaveURL(/\/painel$/);
    await expect(page.getByRole('region', { name: 'Precisa de você' })).toHaveCount(0);
  });

  test('revisão fora do prazo mostra a mensagem e leva de volta ao painel', async ({ page }) => {
    await scenario(page, 'expired');
    await page.goto('/redacoes/essay-review/revisao');
    const fields = page.getByLabel('O que está escrito');
    await fields.nth(0).fill('a');
    await fields.nth(1).fill('b');
    await page.getByRole('button', { name: 'Enviar para correção' }).click();
    const confirm = page.getByRole('dialog', { name: 'Confira as palavras' });
    await confirm.getByRole('button', { name: 'Confirmar e enviar' }).click();

    await expect(confirm.getByRole('alert')).toContainText('O prazo para preencher as palavras acabou.');
    await expect(confirm.getByRole('link', { name: 'Voltar para Minhas correções' })).toBeVisible();
  });

  test('correção: a marca leva ao critério, as linhas citadas ficam em destaque e a avaliação é enviada', async ({ page }) => {
    await page.goto('/redacoes/essay-v2');
    await expect(page.getByText('Enviada em 10/10 · 2ª versão · grade Fuvest v1')).toBeVisible();
    await expect(page.getByText('+2 desde a 1ª versão')).toBeVisible();

    await page.getByRole('button', { name: /À partir: ver o critério 4/ }).click();
    await expect(page.locator('#criterio-4')).toBeFocused();

    await page.getByRole('button', { name: 'Linhas 27 a 30' }).click();
    await expect(page.locator('[data-line="30"]')).toBeVisible();

    const feedback = page.locator('section', { hasText: 'Avalie esta correção' });
    await feedback.getByRole('button', { name: 'Enviar avaliação' }).click();
    await expect(feedback.getByRole('alert')).toHaveText('Escolha uma das opções para enviar a avaliação.');
    await feedback.getByRole('radio', { name: 'Ajudou em parte' }).check();
    await feedback.getByRole('button', { name: 'Enviar avaliação' }).click();
    await expect(feedback).toContainText('Obrigado.');
  });

  test('painel: estados vazio e de erro', async ({ page }) => {
    await scenario(page, 'empty');
    await page.goto('/painel');
    await expect(page.getByText('Você ainda não enviou nenhuma redação.')).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Ver os temas' })).toBeVisible();

    await page.evaluate(() => localStorage.setItem('redigiai.mock.scenario', 'error'));
    await page.addInitScript(() => localStorage.setItem('redigiai.mock.scenario', 'error'));
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('Algo deu errado do nosso lado.');
  });

  test('perfil: salva o nome, muda um aviso e só exclui a conta com a confirmação digitada', async ({ page }) => {
    await page.goto('/perfil');
    await page.getByLabel('Nome').fill('Ana Maria Souza');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByText('Alterações salvas.')).toBeVisible();

    const newThemes = page.getByRole('checkbox', { name: /Novos temas/ });
    await expect(newThemes).not.toBeChecked();
    await newThemes.click();
    await expect(newThemes).toBeChecked();

    await page.getByRole('button', { name: 'Excluir conta' }).click();
    const dialog = page.getByRole('dialog', { name: 'Excluir minha conta' });
    const confirm = dialog.getByRole('button', { name: 'Excluir conta' });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel('Digite "EXCLUIR" para confirmar').fill('EXCLUIR');
    await expect(confirm).toBeEnabled();
    await dialog.getByRole('button', { name: 'Manter a conta' }).click();

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
  });

});

test.describe('checkout', () => {
  test('checkout: o Pix mostra o código e libera as correções quando o pagamento é aprovado', async ({ page }) => {
    await signIn(page);
    await page.goto('/comprar');
    await expect(page.getByText('Você pode desistir em até 7 dias')).toBeVisible();
    await page.getByLabel('Quantidade').selectOption('2');
    await expect(page.getByText('R$ 32,00')).toBeVisible();
    await page.getByRole('button', { name: 'Gerar Pix' }).click();

    await expect(page.getByLabel('Pix copia e cola')).toHaveValue(/br\.gov\.bcb\.pix/);
    await expect(page.getByText('Pagamento aprovado')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText('correções disponíveis')).toBeVisible();
    await expect(page.locator('main strong').first()).toHaveText('5');
  });
});

test.describe('segurança no navegador', () => {
  test('a tela só mostra "aprovado" quando o backend confirma o pagamento', async ({ page }) => {
    await signIn(page);
    await page.goto('/comprar?pagamento=aprovado');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('Pagamento aprovado')).toHaveCount(0);
  });

  test('cartão: volta do checkout e mostra o resultado confirmado pelo backend', async ({ page }) => {
    await signIn(page);
    await page.goto('/comprar');
    await page.getByRole('radio', { name: 'Cartão de crédito', exact: true }).check();
    await page.getByRole('button', { name: 'Pagar com cartão' }).click();

    await expect(page).toHaveURL(/\/comprar\?pagamento=payment-/);
    await expect(page.getByText('Pagamento aprovado')).toBeVisible();
  });

  test('sair apaga a foto guardada e os dados do aluno', async ({ page }) => {
    await page.goto(`/temas/${THEME_ID}`);
    await choosePhoto(page);
    await page.getByRole('button', { name: 'Enviar para correção' }).click();
    await page.getByRole('dialog', { name: 'Entre para enviar sua redação' }).getByRole('button', { name: 'Continuar com Google' }).click();
    await page.getByRole('dialog', { name: 'Confirme o envio' }).getByRole('button', { name: 'Voltar e revisar' }).click();

    await page.getByRole('link', { name: 'Meu perfil' }).click();
    await expect(page.getByLabel('Nome')).toHaveValue('Ana Souza');
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();

    // A próxima pessoa no mesmo navegador não encontra a foto nem o rascunho.
    await page.goto(`/temas/${THEME_ID}`);
    await expect(page.getByText('Tire a foto ou arraste o arquivo')).toBeVisible();
    await expect(page.getByText('foto-redacao.jpg')).toHaveCount(0);
  });

  test('destino depois do login nunca sai do site', async ({ page }) => {
    await page.goto('/entrar?next=//evil.test/roubo');
    await page.getByRole('button', { name: 'Continuar com Google' }).click();

    await expect(page).toHaveURL(/localhost:4173\/temas$/);
  });
});

test.describe('largura da página', () => {
  for (const screen of screens) {
    test(`${screen.name} não rola para os lados`, async ({ page }) => {
      await page.clock.setFixedTime(DESIGN_NOW);
      if (screen.signedIn) {
        await signIn(page);
      }
      await page.goto(screen.path);
      await page.locator('#root header').first().waitFor();
      await page.waitForLoadState('networkidle');
      await screen.prepare?.(page);
      await page.evaluate(() => document.fonts.ready);

      expect(await overflow(page)).toBe(0);
    });
  }
});
