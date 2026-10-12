import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Account, EssayDetail, EssaySummary, Payment, Progress } from '../api/provisional-types';
import { apiError, json, mockApi, renderApp } from '../test/helpers';
import type { Auth } from './auth/AuthContext';
import { CheckoutPage } from './checkout/CheckoutPage';
import { CorrectionPage } from './correcao/CorrectionPage';
import { exampleCorrection, exampleIllegibleWords, exampleLines, exampleZeroCorrection } from './correcao/example';
import { ConfirmSendModal } from './envio/ConfirmSendModal';
import { DashboardPage } from './painel/DashboardPage';
import { ProfilePage } from './perfil/ProfilePage';
import { ReviewPage } from './revisao/ReviewPage';

// Telas logadas, com a sessão e as respostas da API substituídas dentro do teste.

function signedIn(signOut = vi.fn(async () => {})): Auth {
  return { mode: 'clerk', isLoaded: true, isSignedIn: true, initial: 'A', signOut };
}

const account: Account = {
  id: '0198f0c0-0000-7000-8000-0000000000aa',
  email: 'ana.souza@email.com',
  name: 'Ana Souza',
  termsAcceptanceRequired: false,
  aiNoticeAccepted: true,
  emailPreferences: { correctionReady: true, illegibleReminder: true, newThemes: false },
  credits: { total: 3, buckets: [{ source: 'single', remaining: 3, expiresAt: null }] },
  subscription: null,
  targetExamSlug: 'fuvest',
  loginProvider: 'google',
  needsGuardianAuthorization: false,
};

function essay(id: string, status: EssaySummary['status'], extra: Partial<EssaySummary> = {}): EssaySummary {
  return {
    id,
    title: 'Fuvest – Dissertação – Algoritmos e o debate público',
    themeId: 'theme-1',
    essayTypeId: 'type-1',
    status,
    version: 1,
    hasVersions: false,
    createdAt: '2026-09-28T22:15:00Z',
    reviewDeadlineAt: null,
    illegibleCount: 0,
    score: null,
    maxScore: null,
    failureCode: null,
    ...extra,
  };
}

const awaitingReview = essay('essay-review', 'awaiting_review', {
  title: 'Fuvest – Narrativa – [Tema]',
  reviewDeadlineAt: '2026-09-29T12:12:00Z',
  illegibleCount: 2,
});

const essays = [
  awaitingReview,
  essay('essay-done', 'completed', { score: 23, maxScore: 40, version: 2, hasVersions: true }),
  essay('essay-queued', 'queued'),
  essay('essay-failed', 'failed', { failureCode: 'GRADING_FAILED' }),
];

const progress: Progress = {
  points: [
    { essayId: 'a', date: '2026-09-21T15:00:00Z', score: 21, maxScore: 40 },
    { essayId: 'essay-done', date: '2026-09-28T22:15:00Z', score: 23, maxScore: 40 },
  ],
  lastDelta: 2,
  focus: { criterionPosition: 3, criterionName: 'Coesão, coerência e progressão', guidance: 'Abra cada parágrafo com uma ideia nova.', essayId: 'essay-done' },
};

const reviewDetail: EssayDetail = { ...awaitingReview, sheetLines: 30, lines: exampleLines, illegibleWords: exampleIllegibleWords };

const pendingPayment: Payment = {
  id: 'pay-1',
  kind: 'single',
  method: 'card',
  amountCents: 1600,
  quantity: 1,
  status: 'pending',
  createdAt: '2026-09-28T15:00:00Z',
  receiptUrl: null,
  refundable: true,
};

describe('Minhas correções', () => {
  it('mostra o saldo, o alerta da redação que precisa do aluno e a ação de cada situação', async () => {
    mockApi({
      'GET /v1/me': json(account),
      'GET /v1/essays': json({ items: essays, nextCursor: null }),
      'GET /v1/me/progress': json(progress),
    });
    renderApp(<DashboardPage />, { route: '/painel', path: '/painel', auth: signedIn() });

    expect(await screen.findByRole('heading', { level: 1, name: 'Olá, Ana' })).toBeInTheDocument();
    expect(await screen.findByText('correções disponíveis')).toBeInTheDocument();

    const alert = await screen.findByRole('region', { name: 'Precisa de você' });
    expect(alert).toHaveTextContent('Não conseguimos ler 2 palavras em Fuvest – Narrativa – [Tema].');
    expect(within(alert).getByRole('link', { name: 'Preencher palavras' })).toHaveAttribute('href', '/redacoes/essay-review/revisao');

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(rows[2]).toHaveTextContent('· 2ª versão');
    expect(rows[2]).toHaveTextContent('Corrigida');
    expect(rows[2]).toHaveTextContent('23 / 40');
    expect(within(rows[2]!).getByRole('link', { name: 'Ver correção' })).toHaveAttribute('href', '/redacoes/essay-done');
    expect(rows[3]).toHaveTextContent('Na fila');
    expect(within(rows[3]!).queryByRole('link')).not.toBeInTheDocument();
    expect(rows[4]).toHaveTextContent('Não corrigida · crédito devolvido');
    expect(within(rows[4]!).getByRole('link', { name: 'Reenviar' })).toHaveAttribute('href', '/temas/theme-1/enviar?tipo=type-1');

    expect(screen.getByText('+2 pontos na última correção')).toBeInTheDocument();
    expect(screen.getByText('3 · Coesão, coerência e progressão')).toBeInTheDocument();
  });

  it('sem redações, convida a ver os temas', async () => {
    mockApi({ 'GET /v1/me': json(account), 'GET /v1/essays': json({ items: [], nextCursor: null }) });
    renderApp(<DashboardPage />, { route: '/painel', path: '/painel', auth: signedIn() });

    expect(await screen.findByText('Você ainda não enviou nenhuma redação.')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Ver os temas' })).toBeInTheDocument();
  });

  it('mostra a mensagem da API quando a lista falha', async () => {
    mockApi({
      'GET /v1/me': json(account),
      'GET /v1/essays': apiError('INTERNAL_ERROR', 'Algo deu errado do nosso lado. Tente novamente em instantes.', 500),
    });
    renderApp(<DashboardPage />, { route: '/painel', path: '/painel', auth: signedIn() });

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado do nosso lado.');
  });
});

describe('Palavras ilegíveis', () => {
  it('só libera o envio com todas preenchidas e manda exatamente o que foi digitado', async () => {
    const requests = mockApi({
      'GET /v1/essays/essay-review': json(reviewDetail),
      'PUT /v1/essays/essay-review/illegible': new Response(null, { status: 204 }),
    });
    renderApp(<ReviewPage />, { route: '/redacoes/essay-review/revisao', path: '/redacoes/:id/revisao', auth: signedIn() });

    expect(await screen.findByRole('heading', { level: 1, name: 'Não conseguimos ler 2 palavras' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Trocar foto|Cancelar/ })).not.toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Enviar para correção' });
    const fields = screen.getAllByLabelText('O que está escrito');
    expect(send).toBeDisabled();

    await userEvent.type(fields[0]!, 'controlão');
    expect(screen.getByText('1 de 2 preenchidas')).toBeInTheDocument();
    expect(send).toBeDisabled();
    await userEvent.type(fields[1]!, 'recebe');
    await userEvent.click(send);

    const dialog = screen.getByRole('dialog', { name: 'Confira as palavras' });
    expect(dialog).toHaveTextContent('Linha 4');
    expect(dialog).toHaveTextContent('controlão');
    expect(dialog).toHaveTextContent('não podem ser alteradas depois do envio');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar e enviar' }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/painel');
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual([
      { wordId: 'word-1', value: 'controlão' },
      { wordId: 'word-2', value: 'recebe' },
    ]);
  });

  it('prazo vencido: mostra a mensagem da API e só oferece voltar ao painel', async () => {
    mockApi({
      'GET /v1/essays/essay-review': json(reviewDetail),
      'PUT /v1/essays/essay-review/illegible': apiError(
        'REVIEW_EXPIRED',
        'O prazo para preencher as palavras acabou. A redação foi cancelada e a correção voltou para o seu saldo.',
        409,
      ),
    });
    renderApp(<ReviewPage />, { route: '/redacoes/essay-review/revisao', path: '/redacoes/:id/revisao', auth: signedIn() });

    const fields = await screen.findAllByLabelText('O que está escrito');
    await userEvent.type(fields[0]!, 'a');
    await userEvent.type(fields[1]!, 'b');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar para correção' }));
    const dialog = screen.getByRole('dialog', { name: 'Confira as palavras' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar e enviar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('O prazo para preencher as palavras acabou.');
    expect(within(dialog).getByRole('link', { name: 'Voltar para Minhas correções' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Confirmar e enviar' })).not.toBeInTheDocument();
  });
});

describe('Correção', () => {
  const route = { route: '/redacoes/essay-done', path: '/redacoes/:id' };

  it('mostra a nota e os pontos que vieram da API, sem recalcular', async () => {
    // Pontos de propósito diferentes de nível × peso: a tela exibe o que o backend mandou.
    const fromApi = {
      ...exampleCorrection,
      score: 17,
      criteria: exampleCorrection.criteria.map((criterion, index) => (index === 0 ? { ...criterion, points: 2 } : criterion)),
    };
    mockApi({ 'GET /v1/essays/essay-done/correction': json(fromApi) });
    renderApp(<CorrectionPage />, { ...route, auth: signedIn() });

    expect(within(await screen.findByRole('region', { name: 'Resultado' })).getByText('17')).toBeInTheDocument();
    expect(screen.getByText('+4 desde a 1ª versão')).toBeInTheDocument();
    const first = document.getElementById('criterio-1')!;
    expect(first).toHaveTextContent('2 / 12');
    expect(first).toHaveTextContent('Nível 3 de 4');
    expect(first).toHaveTextContent('−3 pontos');
    expect(screen.getAllByText('O que corrigir')).toHaveLength(3);
    expect(document.getElementById('criterio-4')).toHaveTextContent('Crase antes de verbo · linha 13');
    expect(screen.getAllByRole('link', { name: 'Reescrever esta redação' })[0]).toHaveAttribute(
      'href',
      '/temas/enviar?tipo=&reescrita=exemplo',
    );
  });

  it('nota zero mostra o motivo no lugar dos critérios', async () => {
    mockApi({
      'GET /v1/essays/essay-done/correction': json({
        ...exampleZeroCorrection,
        zero: {
          applies: true,
          ruleCode: 'candidate_identification',
          ruleLabel: 'Identificação do candidato',
          ruleNote: 'Nome, assinatura ou qualquer marca que identifique o autor anula a redação.',
          explanation: 'Há um nome escrito na linha 30 da folha.',
        },
        nextSteps: [],
      }),
    });
    renderApp(<CorrectionPage />, { ...route, auth: signedIn() });

    expect(await screen.findByRole('heading', { name: 'Identificação do candidato' })).toBeInTheDocument();
    expect(screen.getByText('Há um nome escrito na linha 30 da folha.')).toBeInTheDocument();
    expect(screen.getByText('Regra da Fuvest: nome, assinatura ou qualquer marca que identifique o autor anula a redação.')).toBeInTheDocument();
    expect(document.getElementById('criterio-1')).toBeNull();
    expect(screen.queryByText('Plano de reescrita')).toBeNull();
  });

  it('a avaliação exige uma das três opções e envia o comentário', async () => {
    const requests = mockApi({
      'GET /v1/essays/essay-done/correction': json(exampleCorrection),
      'POST /v1/corrections/exemplo/feedback': new Response(null, { status: 204 }),
    });
    renderApp(<CorrectionPage />, { ...route, auth: signedIn() });

    // Sem uma opção escolhida, o botão fica desabilitado.
    expect(await screen.findByRole('button', { name: 'Enviar avaliação' })).toBeDisabled();
    expect(screen.getByRole('radiogroup', { name: 'A correção ajudou você a entender o que melhorar?' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Não ajudou' }));
    await userEvent.type(screen.getByLabelText('Comentário (opcional)'), 'Faltou explicar a linha 14.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }));

    await waitFor(() =>
      expect(requests.find((r) => r.method === 'POST')?.body).toEqual({
        rating: 'did_not_help',
        comment: 'Faltou explicar a linha 14.',
      }),
    );
    expect(await screen.findByText('Obrigado. A sua avaliação ajuda a melhorar as próximas correções.')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('correção já avaliada mostra o agradecimento no lugar da pergunta', async () => {
    mockApi({
      'GET /v1/essays/essay-done/correction': json({ ...exampleCorrection, feedback: { rating: 'helped_a_lot', comment: null } }),
    });
    renderApp(<CorrectionPage />, { ...route, auth: signedIn() });

    expect(await screen.findByText('Obrigado. A sua avaliação ajuda a melhorar as próximas correções.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar avaliação' })).toBeNull();
  });
});

describe('Confirmação do envio', () => {
  const pending = [{ title: 'Fuvest – Dissertação – Tema', fileName: 'foto.jpg', themeId: 'theme-1', essayTypeId: 'type-1', assetId: 'asset-1' }];

  it('mostra custo e saldo, e envia com a chave de idempotência', async () => {
    const requests = mockApi({
      'GET /v1/me': json(account),
      'POST /v1/essays/batch': json({ essayIds: ['new-1'] }, 202),
    });
    renderApp(<ConfirmSendModal essays={pending} onClose={() => {}} />, { route: '/temas/theme-1', path: '/temas/:themeId', auth: signedIn() });

    const dialog = screen.getByRole('dialog', { name: 'Confirme o envio' });
    expect(await within(dialog).findByText('2 correções')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Não é possível trocar a foto nem cancelar o envio.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar envio' }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/painel');
    const post = requests.find((r) => r.method === 'POST')!;
    expect(post.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(post.body).toEqual({
      essays: [{ themeId: 'theme-1', essayTypeId: 'type-1', assetId: 'asset-1', parentEssayId: null }],
      aiNoticeAccepted: null,
    });
  });

  it('sem saldo suficiente, não deixa confirmar e oferece comprar', async () => {
    mockApi({ 'GET /v1/me': json({ ...account, credits: { total: 0, buckets: [] } }) });
    renderApp(<ConfirmSendModal essays={pending} onClose={() => {}} />, { route: '/temas/theme-1', path: '/temas/:themeId', auth: signedIn() });

    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem correções suficientes para este envio.');
    expect(screen.getByRole('button', { name: 'Confirmar envio' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Comprar correções' })).toBeInTheDocument();
  });

  it('no primeiro envio, exige o aceite do aviso sobre IA', async () => {
    mockApi({ 'GET /v1/me': json({ ...account, aiNoticeAccepted: false }) });
    renderApp(<ConfirmSendModal essays={pending} onClose={() => {}} />, { route: '/temas/theme-1', path: '/temas/:themeId', auth: signedIn() });

    const notice = await screen.findByRole('checkbox', { name: /A correção é feita por IA/ });
    const confirm = screen.getByRole('button', { name: 'Confirmar envio' });
    expect(confirm).toBeDisabled();
    await userEvent.click(notice);
    expect(confirm).toBeEnabled();
  });
});

describe('Checkout', () => {
  it('só mostra o pagamento como aprovado quando o backend confirma', async () => {
    mockApi({ 'GET /v1/me': json(account), 'GET /v1/payments/pay-1': json(pendingPayment) });
    renderApp(<CheckoutPage />, { route: '/comprar?pagamento=pay-1', path: '/comprar', auth: signedIn() });

    expect(await screen.findByText('Confirmando o pagamento')).toBeInTheDocument();
    expect(screen.queryByText('Pagamento aprovado')).not.toBeInTheDocument();
  });

  it('parâmetro forjado na URL não vira confirmação', async () => {
    mockApi({ 'GET /v1/me': json(account) });
    renderApp(<CheckoutPage />, { route: '/comprar?pagamento=aprovado', path: '/comprar', auth: signedIn() });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Pagamento aprovado')).not.toBeInTheDocument();
  });

  it('repetir a tentativa usa a mesma chave de idempotência; mudar a compra gera outra', async () => {
    const requests = mockApi({
      'GET /v1/me': json(account),
      'POST /v1/checkout/single': apiError('PAYMENT_FAILED', 'O pagamento não foi aprovado. Tente outro meio de pagamento.', 402, true),
    });
    renderApp(<CheckoutPage />, { route: '/comprar', path: '/comprar', auth: signedIn() });

    const pay = await screen.findByRole('button', { name: 'Gerar Pix' });
    await userEvent.click(pay);
    await screen.findByText('O pagamento não foi aprovado. Tente outro meio de pagamento.');
    await userEvent.click(pay);
    await waitFor(() => expect(requests.filter((r) => r.method === 'POST')).toHaveLength(2));
    await userEvent.selectOptions(screen.getByLabelText('Quantidade'), '3');
    await userEvent.click(pay);
    await waitFor(() => expect(requests.filter((r) => r.method === 'POST')).toHaveLength(3));

    const [first, second, third] = requests.filter((r) => r.method === 'POST').map((r) => r.headers.get('Idempotency-Key'));
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).toBe(first);
    expect(third).not.toBe(first);
    expect(requests.filter((r) => r.method === 'POST')[2]?.body).toEqual({ quantity: 3, method: 'pix', guardianAuthorized: false });
  });

  it('16 e 17 anos: só compra com a autorização do responsável marcada', async () => {
    mockApi({ 'GET /v1/me': json({ ...account, needsGuardianAuthorization: true }) });
    renderApp(<CheckoutPage />, { route: '/comprar', path: '/comprar', auth: signedIn() });

    const pay = await screen.findByRole('button', { name: 'Gerar Pix' });
    expect(pay).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Meu responsável autorizou esta compra.' }));
    expect(pay).toBeEnabled();
  });
});

describe('Meu perfil', () => {
  const handlers = {
    'GET /v1/me': json(account),
    'GET /v1/exams': json([{ slug: 'fuvest', name: 'Fuvest', status: 'active', sheetLines: 30, currentRubricVersionId: null }]),
    'GET /v1/payments': json([{ ...pendingPayment, status: 'approved' }]),
  };

  it('mostra os dados, o histórico e deixa desistir da compra dentro do prazo', async () => {
    const requests = mockApi({ ...handlers, 'POST /v1/payments/pay-1/refund-request': new Response(null, { status: 202 }) });
    renderApp(<ProfilePage />, { route: '/perfil', path: '/perfil', auth: signedIn() });

    expect(await screen.findByLabelText('Nome')).toHaveValue('Ana Souza');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('readonly');
    expect(screen.getByRole('checkbox', { name: /Novos temas/ })).not.toBeChecked();

    await userEvent.click(await screen.findByRole('button', { name: 'Desistir da compra' }));
    await waitFor(() => expect(requests.some((r) => r.url.pathname === '/v1/payments/pay-1/refund-request')).toBe(true));
  });

  it('só exclui a conta com a confirmação digitada, e sair encerra a sessão', async () => {
    const signOut = vi.fn(async () => {});
    const requests = mockApi({ ...handlers, 'DELETE /v1/me': new Response(null, { status: 202 }) });
    renderApp(<ProfilePage />, { route: '/perfil', path: '/perfil', auth: signedIn(signOut) });

    await userEvent.click(await screen.findByRole('button', { name: 'Excluir conta' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir minha conta' });
    const confirm = within(dialog).getByRole('button', { name: 'Excluir conta' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Digite "EXCLUIR" para confirmar'), 'excluir');
    expect(confirm).toBeDisabled();
    await userEvent.clear(within(dialog).getByLabelText('Digite "EXCLUIR" para confirmar'));
    await userEvent.type(within(dialog).getByLabelText('Digite "EXCLUIR" para confirmar'), 'EXCLUIR');
    await userEvent.click(confirm);

    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.url.pathname === '/v1/me')).toBe(true));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});
