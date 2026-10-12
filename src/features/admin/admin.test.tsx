import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Schemas } from '../../lib/api';
import { apiError, exams, json, mockApi, renderApp } from '../../test/helpers';
import type { Auth } from '../auth/AuthContext';
import AdminArea from './AdminArea';
import {
  addBlock,
  dropBlock,
  duplicateBlock,
  fromApi,
  issueTarget,
  moveBlock,
  removeBlock,
  renumber,
  setPosition,
  toDocument,
  toPreviewBlocks,
  withSavedIds,
} from './editorState';

const signedIn: Auth = { mode: 'clerk', isLoaded: true, isSignedIn: true, initial: 'G', signOut: vi.fn(async () => {}) };

const account = (role: 'admin' | 'student') => ({
  id: 'u1',
  email: 'admin@redigiai.test',
  name: 'Gabriel',
  role,
  termsAcceptanceRequired: false,
  aiNoticeAccepted: true,
  emailPreferences: { correctionReady: true, illegibleReminder: true, newThemes: false },
  credits: { total: 0, buckets: [] },
});

const draft: Schemas['PromptAdminDto'] = {
  id: 'p-draft',
  exam: 'fuvest',
  slug: 'papel-da-ciencia',
  version: 1,
  status: 'draft',
  title: 'O papel da ciência no mundo contemporâneo',
  summary: 'Coletânea com tirinha e um texto.',
  sourceLabel: null,
  essayType: 'dissertacao',
  genreLabel: 'Dissertação em prosa',
  sheet: { minLines: 20, maxLines: 30, titleRequired: true },
  blocks: [
    { id: 'b1', position: 10, kind: 'collection_item', data: { label: 'Texto 1', format: 'image', source: 'Verissimo, *As cobras*.', assetId: 'a1', alt: 'Tirinha.', imageUrl: 'https://res.cloudinary.com/test/image/upload/prompts/a1' } },
    { id: 'b2', position: 20, kind: 'collection_item', data: { label: 'Texto 2', format: 'prose', source: 'Carl Sagan, 1996.', body: 'Quase ninguém compreende a ciência.' } },
    { id: 'b3', position: 30, kind: 'command', data: { body: 'Redija uma dissertação sobre **o papel da ciência**.' } },
    { id: 'b4', position: 40, kind: 'instructions', data: { title: 'Instruções', items: ['Escreva, no mínimo, 20 linhas.', 'Dê um título a sua redação.'] } },
  ],
  gradingNotes: { expectedFocus: 'Ponto de vista sobre a função da ciência hoje.', tangentSignals: null, offTopicSignals: null, keyData: ['Texto 2: quase ninguém compreende.'], extra: null },
  updatedAt: '2026-10-12T15:21:00.000+00:00',
  publishedAt: null,
  issues: [
    { path: 'blocks[0].data.aiDescription', message: 'Texto 1: descrição para a IA obrigatória (mínimo de 40 caracteres, máximo de 3.000).' },
    { path: 'gradingNotes.tangentSignals', message: 'Abordagens esperadas: "Sinais de tangenciamento" obrigatório.' },
  ],
};

const saved = (updatedAt: string, issues = draft.issues): Schemas['PromptSavedDto'] => ({
  id: draft.id,
  slug: draft.slug,
  version: 1,
  status: 'draft',
  updatedAt,
  blocks: draft.blocks.map((block) => ({ id: block.id!, position: block.position! })),
  issues,
});

const item = (id: string, status: Schemas['PromptStatus'], version: number, title: string, extra: Partial<Schemas['PromptListItemDto']> = {}): Schemas['PromptListItemDto'] => ({
  id,
  exam: 'fuvest',
  examName: 'Fuvest',
  slug: 'algoritmos',
  version,
  status,
  title,
  genreLabel: 'Dissertação em prosa',
  essayTypeName: 'Dissertação',
  textCount: 4,
  updatedAt: '2026-10-10T15:00:00Z',
  ...extra,
});

const list: Schemas['PromptListDto'] = {
  items: [
    item('p-draft', 'draft', 1, 'O papel da ciência no mundo contemporâneo', { slug: 'papel-da-ciencia', textCount: 5 }),
    item('p-v2', 'published', 2, 'Algoritmos e o debate público'),
    item('p-v1', 'archived', 1, 'Algoritmos e o debate público'),
  ],
  counts: { all: 3, draft: 1, published: 1, archived: 1 },
};

const listRoute = { route: '/admin/propostas', path: '/admin/*', auth: signedIn };
const editorRoute = { route: '/admin/propostas/p-draft', path: '/admin/*', auth: signedIn };

const adminHandlers = {
  'GET /v1/me': json(account('admin')),
  'GET /v1/exams': json(exams),
  'GET /v1/admin/prompts': json(list),
  'GET /v1/admin/prompts/p-draft': json(draft),
};

beforeEach(() => localStorage.clear());

describe('Estado do editor', () => {
  const prompt = fromApi(draft);
  const keys = prompt.blocks.map((block) => block.key);

  it('lê a proposta da API e devolve o mesmo conteúdo no formato do cadastro', () => {
    const document = toDocument(prompt, '2026-10-12T15:21:00.000+00:00');

    expect(document.expectedUpdatedAt).toBe('2026-10-12T15:21:00.000+00:00');
    expect(document.sheet).toEqual({ minLines: 20, maxLines: 30, titleRequired: true });
    expect(document.blocks!.map((block) => [block.id, block.position, block.kind])).toEqual([
      ['b1', 10, 'collection_item'],
      ['b2', 20, 'collection_item'],
      ['b3', 30, 'command'],
      ['b4', 40, 'instructions'],
    ]);
    // Cada bloco manda só os campos do tipo dele; o endereço da imagem é só da resposta.
    expect(document.blocks![0]!.data).toEqual({ label: 'Texto 1', format: 'image', source: 'Verissimo, *As cobras*.', assetId: 'a1', alt: 'Tirinha.', aiDescription: '' });
    expect(document.blocks![3]!.data).toEqual({ title: 'Instruções', items: ['Escreva, no mínimo, 20 linhas.', 'Dê um título a sua redação.'] });
    expect(document.gradingNotes!.keyData).toEqual(['Texto 2: quase ninguém compreende.']);
  });

  it('separa versos por linha, mantendo a linha vazia entre estrofes, e itens e dados-chave por linha', () => {
    const verse = { ...prompt.blocks[1]!, format: 'verse' as const, columns: ['Quanta do latim\n\nPlural de quantum\n\n', 'Cântico'] };
    const document = toDocument({ ...prompt, blocks: [verse, { ...prompt.blocks[3]!, items: ' Um \n\nDois' }], keyData: 'a\n\n b ', minLines: '', maxLines: 'trinta' });

    expect(document.blocks![0]!.data!.columns).toEqual([['Quanta do latim', '', 'Plural de quantum'], ['Cântico']]);
    expect(document.blocks![1]!.data!.items).toEqual(['Um', 'Dois']);
    expect(document.gradingNotes!.keyData).toEqual(['a', 'b']);
    expect(document.sheet).toEqual({ minLines: null, maxLines: null, titleRequired: true });
  });

  it('proposta sem instruções ganha o cartão fixo', () => {
    const empty = fromApi({ ...draft, blocks: [], essayType: null, genreLabel: null });

    expect(empty.blocks.map((block) => [block.kind, block.title])).toEqual([['instructions', 'Instruções']]);
    expect(toDocument(empty).essayType).toBeNull();
  });

  it('mudar a ordem renumera de 10 em 10', () => {
    expect(moveBlock(prompt.blocks, keys[0]!, 1).map((block) => [block.key, block.position])).toEqual([
      [keys[1], 10], [keys[0], 20], [keys[2], 30], [keys[3], 40],
    ]);
    expect(moveBlock(prompt.blocks, keys[0]!, -1)).toBe(prompt.blocks);
    expect(dropBlock(prompt.blocks, keys[3]!, keys[0]!).map((block) => block.key)).toEqual([keys[3], keys[0], keys[1], keys[2]]);
    // Digitar a posição: 25 fica entre 20 e 30; 30 toma o lugar de quem está em 30.
    expect(setPosition(prompt.blocks, keys[0]!, 25).map((block) => block.key)).toEqual([keys[1], keys[0], keys[2], keys[3]]);
    expect(setPosition(prompt.blocks, keys[0]!, 30).map((block) => block.key)).toEqual([keys[1], keys[2], keys[0], keys[3]]);
    expect(setPosition(prompt.blocks, keys[3]!, 10).map((block) => block.key)).toEqual([keys[3], keys[0], keys[1], keys[2]]);
    expect(renumber([{ ...prompt.blocks[0]!, position: 7 }, { ...prompt.blocks[1]!, position: 3 }]).map((block) => block.position)).toEqual([10, 20]);
  });

  it('adiciona, duplica e remove blocos; as instruções são fixas', () => {
    const withText = addBlock(prompt.blocks, 'collection_item');
    expect(withText.map((block) => block.kind)).toEqual(['collection_item', 'collection_item', 'collection_item', 'command', 'instructions']);
    expect(withText[2]!.label).toBe('Texto 3');
    expect(addBlock(prompt.blocks, 'divider').map((block) => block.kind)).toEqual(['collection_item', 'collection_item', 'command', 'divider', 'instructions']);

    const copied = duplicateBlock(prompt.blocks, keys[1]!);
    expect(copied.map((block) => block.label)).toEqual(['Texto 1', 'Texto 2', 'Texto 2 (cópia)', '', '']);
    expect(copied[2]!.id).toBeUndefined();
    expect(copied.map((block) => block.position)).toEqual([10, 20, 30, 40, 50]);

    expect(removeBlock(prompt.blocks, keys[0]!).map((block) => block.position)).toEqual([10, 20, 30]);
    expect(removeBlock(prompt.blocks, keys[3]!)).toHaveLength(4);
    expect(duplicateBlock(prompt.blocks, keys[3]!)).toBe(prompt.blocks);
  });

  it('a pendência aponta para o campo, e os blocos novos recebem o id do servidor', () => {
    expect(issueTarget('blocks[0].data.aiDescription', prompt.blocks)).toEqual({ blockKey: keys[0], field: 'aiDescription' });
    expect(issueTarget('blocks[2].data', prompt.blocks)).toEqual({ blockKey: keys[2], field: '' });
    expect(issueTarget('gradingNotes.tangentSignals', prompt.blocks)).toEqual({ field: 'tangentSignals' });
    expect(issueTarget('sheet.maxLines', prompt.blocks)).toEqual({ field: 'maxLines' });
    expect(issueTarget('title', prompt.blocks)).toEqual({ field: 'title' });

    const added = addBlock(prompt.blocks, 'paragraph');
    const ids = withSavedIds(added, added.map((block) => ({ id: `id-${block.position}`, position: block.position })));
    expect(ids.map((block) => block.id)).toEqual(['id-10', 'id-20', 'id-30', 'id-40', 'id-50']);
  });

  it('a prévia recebe o que o aluno recebe: sem o id do arquivo nem a descrição para a IA', () => {
    const preview = toPreviewBlocks({ ...prompt, blocks: [{ ...prompt.blocks[0]!, aiDescription: 'Quadro 1: duas cobras.' }] });

    expect(preview[0]!.data).toEqual({ label: 'Texto 1', format: 'image', source: 'Verissimo, *As cobras*.', alt: 'Tirinha.', imageUrl: 'https://res.cloudinary.com/test/image/upload/prompts/a1' });
  });
});

describe('Acesso à administração', () => {
  it('aluno logado vê a página de não encontrado, sem nenhuma chamada à administração', async () => {
    const requests = mockApi({ ...adminHandlers, 'GET /v1/me': json(account('student')) });
    renderApp(<AdminArea />, listRoute);

    expect(await screen.findByRole('heading', { name: 'Não encontramos essa página.' })).toBeInTheDocument();
    expect(screen.queryByText('Propostas de redação')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
    expect(requests.some((request) => request.url.pathname.startsWith('/v1/admin'))).toBe(false);
  });

  it('quem não entrou também vê a página de não encontrado', async () => {
    const requests = mockApi(adminHandlers);
    renderApp(<AdminArea />, { route: '/admin/propostas', path: '/admin/*' });

    expect(await screen.findByRole('heading', { name: 'Não encontramos essa página.' })).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('administrador sem o segundo fator é avisado para ativar a verificação em duas etapas', async () => {
    mockApi({ ...adminHandlers, 'GET /v1/admin/prompts': apiError('ADMIN_2FA_REQUIRED', 'Ative a verificação em duas etapas para acessar a administração.', 403) });
    renderApp(<AdminArea />, listRoute);

    expect(await screen.findByRole('heading', { name: 'Ative a verificação em duas etapas' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Ative a verificação em duas etapas para acessar a administração.');
  });
});

describe('Lista de propostas', () => {
  it('mostra as abas com as contagens, as versões e a ação de cada situação', async () => {
    mockApi(adminHandlers);
    renderApp(<AdminArea />, listRoute);

    expect(await screen.findByRole('heading', { name: 'Propostas de redação' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Todas · 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Rascunhos · 1' })).toBeInTheDocument();
    expect(screen.getByText('admin@redigiai.test')).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('O papel da ciência no mundo contemporâneoFuvest · Dissertação em prosa · 5 textosv1 · rascunhoRascunho');
    expect(within(rows[0]!).getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '/admin/propostas/p-draft');
    expect(rows[1]).toHaveTextContent('v2Publicada');
    expect(within(rows[1]!).getByRole('button', { name: 'Nova versão' })).toBeInTheDocument();
    expect(rows[2]).toHaveTextContent('Fuvest · v1 substituída pela v2');
    expect(within(rows[2]!).getByRole('link', { name: 'Ver' })).toHaveAttribute('href', '/admin/propostas/p-v1');
  });

  it('filtra pela situação e busca pelo título na API', async () => {
    const requests = mockApi(adminHandlers);
    renderApp(<AdminArea />, listRoute);

    await userEvent.click(await screen.findByRole('button', { name: 'Rascunhos · 1' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar proposta' }), 'ciência');

    await waitFor(() =>
      expect(requests.some((r) => r.url.pathname === '/v1/admin/prompts' && r.url.searchParams.get('status') === 'draft' && r.url.searchParams.get('q') === 'ciência')).toBe(true),
    );
  });

  it('"Nova proposta" cria um rascunho com chave de idempotência e abre o editor', async () => {
    const requests = mockApi({ ...adminHandlers, 'POST /v1/admin/prompts': json(saved(draft.updatedAt), 201) });
    renderApp(<AdminArea />, listRoute);

    await userEvent.click(await screen.findByRole('button', { name: 'Nova proposta' }));

    expect(await screen.findByRole('heading', { name: 'Título e dados gerais' })).toBeInTheDocument();
    const post = requests.find((r) => r.method === 'POST')!;
    expect(post.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(post.body).toEqual({});
  });

  it('"Importar JSON" envia o arquivo como veio e mostra o que a API recusar', async () => {
    const document = { exam: 'fuvest', slug: 'papel-da-ciencia', title: 'O papel da ciência', blocks: [] };
    const requests = mockApi({
      ...adminHandlers,
      'POST /v1/admin/prompts': () =>
        json({ code: 'VALIDATION_FAILED', message: 'Há pendências na proposta.', retryable: false, traceId: 't', details: [{ path: 'slug', message: 'Já existe uma proposta com esse endereço.' }] }, 422),
    });
    renderApp(<AdminArea />, listRoute);
    await screen.findByRole('heading', { name: 'Propostas de redação' });

    await userEvent.upload(screen.getByLabelText('Arquivo JSON da proposta'), new File([JSON.stringify(document)], 'proposta.json', { type: 'application/json' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Há pendências na proposta.slug: Já existe uma proposta com esse endereço.');
    expect(requests.find((r) => r.method === 'POST')!.body).toEqual(document);

    await userEvent.upload(screen.getByLabelText('Arquivo JSON da proposta'), new File(['não é json'], 'ruim.json', { type: 'application/json' }));
    expect(await screen.findByText('O arquivo não é um JSON válido.')).toBeInTheDocument();
  });
});

describe('Editor da proposta', () => {
  it('abre com o estado da versão, as pendências e os cartões na ordem', async () => {
    mockApi(adminHandlers);
    renderApp(<AdminArea />, editorRoute);

    expect(await screen.findByText('Rascunho · v1')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/^Salvo às \d{2}:\d{2}$/);
    expect(screen.getByDisplayValue('O papel da ciência no mundo contemporâneo')).toBeInTheDocument();
    expect(screen.getByText('redigiai.com.br/propostas/papel-da-ciencia')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: /^Posição de/ }).map((input) => (input as HTMLInputElement).value)).toEqual(['10', '20', '30', '40']);
    expect(screen.getByText('Texto 1 · imagem')).toBeInTheDocument();
    expect(screen.getByText('Tipo, linhas e itens')).toBeInTheDocument();
    // O cartão das instruções traz o tipo de redação nos dois campos.
    expect(screen.getByLabelText('Tipo de redação, como na prova')).toHaveValue('Dissertação em prosa');
    expect(screen.getByLabelText('Categoria de correção')).toHaveValue('dissertacao');
    expect(screen.getByRole('heading', { name: /Abordagens esperadas do tema/ })).toBeInTheDocument();
    expect(screen.queryByText(/Notas de correção/)).toBeNull();

    const issues = screen.getAllByRole('alert')[0]!;
    expect(issues).toHaveTextContent('2 pendências para publicar');
    await userEvent.click(within(issues).getByRole('button', { name: /descrição para a IA obrigatória/ }));
    expect(screen.getByLabelText('Descrição para a IA')).toHaveFocus();
    await userEvent.click(within(issues).getByRole('button', { name: /Sinais de tangenciamento/ }));
    expect(screen.getByLabelText('Sinais de tangenciamento')).toHaveFocus();
    expect(screen.getByText('⚠ Obrigatório para publicar.')).toBeInTheDocument();
  });

  it('a prévia mostra a proposta como o aluno vê e acompanha a digitação', async () => {
    mockApi(adminHandlers);
    renderApp(<AdminArea />, editorRoute);
    const preview = await screen.findByRole('complementary', { name: 'Prévia da proposta' });

    expect(within(preview).getByText('Proposta de redação · Fuvest')).toBeInTheDocument();
    expect(within(preview).getByRole('img', { name: 'Tirinha.' })).toBeInTheDocument();
    expect(within(preview).getByText('o papel da ciência').tagName).toBe('STRONG');
    expect(within(preview).getByText('20 a 30 linhas · com título')).toBeInTheDocument();
    expect(preview).toHaveTextContent('Tipo de redação: dissertação em prosa.');
    expect(within(preview).getByRole('button', { name: 'Computador' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.type(screen.getByLabelText('Tipo de redação, como na prova'), ' argumentativa');
    expect(preview).toHaveTextContent('Tipo de redação: dissertação em prosa argumentativa.');
    await userEvent.click(within(preview).getByRole('button', { name: 'Celular' }));
    expect(within(preview).getByRole('button', { name: 'Celular' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('o formato do texto da coletânea troca os campos do cartão', async () => {
    mockApi(adminHandlers);
    renderApp(<AdminArea />, editorRoute);
    const card = (await screen.findByText('Texto 2 · texto')).closest('[id^="bloco-"]') as HTMLElement;

    expect(within(card).getByLabelText('Texto')).toHaveValue('Quase ninguém compreende a ciência.');
    await userEvent.click(within(card).getByRole('radio', { name: 'Verso' }));
    expect(within(card).getByLabelText('Coluna 1')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: '+ Coluna' }));
    expect(within(card).getByLabelText('Coluna 2')).toBeInTheDocument();
    expect(within(card).getByText('Texto 2 · verso, 2 colunas')).toBeInTheDocument();

    await userEvent.click(within(card).getByRole('radio', { name: 'Imagem' }));
    expect(within(card).getByLabelText('Texto alternativo (para leitores de tela)')).toBeInTheDocument();
    expect(within(card).getByLabelText('Descrição para a IA')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Enviar imagem' })).toBeInTheDocument();
  });

  it('negrito e itálico envolvem o trecho selecionado', async () => {
    mockApi(adminHandlers);
    renderApp(<AdminArea />, editorRoute);
    const card = (await screen.findByText('Enunciado', { selector: 'span' })).closest('[id^="bloco-"]') as HTMLElement;
    const area = within(card).getByLabelText('Enunciado') as HTMLTextAreaElement;

    area.setSelectionRange(0, 6);
    await userEvent.click(within(card).getByRole('button', { name: 'Itálico' }));

    expect(area).toHaveValue('*Redija* uma dissertação sobre **o papel da ciência**.');
  });

  it('subir, descer, digitar a posição, duplicar, remover e adicionar mudam a ordem e renumeram', async () => {
    mockApi(adminHandlers);
    renderApp(<AdminArea />, editorRoute);
    await screen.findByText('Texto 1 · imagem');
    const order = () => screen.getAllByRole('textbox', { name: /^Posição de/ }).map((input) => input.getAttribute('aria-label')!.replace('Posição de ', ''));

    await userEvent.click(screen.getByRole('button', { name: 'Descer Texto 1 · imagem' }));
    expect(order()).toEqual(['Texto 2 · texto', 'Texto 1 · imagem', 'Enunciado', 'Tipo, linhas e itens']);

    const position = screen.getByRole('textbox', { name: 'Posição de Enunciado' });
    await userEvent.clear(position);
    await userEvent.type(position, '5{Enter}');
    expect(order()).toEqual(['Enunciado', 'Texto 2 · texto', 'Texto 1 · imagem', 'Tipo, linhas e itens']);
    expect(screen.getAllByRole('textbox', { name: /^Posição de/ }).map((input) => (input as HTMLInputElement).value)).toEqual(['10', '20', '30', '40']);

    await userEvent.click(screen.getByRole('button', { name: 'Duplicar Texto 2 · texto' }));
    expect(order()).toContain('Texto 2 (cópia) · texto');
    await userEvent.click(screen.getByRole('button', { name: 'Remover Texto 2 (cópia) · texto' }));
    await userEvent.click(screen.getByRole('button', { name: '+ Separador' }));
    expect(order()).toEqual(['Enunciado', 'Texto 2 · texto', 'Texto 1 · imagem', 'Linha separadora', 'Tipo, linhas e itens']);
    // O cartão das instruções é fixo: não se duplica nem se remove.
    expect(screen.getByRole('button', { name: 'Remover Tipo, linhas e itens' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Duplicar Tipo, linhas e itens' })).toBeDisabled();
  });

  it('salva sozinho 2 segundos depois da última alteração, com a data que o editor tinha', async () => {
    let saves = 0;
    const requests = mockApi({
      ...adminHandlers,
      'PUT /v1/admin/prompts/p-draft': () => json(saved(`2026-10-12T15:2${++saves + 1}:00.000+00:00`, [draft.issues[0]!])),
    });
    renderApp(<AdminArea />, editorRoute);
    const area = await screen.findByLabelText('Sinais de tangenciamento');

    await userEvent.type(area, 'Fala de tecnologia em geral.');
    expect(screen.getByRole('status')).toHaveTextContent('Alterações não salvas');
    // Nada é enviado enquanto se digita.
    expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(0);

    await waitFor(() => expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(1), { timeout: 4000 });
    const first = requests.find((r) => r.method === 'PUT')!.body as Schemas['PromptDocument'];
    expect(first.expectedUpdatedAt).toBe(draft.updatedAt);
    expect(first.gradingNotes!.tangentSignals).toBe('Fala de tecnologia em geral.');
    expect(first.blocks!.map((block) => block.id)).toEqual(['b1', 'b2', 'b3', 'b4']);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Salvo às/));
    // As pendências passam a ser as que a API devolveu.
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('1 pendência para publicar');

    // O salvamento seguinte manda a data que o anterior devolveu.
    await userEvent.type(screen.getByLabelText('Resumo (opcional)'), ' Atualizado.');
    await waitFor(() => expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(2), { timeout: 4000 });
    expect((requests.filter((r) => r.method === 'PUT')[1]!.body as Schemas['PromptDocument']).expectedUpdatedAt).toBe('2026-10-12T15:22:00.000+00:00');
  }, 15_000);

  it('se o salvamento falha, o que foi digitado fica no navegador e volta ao reabrir', async () => {
    mockApi({ ...adminHandlers, 'PUT /v1/admin/prompts/p-draft': apiError('INTERNAL_ERROR', 'Algo deu errado do nosso lado.', 500) });
    const first = renderApp(<AdminArea />, editorRoute);
    await userEvent.type(await screen.findByLabelText('Sinais de tangenciamento'), 'Texto que não pode se perder.');

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/está guardado neste navegador/), { timeout: 4000 });
    expect(screen.getByRole('button', { name: 'Tentar salvar de novo' })).toBeInTheDocument();
    first.unmount();

    mockApi(adminHandlers);
    renderApp(<AdminArea />, editorRoute);
    expect(await screen.findByLabelText('Sinais de tangenciamento')).toHaveValue('Texto que não pode se perder.');
    expect(screen.getByRole('status')).toHaveTextContent('Alterações não salvas');
  }, 15_000);

  it('quando a proposta mudou em outro lugar, para de salvar e pede para recarregar', async () => {
    const requests = mockApi({
      ...adminHandlers,
      'PUT /v1/admin/prompts/p-draft': apiError('PROMPT_CHANGED', 'A proposta foi alterada em outro lugar. Recarregue para continuar.', 409),
    });
    renderApp(<AdminArea />, editorRoute);
    await userEvent.type(await screen.findByLabelText('Resumo (opcional)'), '!');

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('A proposta foi alterada em outro lugar. Recarregue para continuar.'), { timeout: 4000 });
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
    // Digitar de novo não dispara outro salvamento por cima do que está no servidor.
    await userEvent.type(screen.getByLabelText('Resumo (opcional)'), '!!');
    expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(1);
  }, 15_000);

  it('validar mostra o resultado, e publicar pede confirmação antes de colocar na lista dos alunos', async () => {
    const requests = mockApi({
      ...adminHandlers,
      'GET /v1/admin/prompts/p-draft': json({ ...draft, issues: [] }),
      'POST /v1/admin/prompts/p-draft/validate': json({ valid: true, issues: [] }),
      'POST /v1/admin/prompts/p-draft/publish': json({ ...saved(draft.updatedAt, []), status: 'published' }),
    });
    renderApp(<AdminArea />, editorRoute);

    await userEvent.click(await screen.findByRole('button', { name: 'Validar' }));
    expect(await screen.findByText('Nenhuma pendência: a proposta está pronta para publicar.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    const dialog = screen.getByRole('dialog', { name: 'Publicar esta proposta?' });
    expect(dialog).toHaveTextContent('Depois de publicada, a proposta não é mais editada');
    expect(requests.some((r) => r.url.pathname.endsWith('/publish'))).toBe(false);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publicar agora' }));

    expect(await screen.findByRole('heading', { name: 'Propostas de redação' })).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST' && r.url.pathname.endsWith('/publish'))).toBe(true);
  });

  it('publicar com pendências mostra o que a API recusou', async () => {
    mockApi({
      ...adminHandlers,
      'POST /v1/admin/prompts/p-draft/publish': () =>
        json({ code: 'VALIDATION_FAILED', message: 'Há pendências na proposta.', retryable: false, traceId: 't', details: [{ path: 'title', message: 'Título da proposta: de 3 a 120 caracteres.' }] }, 422),
    });
    renderApp(<AdminArea />, editorRoute);

    await userEvent.click(await screen.findByRole('button', { name: 'Publicar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar agora' }));

    expect(await screen.findByRole('button', { name: 'Título da proposta: de 3 a 120 caracteres.' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('versão publicada abre só para leitura, com "Criar nova versão"', async () => {
    const requests = mockApi({
      ...adminHandlers,
      'GET /v1/admin/prompts/p-v2': json({ ...draft, id: 'p-v2', status: 'published', version: 2, issues: [], publishedAt: draft.updatedAt }),
      'POST /v1/admin/prompts/p-v2/new-version': json({ ...saved(draft.updatedAt), id: 'p-draft', version: 3 }, 201),
    });
    renderApp(<AdminArea />, { ...editorRoute, route: '/admin/propostas/p-v2' });

    expect(await screen.findByText('Publicada · v2')).toBeInTheDocument();
    expect(screen.getByText(/abre só para leitura/)).toBeInTheDocument();
    expect(screen.getByLabelText('Título da proposta (tema)')).toBeDisabled();
    expect(screen.getByLabelText('Sinais de tangenciamento')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remover/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '+ Comando' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Arquivar' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Criar nova versão' }));

    // Abre o rascunho da versão nova.
    expect(await screen.findByText('Rascunho · v1')).toBeInTheDocument();
    expect(requests.some((r) => r.method === 'POST' && r.url.pathname.endsWith('/new-version'))).toBe(true);
  });
});
