import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext, signedOut } from '../features/auth/AuthContext';
import type { Auth } from '../features/auth/AuthContext';
import type { Schemas } from '../lib/api';

export const rubricId = '0198f0c0-0000-7000-8000-00000000000a';

export const exams: Schemas['ExamDto'][] = [
  { slug: 'fuvest', name: 'Fuvest', status: 'active', sheetLines: 30, currentRubricVersionId: rubricId },
  { slug: 'unicamp', name: 'Unicamp', status: 'coming_soon', sheetLines: 30, currentRubricVersionId: null },
  { slug: 'enem', name: 'Enem', status: 'coming_soon', sheetLines: 30, currentRubricVersionId: null },
];

export const promptSlug = 'algoritmos-e-o-debate-publico';

export const prompts: Schemas['PromptSummaryDto'][] = [
  {
    id: 'p1',
    slug: promptSlug,
    title: 'Algoritmos e o debate público',
    summary: 'Coletânea com tirinha, poema e dois textos.',
    essayType: { slug: 'dissertacao-em-prosa', name: 'Dissertação em prosa' },
    textCount: 4,
    examSlug: 'fuvest',
    examName: 'Fuvest',
  },
  {
    id: 'p2',
    slug: 'o-valor-do-tempo-livre',
    title: 'O valor do tempo livre',
    summary: null,
    essayType: { slug: 'narrativa', name: 'Narrativa' },
    textCount: 1,
    examSlug: 'fuvest',
    examName: 'Fuvest',
  },
];

/** A página da proposta, com um bloco de cada tipo e os três formatos de texto da coletânea. */
export const prompt: Schemas['PromptDetailDto'] = {
  id: 'p1',
  slug: promptSlug,
  version: 1,
  status: 'published',
  title: 'Algoritmos e o debate público',
  summary: 'Coletânea com tirinha, poema e dois textos.',
  essayType: { slug: 'dissertacao-em-prosa', name: 'Dissertação em prosa' },
  essayTitle: 'Fuvest – Dissertação em prosa – Algoritmos e o debate público',
  examSlug: 'fuvest',
  examName: 'Fuvest',
  sheetLines: 30,
  textCount: 3,
  blocks: [
    { position: 5, kind: 'heading', data: { text: 'Leia os textos' } },
    {
      position: 10,
      kind: 'collection_item',
      data: { label: 'Texto 1', format: 'image', source: 'Verissimo, *As cobras*.', imageUrl: 'https://res.cloudinary.com/test/image/upload/prompts/tirinha', alt: 'Tirinha com duas cobras.' },
    },
    {
      position: 20,
      kind: 'collection_item',
      data: { label: 'Texto 2', format: 'prose', source: 'Carl Sagan, 1996.', body: 'Quase ninguém compreende a **ciência**.\nÉ uma receita para o desastre.' },
    },
    {
      position: 30,
      kind: 'collection_item',
      data: { label: 'Texto 3', format: 'verse', source: 'Gilberto Gil, *Quanta*. 1997.', columns: [['Quanta do latim', 'Plural de quantum'], ['Cântico dos cânticos']] },
    },
    { position: 40, kind: 'divider', data: {} },
    {
      position: 45,
      kind: 'card',
      data: {
        title: 'Para refletir',
        cardItems: [
          { format: 'text', body: 'O investimento em **pesquisa** caiu.', caption: 'Fonte: CNPq, 2024.' },
          { format: 'image', imageUrl: 'https://res.cloudinary.com/test/image/upload/prompts/grafico', alt: 'Gráfico de barras.' },
          { format: 'text', body: 'Terceiro bloco do card.' },
        ],
      },
    },
    { position: 50, kind: 'command', data: { body: 'Redija uma dissertação em prosa sobre o tema: **algoritmos e o debate público**.' } },
    { position: 55, kind: 'paragraph', data: { body: 'Use os textos como apoio, sem copiar.' } },
    { position: 60, kind: 'instructions', data: { title: 'Instruções', items: ['Escreva, no mínimo, 20 linhas.', 'Dê um título a sua redação.'] } },
  ],
};

const levels = [1, 2, 3, 4].map((level) => ({ level, descriptor: `Descritor ${level}` }));

export const rubric: Schemas['RubricDto'] = {
  id: rubricId,
  examSlug: 'fuvest',
  examName: 'Fuvest',
  version: 1,
  maxLevel: 4,
  maxScore: 40,
  criteria: [
    { position: 1, name: 'Tema, coletânea e autoria', weight: 3, maxPoints: 12, levels },
    { position: 2, name: 'Gênero e tipo de texto', weight: 2, maxPoints: 8, levels },
    { position: 3, name: 'Coesão, coerência e progressão', weight: 3, maxPoints: 12, levels },
    { position: 4, name: 'Convenções da escrita e vocabulário', weight: 2, maxPoints: 8, levels },
  ],
  zeroRules: [{ code: 'full_copy', description: 'Cópia integral da coletânea' }],
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export function apiError(code: string, message: string, status: number, retryable = false) {
  return json({ code, message, retryable, traceId: 'trace-1' }, status);
}

type Handler = (request: Request, url: URL) => Response | Promise<Response>;

/** Troca o fetch global por respostas por "MÉTODO /caminho". Devolve as requisições recebidas. */
export function mockApi(handlers: Record<string, Handler | Response>) {
  const requests: { method: string; url: URL; body: unknown; headers: Headers }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request | string, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      const text = await request.clone().text();
      requests.push({ method: request.method, url, body: text ? JSON.parse(text) : null, headers: request.headers });

      const handler = handlers[`${request.method} ${url.pathname}`];
      if (!handler) {
        return apiError('NOT_FOUND', 'Não encontramos o que você procura.', 404);
      }
      return handler instanceof Response ? handler.clone() : handler(request, url);
    }),
  );
  return requests;
}

export const catalogHandlers = {
  'GET /v1/exams': json(exams),
  'GET /v1/exams/fuvest/prompts': json(prompts),
  [`GET /v1/prompts/${promptSlug}`]: json(prompt),
  [`GET /v1/rubrics/${rubricId}`]: json(rubric),
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

export function renderApp(ui: ReactElement, { route = '/', path = '*', auth = signedOut }: { route?: string; path?: string; auth?: Auth } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}
