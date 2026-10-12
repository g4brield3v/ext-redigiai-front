import type { Page } from '@playwright/test';

// Respostas do catálogo para os testes de tela: o mesmo conteúdo do seed do backend.

export const THEME_ID = '0198f0c0-0000-7000-8000-000000000101';
const rubricId = '0198f0c0-0000-7000-8000-00000000000a';

const types = [
  { id: 't1', slug: 'dissertacao', name: 'Dissertação', description: 'Texto dissertativo-argumentativo', rubricVersionId: rubricId, instruction: 'Defenda um ponto de vista.' },
  { id: 't2', slug: 'narrativa', name: 'Narrativa', description: 'Texto narrativo com reflexão', rubricVersionId: rubricId, instruction: 'Conte uma história com reflexão.' },
];

const themes = [
  { id: THEME_ID, title: 'Algoritmos e o debate público', examSlug: 'fuvest', examName: 'Fuvest', essayTypes: types, textCount: 4 },
  { id: 'th2', title: 'O valor do tempo livre', examSlug: 'fuvest', examName: 'Fuvest', essayTypes: types.slice(0, 1), textCount: 3 },
  { id: 'th3', title: 'Cidades e o direito ao silêncio', examSlug: 'fuvest', examName: 'Fuvest', essayTypes: types, textCount: 5 },
];

const themeDetail = {
  id: THEME_ID,
  title: 'Algoritmos e o debate público',
  statement: 'Enunciado da proposta.',
  examSlug: 'fuvest',
  examName: 'Fuvest',
  sheetLines: 30,
  essayTypes: types,
  texts: [
    { position: 1, kind: 'text', title: 'Título', source: 'Fonte', body: 'Trecho do texto 1.' },
    { position: 2, kind: 'image', title: 'Gráfico', source: 'Fonte', body: null },
  ],
};

const levels = [1, 2, 3, 4].map((level) => ({ level, descriptor: `Descritor do nível ${level}` }));

const rubric = {
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
  zeroRules: [],
};

const exams = [
  { slug: 'fuvest', name: 'Fuvest', status: 'active', sheetLines: 30, currentRubricVersionId: rubricId },
  { slug: 'unicamp', name: 'Unicamp', status: 'coming_soon', sheetLines: 30, currentRubricVersionId: null },
  { slug: 'enem', name: 'Enem', status: 'coming_soon', sheetLines: 30, currentRubricVersionId: null },
];

/** Intercepta as chamadas do catálogo; nenhuma requisição dos testes sai para um backend real. */
export async function interceptCatalog(page: Page) {
  await page.route('**/v1/exams', (route) => route.fulfill({ json: exams }));
  await page.route('**/v1/rubrics/*', (route) => route.fulfill({ json: rubric }));
  await page.route(`**/v1/themes/${THEME_ID}`, (route) => route.fulfill({ json: themeDetail }));
  await page.route('**/v1/exams/fuvest/themes*', (route) => {
    const search = new URL(route.request().url()).searchParams.get('q')?.toLowerCase();
    return route.fulfill({ json: search ? themes.filter((theme) => theme.title.toLowerCase().includes(search)) : themes });
  });
}

/** A página não pode rolar para os lados em nenhuma largura. */
export function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
