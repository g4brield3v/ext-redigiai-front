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

const essayTypes: Schemas['EssayTypeDto'][] = [
  { id: 't1', slug: 'dissertacao', name: 'Dissertação', description: 'Texto dissertativo-argumentativo', rubricVersionId: rubricId, instruction: 'Defenda um ponto de vista.' },
  { id: 't2', slug: 'narrativa', name: 'Narrativa', description: 'Texto narrativo com reflexão', rubricVersionId: rubricId, instruction: 'Conte uma história com reflexão.' },
];

export const themes: Schemas['ThemeSummaryDto'][] = [
  { id: 'th1', title: 'Algoritmos e o debate público', examSlug: 'fuvest', examName: 'Fuvest', essayTypes, textCount: 4 },
  { id: 'th2', title: 'O valor do tempo livre', examSlug: 'fuvest', examName: 'Fuvest', essayTypes: essayTypes.slice(0, 1), textCount: 1 },
];

const levels = [1, 2, 3].map((level) => ({ level, descriptor: `Descritor ${level}` }));

export const rubric: Schemas['RubricDto'] = {
  id: rubricId,
  examSlug: 'fuvest',
  examName: 'Fuvest',
  version: 1,
  maxScore: 30,
  criteria: [
    { position: 1, name: 'Tema, coletânea e autoria', weight: 3, maxPoints: 9, levels },
    { position: 2, name: 'Gênero e tipo de texto', weight: 2, maxPoints: 6, levels },
    { position: 3, name: 'Coesão, coerência e progressão', weight: 3, maxPoints: 9, levels },
    { position: 4, name: 'Convenções da escrita e vocabulário', weight: 2, maxPoints: 6, levels },
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
  'GET /v1/exams/fuvest/themes': json(themes),
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
