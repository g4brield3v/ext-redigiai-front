import type { Page } from '@playwright/test';

// Respostas do catálogo para os testes de tela: o mesmo conteúdo do seed do backend.

export const PROMPT_SLUG = 'algoritmos-e-o-debate-publico';
const rubricId = '0198f0c0-0000-7000-8000-00000000000a';

const summary = { essayType: { slug: 'dissertacao-em-prosa', name: 'Dissertação em prosa' }, examSlug: 'fuvest', examName: 'Fuvest' };

const prompts = [
  { ...summary, id: 'p1', slug: PROMPT_SLUG, title: 'Algoritmos e o debate público', summary: 'Coletânea com tirinha, poema e dois textos.', textCount: 4 },
  { ...summary, id: 'p2', slug: 'o-valor-do-tempo-livre', title: 'O valor do tempo livre', summary: null, textCount: 3 },
  { ...summary, id: 'p3', slug: 'cidades-e-o-direito-ao-silencio', title: 'Cidades e o direito ao silêncio', summary: null, textCount: 5 },
];

// A proposta como na tela aprovada (02b): imagem, prosa, verso em três colunas, comando e instruções.
const promptDetail = {
  ...summary,
  id: 'p1',
  slug: PROMPT_SLUG,
  version: 1,
  status: 'published',
  title: 'Algoritmos e o debate público',
  summary: 'Coletânea com tirinha, poema e dois textos.',
  essayTitle: 'Fuvest – Dissertação em prosa – Algoritmos e o debate público',
  sheetLines: 30,
  textCount: 4,
  blocks: [
    { position: 10, kind: 'collection_item', data: { label: 'Texto 1', format: 'image', source: '[Autor], *[Obra]*.', alt: 'Tirinha em três quadros.' } },
    { position: 20, kind: 'collection_item', data: { label: 'Texto 2', format: 'prose', source: '[Autor], *[Título]*. [Ano]. Adaptado.', body: 'Trecho do texto 2, exatamente como na prova.' } },
    {
      position: 30,
      kind: 'collection_item',
      data: {
        label: 'Texto 3',
        format: 'verse',
        source: '[Autor], *[Obra]*. [Ano].',
        columns: [
          ['Primeiro verso da coluna um', 'Segundo verso da coluna um'],
          ['Primeiro verso da coluna dois', 'Segundo verso da coluna dois'],
          ['Primeiro verso da coluna três', 'Segundo verso da coluna três'],
        ],
      },
    },
    { position: 40, kind: 'collection_item', data: { label: 'Texto 4', format: 'prose', source: '[Autor], [Ano].', body: 'Trecho do texto 4.' } },
    {
      position: 50,
      kind: 'command',
      data: { body: 'Considerando as ideias apresentadas nos textos, redija uma **dissertação em prosa** sobre o tema: **algoritmos e o debate público**.' },
    },
    {
      position: 60,
      kind: 'instructions',
      data: {
        title: 'Instruções',
        items: [
          'A dissertação deve ser redigida de acordo com a norma-padrão da língua portuguesa.',
          'Escreva, no mínimo, 20 linhas, com letra legível e não ultrapasse o espaço de 30 linhas da folha de redação.',
          'Dê um título a sua redação.',
        ],
      },
    },
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
  await page.route(`**/v1/prompts/${PROMPT_SLUG}*`, (route) => route.fulfill({ json: promptDetail }));
  await page.route('**/v1/exams/fuvest/prompts*', (route) => {
    const search = new URL(route.request().url()).searchParams.get('q')?.toLowerCase();
    return route.fulfill({ json: search ? prompts.filter((prompt) => prompt.title.toLowerCase().includes(search)) : prompts });
  });
}

/** A página não pode rolar para os lados em nenhuma largura. */
export function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
