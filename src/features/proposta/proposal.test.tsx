import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RichText } from '../../components/RichText';
import { apiError, catalogHandlers, json, mockApi, prompt, promptSlug, renderApp } from '../../test/helpers';
import type { Auth } from '../auth/AuthContext';
import { clearDraft } from '../envio/draft';
import { SubmitPage } from '../envio/SubmitPage';
import { ProposalPage } from './ProposalPage';
import { genreInSentence } from './summary';

// O envio da foto ao Cloudinary fica de fora: aqui interessa o que vai para a API.
vi.mock('../envio/photo', async (original) => ({
  ...(await original<typeof import('../envio/photo')>()),
  uploadPhoto: vi.fn(async () => 'asset-1'),
}));

const proposalRoute = { route: `/propostas/${promptSlug}`, path: '/propostas/:slug' };
const submitRoute = { route: `/propostas/${promptSlug}/enviar`, path: '/propostas/:slug/enviar' };

function signedIn(): Auth {
  return { mode: 'clerk', isLoaded: true, isSignedIn: true, initial: 'A', signOut: vi.fn(async () => {}) };
}

describe('Texto das propostas', () => {
  it('mostra negrito, itálico e quebra de linha, e nada vira HTML', () => {
    const { container } = render(
      <p>
        <RichText text={'Redija uma **dissertação em prosa** sobre *Quanta*.\nSegunda linha com <b>marcação</b> e um * solto.'} />
      </p>,
    );

    expect(container.querySelector('strong')).toHaveTextContent('dissertação em prosa');
    expect(container.querySelector('em')).toHaveTextContent('Quanta');
    expect(container.querySelectorAll('br')).toHaveLength(1);
    // O que não é uma das marcações aceitas aparece como texto.
    expect(container.querySelector('b')).toBeNull();
    expect(container).toHaveTextContent('<b>marcação</b> e um * solto.');
  });

  it('põe o tipo de redação dentro da frase das instruções', () => {
    expect(genreInSentence('Dissertação em prosa')).toBe('dissertação em prosa.');
    expect(genreInSentence('Narrativa.')).toBe('narrativa.');
  });
});

describe('Proposta', () => {
  it('mostra os blocos na ordem do cadastro, com os três formatos da coletânea', async () => {
    mockApi(catalogHandlers);
    renderApp(<ProposalPage />, proposalRoute);

    expect(await screen.findByRole('heading', { level: 1, name: 'Algoritmos e o debate público' })).toBeInTheDocument();
    const article = screen.getByRole('article');
    // Chips: o tipo (nome da categoria) e a coletânea. Linhas e título ficam nas instruções.
    expect(screen.getByText('Dissertação em prosa')).toBeInTheDocument();
    expect(screen.getByText('Coletânea com 3 textos')).toBeInTheDocument();
    expect(screen.queryByText(/20 a 30 linhas/)).toBeNull();

    // Imagem com o texto alternativo, prosa com negrito e quebra de linha, verso em colunas.
    expect(within(article).getByRole('img', { name: 'Tirinha com duas cobras.' })).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/test/image/upload/prompts/tirinha',
    );
    expect(within(article).getByText('ciência').tagName).toBe('STRONG');
    expect(within(article).getByText('Plural de quantum')).toBeInTheDocument();
    expect(within(article).getByText('Cântico dos cânticos')).toBeInTheDocument();
    // A fonte vem com o itálico do cadastro.
    expect(within(article).getByText('Quanta').tagName).toBe('EM');

    // Título de seção, parágrafo e separador também aparecem.
    expect(within(article).getByRole('heading', { name: 'Leia os textos' })).toBeInTheDocument();
    expect(within(article).getByText('Use os textos como apoio, sem copiar.')).toBeInTheDocument();
    expect(within(article).getByRole('separator')).toBeInTheDocument();

    // O card: título, os 3 itens empilhados (texto com legenda, imagem pela URL pública, texto).
    expect(within(article).getByText('Para refletir')).toBeInTheDocument();
    expect(within(article).getByText('pesquisa').tagName).toBe('STRONG');
    expect(within(article).getByText('Fonte: CNPq, 2024.')).toBeInTheDocument();
    expect(within(article).getByRole('img', { name: 'Gráfico de barras.' })).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/test/image/upload/prompts/grafico',
    );
    expect(within(article).getByText('Terceiro bloco do card.')).toBeInTheDocument();

    // A ordem na tela é a das posições.
    const text = article.textContent ?? '';
    const order = ['Leia os textos', 'Texto 1:', 'Texto 2:', 'Texto 3:', 'Para refletir', 'Terceiro bloco do card.', 'Redija uma dissertação', 'Use os textos como apoio', 'Instruções'];
    expect(order.map((piece) => text.indexOf(piece))).toEqual([...order.map((piece) => text.indexOf(piece))].sort((a, b) => a - b));
    expect(order.every((piece) => text.includes(piece))).toBe(true);
  });

  it('abre as instruções com o tipo de redação e não oferece escolha de tipo', async () => {
    mockApi(catalogHandlers);
    renderApp(<ProposalPage />, proposalRoute);

    const title = await screen.findByText('Instruções');
    const instructions = within(title.parentElement!).getAllByRole('listitem');
    expect(instructions.map((item) => item.textContent)).toEqual([
      'Tipo de redação: dissertação em prosa.',
      'Escreva, no mínimo, 20 linhas.',
      'Dê um título a sua redação.',
    ]);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText('Narrativa')).toBeNull();

    const links = screen.getAllByRole('link', { name: 'Enviar minha redação' });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', `/propostas/${promptSlug}/enviar`);
    expect(screen.getByRole('link', { name: /Baixar a folha/ })).toHaveAttribute('href', expect.stringContaining('/v1/prompts/p1/sheet.pdf'));
  });

  it('abre a versão que a redação usou e avisa que ela foi substituída', async () => {
    const requests = mockApi({
      [`GET /v1/prompts/${promptSlug}`]: (_request, url) =>
        json(url.searchParams.get('version') === '1' ? { ...prompt, status: 'archived', title: 'Tema na versão 1' } : { ...prompt, version: 2 }),
    });
    renderApp(<ProposalPage />, { ...proposalRoute, route: `/propostas/${promptSlug}?versao=1` });

    expect(await screen.findByRole('heading', { level: 1, name: 'Tema na versão 1' })).toBeInTheDocument();
    expect(requests[0]!.url.searchParams.get('version')).toBe('1');
    expect(screen.getByText(/Ela foi substituída e não recebe novas redações/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver a versão atual' })).toHaveAttribute('href', `/propostas/${promptSlug}`);
    // Versão arquivada não recebe redação nova.
    expect(screen.queryByRole('link', { name: 'Enviar minha redação' })).toBeNull();
  });

  it('proposta indisponível mostra a mensagem da API e leva à lista', async () => {
    mockApi({ [`GET /v1/prompts/${promptSlug}`]: apiError('PROMPT_NOT_AVAILABLE', 'Essa proposta não está disponível. Escolha outra.', 404) });
    renderApp(<ProposalPage />, proposalRoute);

    expect(await screen.findByRole('alert')).toHaveTextContent('Essa proposta não está disponível. Escolha outra.');
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Ver as propostas' })).toHaveAttribute('href', '/propostas');
  });
});

describe('Envio', () => {
  // O rascunho guardado antes do login por um teste não pode aparecer no seguinte.
  beforeEach(clearDraft);

  async function addPhoto() {
    const file = new File([new Uint8Array(2048)], 'foto-redacao.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Foto da folha'), file);
  }

  it('mostra o tipo só para leitura, com o título que veio da API', async () => {
    mockApi(catalogHandlers);
    renderApp(<SubmitPage />, submitRoute);

    expect(await screen.findByText('Tipo de redação, definido pela proposta')).toBeInTheDocument();
    expect(screen.getByText('Dissertação em prosa')).toBeInTheDocument();
    expect(screen.queryByText(/20 a 30 linhas/)).toBeNull();
    // Nada para escolher: nem rádio, nem lista de tipos.
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Fuvest – Dissertação em prosa – Algoritmos e o debate público')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver coletânea' })).toHaveAttribute('href', `/propostas/${promptSlug}`);
    expect(screen.getByRole('heading', { name: 'Sua redação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Foto da folha' })).toBeInTheDocument();
    // Só a foto falta para liberar o envio.
    expect(screen.getByRole('button', { name: 'Enviar para correção' })).toBeDisabled();
  });

  it('a reescrita abre na versão da proposta da redação original', async () => {
    const requests = mockApi({ [`GET /v1/prompts/${promptSlug}`]: json({ ...prompt, id: 'p1-v1', status: 'archived' }) });
    renderApp(<SubmitPage />, { ...submitRoute, route: `/propostas/${promptSlug}/enviar?versao=1&reescrita=essay-1` });

    expect(await screen.findByText('Tipo de redação, definido pela proposta')).toBeInTheDocument();
    expect(requests[0]!.url.searchParams.get('version')).toBe('1');
    expect(screen.getByRole('link', { name: 'Ver coletânea' })).toHaveAttribute('href', `/propostas/${promptSlug}?versao=1`);
  });

  it('sem sessão, guarda a foto e leva ao login, voltando para o envio da mesma proposta', async () => {
    mockApi(catalogHandlers);
    renderApp(<SubmitPage />, submitRoute);
    await screen.findByText('Tipo de redação, definido pela proposta');

    await addPhoto();
    const send = screen.getByRole('button', { name: 'Enviar para correção' });
    await waitFor(() => expect(send).toBeEnabled());
    await userEvent.click(send);

    expect(await screen.findByTestId('location')).toHaveTextContent(
      `/entrar?next=${encodeURIComponent(`/propostas/${promptSlug}/enviar?continuar=1`)}`,
    );
  });

  it('com sessão, envia a proposta e a foto, sem tipo', async () => {
    const requests = mockApi({
      ...catalogHandlers,
      'GET /v1/me': json({
        id: 'u1', email: 'ana@example.com', name: 'Ana', role: 'student', termsAcceptanceRequired: false, aiNoticeAccepted: true,
        emailPreferences: { correctionReady: true, illegibleReminder: true, newThemes: false },
        credits: { total: 2, buckets: [{ source: 'single', remaining: 2, expiresAt: null }] },
      }),
      'POST /v1/essays/batch': json({ essayIds: ['new-1'] }, 202),
    });
    renderApp(<SubmitPage />, { ...submitRoute, auth: signedIn() });
    await screen.findByText('Tipo de redação, definido pela proposta');

    await addPhoto();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar para correção' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para correção' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirme o envio' });
    expect(dialog).toHaveTextContent('Fuvest – Dissertação em prosa – Algoritmos e o debate público');
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Confirmar envio' }));

    await waitFor(() => expect(requests.some((r) => r.url.pathname === '/v1/essays/batch')).toBe(true));
    expect(requests.find((r) => r.url.pathname === '/v1/essays/batch')!.body).toEqual({
      essays: [{ promptId: 'p1', assetId: 'asset-1', parentEssayId: null }],
      aiNoticeAccepted: null,
    });
  });
});
