import type { Page } from '@playwright/test';

// Respostas da API do catálogo para os testes de tela: mesmos dados do seed do backend.

const rubricId = '0198f0c0-0000-7000-8000-00000000000a';

const types = [
  { id: 't1', slug: 'dissertacao', name: 'Dissertação', description: 'Texto dissertativo-argumentativo', rubricVersionId: rubricId },
  { id: 't2', slug: 'narrativa', name: 'Narrativa', description: 'Texto narrativo com reflexão', rubricVersionId: rubricId },
];

const themes = [
  { id: 'th1', title: 'Algoritmos e o debate público', examSlug: 'fuvest', examName: 'Fuvest', essayTypes: types, textCount: 4 },
  { id: 'th2', title: 'O valor do tempo livre', examSlug: 'fuvest', examName: 'Fuvest', essayTypes: types.slice(0, 1), textCount: 3 },
  { id: 'th3', title: 'Cidades e o direito ao silêncio', examSlug: 'fuvest', examName: 'Fuvest', essayTypes: types, textCount: 5 },
];

const levels = [1, 2, 3].map((level) => ({ level, descriptor: `Descritor do nível ${level}` }));

const rubric = {
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
  zeroRules: [],
};

const exams = [
  { slug: 'fuvest', name: 'Fuvest', status: 'active', sheetLines: 30, currentRubricVersionId: rubricId },
  { slug: 'unicamp', name: 'Unicamp', status: 'coming_soon', sheetLines: 30, currentRubricVersionId: null },
  { slug: 'enem', name: 'Enem', status: 'coming_soon', sheetLines: 30, currentRubricVersionId: null },
];

export async function mockCatalog(page: Page) {
  // Os testes não dependem da rede externa: as fontes do Google ficam de fora (vale a fonte reserva).
  await page.route(/fonts.(googleapis|gstatic).com/, (route) => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/v1/exams', (route) => route.fulfill({ json: exams }));
  await page.route('**/v1/rubrics/*', (route) => route.fulfill({ json: rubric }));
  await page.route('**/v1/exams/fuvest/themes*', (route) => {
    const search = new URL(route.request().url()).searchParams.get('q')?.toLowerCase();
    return route.fulfill({ json: search ? themes.filter((theme) => theme.title.toLowerCase().includes(search)) : themes });
  });
}

/** A página não pode rolar para os lados em nenhuma largura. */
export function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
