import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { apiError, catalogHandlers, json, mockApi, renderApp, themes } from '../test/helpers';
import type { Auth } from './auth/AuthContext';
import { CompleteSignupPage } from './auth/CompleteSignupPage';
import { LoginPage } from './auth/LoginPage';
import { clearPendingSignup, savePendingSignup } from './auth/signup';
import { HomePage } from './home/HomePage';
import { ThemesPage } from './temas/ThemesPage';

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
  it('mostra o título, os preços e os caminhos para os temas', async () => {
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

  it('monta a tabela da nota com os critérios e pesos da grade publicada', async () => {
    mockApi(catalogHandlers);
    renderApp(<HomePage />);

    const table = await screen.findByRole('table', { name: 'Cálculo da nota do exemplo' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(6);
    expect(rows[1]).toHaveTextContent('1 · Tema, coletânea e autoria3× 39 / 12');
    expect(rows[3]).toHaveTextContent('3 · Coesão, coerência e progressão2× 36 / 12');
    expect(rows[5]).toHaveTextContent('Nota da grade27 / 40');
  });

  it('mostra a mensagem da API quando a grade não carrega', async () => {
    mockApi({ 'GET /v1/exams': apiError('INTERNAL_ERROR', 'Algo deu errado do nosso lado. Tente novamente em instantes.', 500) });
    renderApp(<HomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado do nosso lado. Tente novamente em instantes.');
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});

describe('Temas', () => {
  it('lista os vestibulares, com os que estão em breve desabilitados', async () => {
    mockApi(catalogHandlers);
    renderApp(<ThemesPage />, { route: '/temas' });

    const fuvest = await screen.findByRole('button', { name: /Fuvest/ });
    expect(fuvest).toHaveAttribute('aria-pressed', 'true');
    expect(await within(fuvest).findByText('Grade com 4 critérios')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unicamp Em breve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enem Em breve' })).toBeDisabled();
  });

  it('mostra cada tema com os tipos aceitos e o tamanho da coletânea', async () => {
    mockApi(catalogHandlers);
    renderApp(<ThemesPage />, { route: '/temas' });

    const card = await screen.findByRole('link', { name: /Algoritmos e o debate público/ });
    expect(card).toHaveAttribute('href', '/temas/th1');
    expect(within(card).getByText('Dissertação')).toBeInTheDocument();
    expect(within(card).getByText('Narrativa')).toBeInTheDocument();
    expect(within(card).getByText('Coletânea com 4 textos')).toBeInTheDocument();
    expect(screen.getByText('Coletânea com 1 texto')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. Tema da Fuvest' })).toBeInTheDocument();
  });

  it('busca com atraso e envia o termo para a API', async () => {
    const requests = mockApi({
      ...catalogHandlers,
      'GET /v1/exams/fuvest/themes': (_request, url) =>
        json(url.searchParams.get('q') ? themes.slice(1) : themes),
    });
    renderApp(<ThemesPage />, { route: '/temas' });
    await screen.findByRole('link', { name: /Algoritmos/ });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar tema' }), 'tempo');

    await waitFor(() => expect(screen.queryByRole('link', { name: /Algoritmos/ })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /O valor do tempo livre/ })).toBeInTheDocument();
    const searches = requests.filter((r) => r.url.pathname.endsWith('/themes') && r.url.searchParams.has('q'));
    // Uma chamada só, com o termo inteiro: nada de uma requisição por tecla.
    expect(searches.map((r) => r.url.searchParams.get('q'))).toEqual(['tempo']);
  });

  it('avisa quando a busca não encontra temas', async () => {
    mockApi({ ...catalogHandlers, 'GET /v1/exams/fuvest/themes': json([]) });
    renderApp(<ThemesPage />, { route: '/temas' });

    expect(await screen.findByText('Ainda não há temas disponíveis.')).toBeInTheDocument();
  });

  it('mostra a mensagem da API e deixa tentar de novo', async () => {
    let calls = 0;
    mockApi({
      ...catalogHandlers,
      'GET /v1/exams/fuvest/themes': () =>
        ++calls === 1 ? apiError('RATE_LIMITED', 'Muitas tentativas seguidas. Aguarde um minuto.', 429, true) : json(themes),
    });
    renderApp(<ThemesPage />, { route: '/temas' });

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
    savePendingSignup({ next: '/temas/th1' });
    const requests = mockApi({ 'GET /v1/me': json(profile) });
    renderApp(<CompleteSignupPage />, { route: '/entrar/concluir', path: '/entrar/concluir', auth: signedIn() });

    expect(await screen.findByTestId('location')).toHaveTextContent('/temas/th1');
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

    expect(await screen.findByTestId('location')).toHaveTextContent('/temas');
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

    expect(await screen.findByTestId('location')).toHaveTextContent('/temas');
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
});
