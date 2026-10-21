import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { apiError, catalogHandlers, json, mockApi, prompts, renderApp } from '../test/helpers';
import type { Auth } from './auth/AuthContext';
import { CompleteSignupPage } from './auth/CompleteSignupPage';
import { LoginPage } from './auth/LoginPage';
import { clearPendingSignup, savePendingSignup } from './auth/signup';
import { HomePage } from './home/HomePage';
import { PromptsPage } from './propostas/PromptsPage';
import { RequireAuth } from '../routes/App';

const profile = {
  id: '0198f0c0-0000-7000-8000-0000000000aa',
  email: 'ana@example.com',
  name: 'Ana',
  termsAcceptanceRequired: false,
  aiNoticeAccepted: false,
  emailPreferences: { correctionReady: true, illegibleReminder: true, newThemes: false },
  credits: { total: 1, buckets: [{ source: 'trial', remaining: 1, expiresAt: null }] },
};

function signedIn(signOut = vi.fn(async () => {})): Auth {
  return { mode: 'clerk', isLoaded: true, isSignedIn: true, initial: 'A', signOut };
}

describe('Início', () => {
  it('mostra o título, os preços e os caminhos para as propostas', async () => {
    mockApi(catalogHandlers);
    renderApp(<HomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Uma correção que mostra onde e como melhorar.');
    expect(screen.getByText('Você só cria conta na hora de enviar.')).toBeInTheDocument();
    expect(screen.getByText('R$ 39,90')).toBeInTheDocument();
    expect(screen.getByText('R$ 16')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Ver os temas' })).toHaveLength(2);
    expect(
      screen.getByText('Correções feitas por IA com base nos critérios públicos da Fuvest. Não é afiliado à Fuvest.'),
    ).toBeInTheDocument();
    await screen.findByRole('table', { name: 'Cálculo da nota do exemplo' });
  });

  it('monta a tabela da nota com os critérios e pesos da grade publicada, sem chamar a API', async () => {
    const requests = mockApi({});
    renderApp(<HomePage />);

    const table = await screen.findByRole('table', { name: 'Cálculo da nota do exemplo' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(6);
    expect(rows[1]).toHaveTextContent('1 · Compreensão e desenvolvimento do tema, uso da coletânea e autoria3× 39 / 12');
    expect(rows[3]).toHaveTextContent('3 · Recursos linguísticos (coesão e coerência) e progressão textual2× 36 / 12');
    expect(rows[5]).toHaveTextContent('Nota da grade27 / 40');
    // A página é pública e o catálogo exige login: nada é pedido à API.
    expect(requests).toHaveLength(0);
  });
});

describe('Propostas', () => {
  it('lista os vestibulares, com os que estão em breve desabilitados', async () => {
    mockApi(catalogHandlers);
    renderApp(<PromptsPage />, { route: '/propostas' });

    const fuvest = await screen.findByRole('button', { name: /Fuvest/ });
    expect(fuvest).toHaveAttribute('aria-pressed', 'true');
    expect(await within(fuvest).findByText('Grade com 4 critérios')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unicamp Em breve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enem Em breve' })).toBeDisabled();
  });

  it('mostra cada proposta com o tipo definido no cadastro, o resumo e o tamanho da coletânea', async () => {
    mockApi(catalogHandlers);
    renderApp(<PromptsPage />, { route: '/propostas' });

    const card = await screen.findByRole('link', { name: /Algoritmos e o debate público/ });
    expect(card).toHaveAttribute('href', '/propostas/algoritmos-e-o-debate-publico');
    // Um tipo só, como a prova pede: o aluno não escolhe.
    expect(within(card).getByText('Dissertação em prosa')).toBeInTheDocument();
    expect(within(card).queryByText('Narrativa')).toBeNull();
    expect(within(card).getByText('Coletânea com tirinha, poema e dois textos.')).toBeInTheDocument();
    expect(within(card).getByText('Coletânea com 4 textos')).toBeInTheDocument();
    expect(screen.getByText('Coletânea com 1 texto')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. Propostas da Fuvest' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Etapas' })).toHaveTextContent('1 · Vestibular2 · Proposta3 · Escrever4 · Envio');
  });

  it('busca com atraso e envia o termo para a API', async () => {
    const requests = mockApi({
      ...catalogHandlers,
      'GET /v1/exams/fuvest/prompts': (_request, url) =>
        json(url.searchParams.get('q') ? prompts.slice(1) : prompts),
    });
    renderApp(<PromptsPage />, { route: '/propostas' });
    await screen.findByRole('link', { name: /Algoritmos/ });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar proposta' }), 'tempo');

    await waitFor(() => expect(screen.queryByRole('link', { name: /Algoritmos/ })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /O valor do tempo livre/ })).toBeInTheDocument();
    const searches = requests.filter((r) => r.url.pathname.endsWith('/prompts') && r.url.searchParams.has('q'));
    // Uma chamada só, com o termo inteiro: nada de uma requisição por tecla.
    expect(searches.map((r) => r.url.searchParams.get('q'))).toEqual(['tempo']);
  });

  it('avisa quando não há propostas', async () => {
    mockApi({ ...catalogHandlers, 'GET /v1/exams/fuvest/prompts': json([]) });
    renderApp(<PromptsPage />, { route: '/propostas' });

    expect(await screen.findByText('Ainda não há propostas disponíveis.')).toBeInTheDocument();
  });

  it('mostra a mensagem da API e deixa tentar de novo', async () => {
    let calls = 0;
    mockApi({
      ...catalogHandlers,
      'GET /v1/exams/fuvest/prompts': () =>
        ++calls === 1 ? apiError('RATE_LIMITED', 'Muitas tentativas seguidas. Aguarde um minuto.', 429, true) : json(prompts),
    });
    renderApp(<PromptsPage />, { route: '/propostas' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas seguidas. Aguarde um minuto.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('link', { name: /Algoritmos/ })).toBeInTheDocument();
  });
});

describe('Login', () => {
  it('sem login configurado, avisa e mantém o texto de aceite', () => {
    renderApp(<LoginPage />, { route: '/entrar' });

    expect(screen.getByRole('heading', { name: 'Entre para enviar sua redação' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('O login não está configurado neste ambiente.');
    expect(screen.getByText(/inclusive o envio do texto a um serviço de IA para correção/)).toBeInTheDocument();
  });

  it('quem já entrou segue para concluir o acesso', () => {
    renderApp(<LoginPage />, { route: '/entrar', path: '/entrar', auth: signedIn() });

    expect(screen.getByTestId('location')).toHaveTextContent('/entrar/concluir');
  });
});

describe('Primeiro acesso', () => {
  it('quem já tem cadastro volta para onde estava', async () => {
    savePendingSignup({ next: '/propostas/algoritmos' });
    const requests = mockApi({ 'GET /v1/me': json(profile) });
    renderApp(<CompleteSignupPage />, { route: '/entrar/concluir', path: '/entrar/concluir', auth: signedIn() });

    expect(await screen.findByTestId('location')).toHaveTextContent('/propostas/algoritmos');
    expect(requests.some((r) => r.method === 'POST')).toBe(false);
    clearPendingSignup();
  });

  it('com a data informada no login, cadastra sem perguntar de novo', async () => {
    savePendingSignup({ birthDate: '2008-05-17' });
    const requests = mockApi({
      'GET /v1/me': apiError('PROFILE_NOT_FOUND', 'Conclua o seu cadastro para continuar.', 404),
      'POST /v1/me': json(profile, 201),
    });
    renderApp(<CompleteSignupPage />, { route: '/entrar/concluir', path: '/entrar/concluir', auth: signedIn() });

    expect(await screen.findByTestId('location')).toHaveTextContent('/propostas');
    expect(requests.filter((r) => r.method === 'POST').map((r) => r.body)).toEqual([
      { birthDate: '2008-05-17', termsAccepted: true },
    ]);
  });

  it('sem a data, pede a data de nascimento e valida o formato', async () => {
    const requests = mockApi({
      'GET /v1/me': apiError('PROFILE_NOT_FOUND', 'Conclua o seu cadastro para continuar.', 404),
      'POST /v1/me': json(profile, 201),
    });
    renderApp(<CompleteSignupPage />, { route: '/entrar/concluir', path: '/entrar/concluir', auth: signedIn() });

    const input = await screen.findByLabelText('Data de nascimento');
    await userEvent.type(input, '3102');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Informe a data no formato dd/mm/aaaa.')).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST')).toBe(false);

    await userEvent.clear(input);
    await userEvent.type(input, '17052008');
    expect(input).toHaveValue('17/05/2008');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/propostas');
    expect(requests.find((r) => r.method === 'POST')?.body).toEqual({ birthDate: '2008-05-17', termsAccepted: true });
  });

  it('menor de 16 vê a mensagem da API e só pode sair', async () => {
    savePendingSignup({ birthDate: '2012-05-17' });
    const signOut = vi.fn(async () => {});
    mockApi({
      'GET /v1/me': apiError('PROFILE_NOT_FOUND', 'Conclua o seu cadastro para continuar.', 404),
      'POST /v1/me': apiError('AGE_BELOW_MINIMUM', 'A plataforma é destinada a pessoas com 16 anos ou mais.', 422),
    });
    renderApp(<CompleteSignupPage />, { route: '/entrar/concluir', path: '/entrar/concluir', auth: signedIn(signOut) });

    expect(await screen.findByRole('alert')).toHaveTextContent('A plataforma é destinada a pessoas com 16 anos ou mais.');
    expect(screen.queryByLabelText('Data de nascimento')).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sair' }));
    expect(signOut).toHaveBeenCalledOnce();
    clearPendingSignup();
  });

  it('sem sessão, volta para o login', () => {
    renderApp(<CompleteSignupPage />, { route: '/entrar/concluir', path: '/entrar/concluir' });

    expect(screen.getByTestId('location')).toHaveTextContent('/entrar');
  });

  it('cadastro já feito: volta para o ?next= da rota logada', async () => {
    mockApi({ 'GET /v1/me': json({ id: 'u1', email: 'ana@example.com' }) });
    renderApp(<CompleteSignupPage />, { route: '/entrar/concluir?next=%2Fpainel', path: '/entrar/concluir', auth: signedIn() });

    expect(await screen.findByTestId('location')).toHaveTextContent('/painel');
  });
});

describe('Rota logada', () => {
  const profile = { id: 'u1', email: 'ana@example.com', name: 'Ana', isAdmin: false, termsAcceptanceRequired: false };

  it('com sessão e sem cadastro, vai concluir o cadastro e guarda para onde voltar', async () => {
    mockApi({ 'GET /v1/me': apiError('PROFILE_NOT_FOUND', 'Conclua o cadastro.', 404) });
    renderApp(<RequireAuth><p>painel</p></RequireAuth>, { route: '/painel', path: '/painel', auth: signedIn() });

    expect(await screen.findByTestId('location')).toHaveTextContent('/entrar/concluir?next=%2Fpainel');
  });

  it('termos novos: pede o aceite antes da tela e a mostra depois de aceitar', async () => {
    const requests = mockApi({
      'GET /v1/me': json({ ...profile, termsAcceptanceRequired: true }),
      'POST /v1/me/terms': json(profile),
    });
    renderApp(<RequireAuth><p>painel</p></RequireAuth>, { route: '/painel', path: '/painel', auth: signedIn() });

    expect(await screen.findByRole('heading', { name: 'Termos de uso e Política de privacidade' })).toBeInTheDocument();
    expect(screen.queryByText('painel')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('painel')).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST' && r.url.pathname === '/v1/me/terms')).toBe(true);
  });
});
