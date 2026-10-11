import { HttpResponse, delay, http } from 'msw';
import type {
  Account,
  BatchEssayRequest,
  CheckoutResponse,
  EssaySummary,
  IllegibleAnswer,
  Payment,
} from '../api/mock-types';
import type { components } from '../api/schema';
import * as data from './data';

type Schemas = components['schemas'];

// Cenários para testar os estados das telas: localStorage["redigiai.mock.scenario"] = "empty" | "error".
function scenario() {
  try {
    return localStorage.getItem('redigiai.mock.scenario');
  } catch {
    return null;
  }
}

function error(code: string, message: string, status: number, retryable = false) {
  return HttpResponse.json({ code, message, retryable, traceId: 'mock-trace' }, { status });
}

const unauthenticated = () => error('UNAUTHENTICATED', 'Entre na sua conta para continuar.', 401);
const essayNotFound = () => error('ESSAY_NOT_FOUND', 'Não encontramos essa redação na sua conta.', 404);
const internal = () => error('INTERNAL_ERROR', 'Algo deu errado do nosso lado. Tente novamente em instantes.', 500);

// Estado em memória: volta ao inicial ao recarregar a página.
let account: Account = structuredClone(data.account);
let essays: EssaySummary[] = structuredClone(data.initialEssays);
// O checkout do cartão recarrega a página ao voltar: os pagamentos criados sobrevivem na aba.
const PAYMENTS_KEY = 'redigiai.mock.payments';

function loadCreatedPayments(): Payment[] {
  try {
    return JSON.parse(sessionStorage.getItem(PAYMENTS_KEY) ?? '[]') as Payment[];
  } catch {
    return [];
  }
}

function rememberPayment(payment: Payment) {
  payments.unshift(payment);
  try {
    sessionStorage.setItem(PAYMENTS_KEY, JSON.stringify([payment, ...loadCreatedPayments()]));
  } catch {
    // Sem armazenamento: o pagamento vale até recarregar a página.
  }
}

const payments: Payment[] = [...loadCreatedPayments(), ...structuredClone(data.payments)];
const correction = structuredClone(data.correction);
const idempotency = new Map<string, { essayIds: string[] }>();
let sequence = 0;

/** Redações novas avançam sozinhas, para dar para ver o painel atualizando. */
function advance(essay: EssaySummary): EssaySummary {
  if (!essay.id.startsWith('essay-new-')) {
    return essay;
  }
  const seconds = (Date.now() - new Date(essay.createdAt).getTime()) / 1000;
  const status = seconds < 6 ? 'uploaded' : seconds < 12 ? 'queued' : seconds < 18 ? 'processing' : 'completed';
  return status === 'completed' ? { ...essay, status, score: 23, maxScore: 30 } : { ...essay, status };
}

function listEssays() {
  return scenario() === 'empty' ? [] : essays.map(advance);
}

function findEssay(id: string) {
  return id === data.reviewExample.id ? data.reviewExample : listEssays().find((essay) => essay.id === id);
}

function authenticated(request: Request) {
  return request.headers.has('Authorization');
}

const api = (path: string) => `*/v1${path}`;

export const handlers = [
  // Catálogo (público)
  http.get(api('/exams'), () => (scenario() === 'error' ? internal() : HttpResponse.json(data.exams))),

  http.get(api('/exams/:slug/themes'), ({ params, request }) => {
    if (params.slug !== 'fuvest') {
      return error('NOT_FOUND', 'Não encontramos o que você procura.', 404);
    }
    const search = new URL(request.url).searchParams.get('q')?.trim().toLowerCase();
    return HttpResponse.json(search ? data.themes.filter((theme) => theme.title.toLowerCase().includes(search)) : data.themes);
  }),

  http.get(api('/themes/:id'), ({ params }) => {
    const theme = data.themes.find((item) => item.id === params.id);
    return theme
      ? HttpResponse.json(data.themeDetail(theme))
      : error('THEME_NOT_AVAILABLE', 'Esse tema não está disponível. Escolha outro.', 404);
  }),

  http.get(api('/rubrics/:versionId'), () => HttpResponse.json(data.rubric)),

  // Conta
  http.get(api('/me'), ({ request }) => (authenticated(request) ? HttpResponse.json(account) : unauthenticated())),

  http.post(api('/me'), ({ request }) => (authenticated(request) ? HttpResponse.json(account) : unauthenticated())),

  http.patch(api('/me'), async ({ request }) => {
    const changes = (await request.json()) as Partial<Schemas['UpdateProfileRequest']> & { targetExamSlug?: string };
    account = {
      ...account,
      name: changes.name ?? account.name,
      targetExamSlug: changes.targetExamSlug ?? account.targetExamSlug,
      emailPreferences: {
        correctionReady: changes.emailPreferences?.correctionReady ?? account.emailPreferences.correctionReady,
        illegibleReminder: changes.emailPreferences?.illegibleReminder ?? account.emailPreferences.illegibleReminder,
        newThemes: changes.emailPreferences?.newThemes ?? account.emailPreferences.newThemes,
      },
    };
    return HttpResponse.json(account);
  }),

  http.post(api('/me/export'), () => new HttpResponse(null, { status: 202 })),
  http.delete(api('/me'), () => new HttpResponse(null, { status: 202 })),

  http.get(api('/me/progress'), () =>
    HttpResponse.json(scenario() === 'empty' ? { points: [], lastDelta: null, focus: null } : data.progress),
  ),

  // Envio e acompanhamento
  http.post(api('/uploads/sign'), () =>
    HttpResponse.json({
      assetId: `asset-${++sequence}`,
      uploadUrl: 'https://api.cloudinary.com/v1_1/mock/image/upload',
      fields: { signature: 'mock', timestamp: '0', folder: 'essays' },
    }),
  ),

  http.post('https://api.cloudinary.com/v1_1/mock/image/upload', async () => {
    await delay(300);
    return HttpResponse.json({ public_id: 'mock' });
  }),

  http.post(api('/essays/batch'), async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) {
      return error('VALIDATION_ERROR', 'Não foi possível ler os dados enviados.', 422);
    }
    if (idempotency.has(key)) {
      return HttpResponse.json(idempotency.get(key), { status: 202 });
    }

    const body = (await request.json()) as BatchEssayRequest;
    if (body.essays.length > account.credits.total) {
      return error('QUOTA_EXCEEDED', 'Você não tem correções suficientes para este envio.', 402);
    }

    const created = body.essays.map((item): EssaySummary => {
      const theme = data.themes.find((candidate) => candidate.id === item.themeId) ?? data.themes[0]!;
      const type = theme.essayTypes.find((candidate) => candidate.id === item.essayTypeId) ?? theme.essayTypes[0]!;
      return {
        id: `essay-new-${++sequence}`,
        title: `${theme.examName} – ${type.name} – ${theme.title}`,
        themeId: theme.id,
        essayTypeId: type.id,
        status: 'uploaded',
        version: item.parentEssayId ? 3 : 1,
        hasVersions: !!item.parentEssayId,
        createdAt: new Date().toISOString(),
        reviewDeadlineAt: null,
        illegibleCount: 0,
        score: null,
        maxScore: null,
        failureCode: null,
      };
    });
    essays = [...created, ...essays];
    account = {
      ...account,
      aiNoticeAccepted: true,
      credits: { ...account.credits, total: account.credits.total - created.length },
    };

    const response = { essayIds: created.map((essay) => essay.id) };
    idempotency.set(key, response);
    return HttpResponse.json(response, { status: 202 });
  }),

  http.get(api('/essays'), async ({ request }) => {
    if (!authenticated(request)) {
      return unauthenticated();
    }
    if (scenario() === 'error') {
      return internal();
    }
    return HttpResponse.json({ items: listEssays(), nextCursor: null });
  }),

  http.get(api('/essays/:id'), ({ params }) => {
    const essay = findEssay(String(params.id));
    return essay ? HttpResponse.json(data.essayDetail(essay)) : essayNotFound();
  }),

  http.put(api('/essays/:id/illegible'), async ({ params, request }) => {
    const essay = findEssay(String(params.id));
    if (!essay) {
      return essayNotFound();
    }
    if (essay.status !== 'awaiting_review') {
      return error('INVALID_STATE', 'Essa ação não está disponível para esta redação agora.', 409);
    }
    if (scenario() === 'expired') {
      return error(
        'REVIEW_EXPIRED',
        'O prazo para preencher as palavras acabou. A redação foi cancelada e a correção voltou para o seu saldo.',
        409,
      );
    }
    const answers = (await request.json()) as IllegibleAnswer[];
    if (answers.length < data.illegibleWords.length || answers.some((answer) => !answer.value.trim())) {
      return error('REVIEW_INCOMPLETE', 'Preencha todas as palavras para enviar.', 422);
    }
    essays = essays.map((item) =>
      item.id === essay.id ? { ...item, status: 'queued', reviewDeadlineAt: null, illegibleCount: 0 } : item,
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/essays/:id/correction'), ({ params }) => {
    const essay = findEssay(String(params.id));
    if (!essay || essay.status !== 'completed') {
      return essayNotFound();
    }
    if (essay.id === 'essay-v1') {
      return HttpResponse.json({ ...correction, id: 'correction-v1', essayId: essay.id, version: 1, score: 21, scoreDelta: null, previousVersion: null, sentAt: essay.createdAt });
    }
    return HttpResponse.json({ ...correction, essayId: essay.id, title: essay.title, sentAt: essay.createdAt, version: essay.version });
  }),

  http.get(api('/essays/:id/photo'), () => HttpResponse.json({ url: '/favicon.svg', expiresAt: new Date(Date.now() + 300_000).toISOString() })),

  http.post(api('/corrections/:id/feedback'), async ({ request }) => {
    correction.feedback = (await request.json()) as NonNullable<typeof correction.feedback>;
    return new HttpResponse(null, { status: 204 });
  }),

  // Pagamentos
  http.get(api('/payments'), () => HttpResponse.json(payments)),

  http.get(api('/payments/:id'), ({ params }) => {
    const payment = payments.find((item) => item.id === params.id);
    if (!payment) {
      return error('NOT_FOUND', 'Não encontramos o que você procura.', 404);
    }
    // O Pix simulado é aprovado alguns segundos depois de criado.
    if (payment.status === 'pending' && Date.now() - new Date(payment.createdAt).getTime() > 6000) {
      payment.status = 'approved';
      account = { ...account, credits: { ...account.credits, total: account.credits.total + payment.quantity } };
    }
    return HttpResponse.json(payment);
  }),

  http.post(api('/checkout/single'), async ({ request }) => {
    const body = (await request.json()) as { quantity: number; method: 'pix' | 'card'; guardianAuthorized?: boolean };
    if (account.needsGuardianAuthorization && !body.guardianAuthorized) {
      return error('GUARDIAN_AUTHORIZATION_REQUIRED', 'Marque a autorização do responsável para continuar.', 422);
    }
    const payment: Payment = {
      id: `payment-${++sequence}`,
      kind: 'single',
      method: body.method,
      amountCents: 1600 * body.quantity,
      quantity: body.quantity,
      status: body.method === 'card' ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
      receiptUrl: null,
      refundable: true,
    };
    rememberPayment(payment);
    if (payment.status === 'approved') {
      account = { ...account, credits: { ...account.credits, total: account.credits.total + body.quantity } };
    }
    const response: CheckoutResponse =
      body.method === 'pix'
        ? {
            method: 'pix',
            paymentId: payment.id,
            qrCode: 'mock',
            copyPaste: '00020126580014br.gov.bcb.pix0136redigiai-mock-0000-0000-000000000000520400005303986540516.005802BR6304ABCD',
            expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          }
        : { method: 'card', paymentId: payment.id, checkoutUrl: `/comprar?pagamento=${payment.id}` };
    return HttpResponse.json(response, { status: 201 });
  }),

  http.post(api('/checkout/plan'), () => {
    const payment: Payment = {
      id: `payment-${++sequence}`,
      kind: 'plan',
      method: 'card',
      amountCents: 3990,
      quantity: 1,
      status: 'approved',
      createdAt: new Date().toISOString(),
      receiptUrl: null,
      refundable: true,
    };
    rememberPayment(payment);
    const response: CheckoutResponse = { method: 'card', paymentId: payment.id, checkoutUrl: `/comprar?pagamento=${payment.id}` };
    return HttpResponse.json(response, { status: 201 });
  }),

  http.post(api('/subscription/cancel'), () => {
    account = { ...account, subscription: account.subscription && { ...account.subscription, status: 'cancelled' } };
    return HttpResponse.json(account);
  }),

  http.post(api('/payments/:id/refund-request'), () => new HttpResponse(null, { status: 202 })),
];
