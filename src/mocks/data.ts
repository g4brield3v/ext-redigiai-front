// Dados simulados: os mesmos das telas aprovadas em docs/telas (Ana, "Algoritmos e o debate público", 23/30).

import type {
  Account,
  Correction,
  EssayDetail,
  EssaySummary,
  IllegibleWord,
  Payment,
  Progress,
  TranscriptionLine,
} from '../api/mock-types';
import type { components } from '../api/schema';

type Schemas = components['schemas'];

export const rubricId = '0198f0c0-0000-7000-8000-00000000000a';
export const algorithmsThemeId = '0198f0c0-0000-7000-8000-000000000101';

const dissertacao: Schemas['EssayTypeDto'] = {
  id: '0198f0c0-0000-7000-8000-000000000201',
  slug: 'dissertacao',
  name: 'Dissertação',
  description: 'Texto dissertativo-argumentativo',
  rubricVersionId: rubricId,
};

const narrativa: Schemas['EssayTypeDto'] = {
  id: '0198f0c0-0000-7000-8000-000000000202',
  slug: 'narrativa',
  name: 'Narrativa',
  description: 'Texto narrativo com reflexão',
  rubricVersionId: rubricId,
};

export const exams: Schemas['ExamDto'][] = [
  { slug: 'fuvest', name: 'Fuvest', status: 'active', sheetLines: 30, currentRubricVersionId: rubricId },
  { slug: 'unicamp', name: 'Unicamp', status: 'coming_soon', sheetLines: 30, currentRubricVersionId: null },
  { slug: 'enem', name: 'Enem', status: 'coming_soon', sheetLines: 30, currentRubricVersionId: null },
];

function theme(index: number, title: string, types: Schemas['EssayTypeDto'][], textCount: number): Schemas['ThemeSummaryDto'] {
  return {
    id: `0198f0c0-0000-7000-8000-00000000010${index}`,
    title,
    examSlug: 'fuvest',
    examName: 'Fuvest',
    essayTypes: types,
    textCount,
  };
}

export const themes: Schemas['ThemeSummaryDto'][] = [
  theme(1, 'Algoritmos e o debate público', [dissertacao, narrativa], 4),
  theme(2, '[Tema]', [dissertacao, narrativa], 3),
  theme(3, '[Tema]', [dissertacao], 4),
  theme(4, '[Tema]', [dissertacao], 5),
  theme(5, '[Tema]', [dissertacao, narrativa], 4),
  theme(6, '[Tema]', [dissertacao], 3),
];

export function themeDetail(summary: Schemas['ThemeSummaryDto']): Schemas['ThemeDetailDto'] {
  return {
    id: summary.id,
    title: summary.title,
    statement:
      '[Enunciado da proposta: o que o candidato deve discutir sobre o tema, como usar a coletânea e as instruções de cada tipo de redação aceito.]',
    examSlug: summary.examSlug,
    examName: summary.examName,
    sheetLines: 30,
    essayTypes: summary.essayTypes,
    texts: [
      { position: 1, kind: 'text', title: '[Título]', source: '[Fonte]', body: '[Trecho do texto 1.]' },
      { position: 2, kind: 'text', title: '[Título]', source: '[Fonte]', body: '[Trecho do texto 2.]' },
      { position: 3, kind: 'image', title: '[Gráfico ou charge]', source: '[Fonte]', body: null },
      { position: 4, kind: 'text', title: '[Título]', source: '[Fonte]', body: '[Trecho do texto 4.]' },
    ],
  };
}

const descriptors: Record<number, string[]> = {
  1: [
    'Desenvolvimento insuficiente, com pouca apropriação da coletânea.',
    'Desenvolvimento razoável, com uso parcial da coletânea.',
    'Desenvolvimento adequado, com apropriação consistente da coletânea e indícios de autoria.',
  ],
  2: [
    'Atendimento precário ao gênero e ao tipo solicitados.',
    'Atendimento razoável ao gênero e ao tipo solicitados.',
    'Atendimento pleno ao gênero e ao tipo solicitados.',
  ],
  3: [
    'Articulação precária, com problemas de composição.',
    'Boa articulação, com composição adequada.',
    'Articulação plena, com progressão consistente.',
  ],
  4: [
    'Rompe muitas vezes as convenções da escrita.',
    'Rompe poucas vezes as convenções, com bom domínio da norma-padrão.',
    'Segue as convenções, com vocabulário preciso.',
  ],
};

const criteriaNames = [
  { position: 1, name: 'Tema, coletânea e autoria', weight: 3 },
  { position: 2, name: 'Gênero e tipo de texto', weight: 2 },
  { position: 3, name: 'Coesão, coerência e progressão', weight: 3 },
  { position: 4, name: 'Convenções da escrita e vocabulário', weight: 2 },
];

export const rubric: Schemas['RubricDto'] = {
  id: rubricId,
  examSlug: 'fuvest',
  examName: 'Fuvest',
  version: 1,
  maxScore: 30,
  criteria: criteriaNames.map((criterion) => ({
    ...criterion,
    maxPoints: criterion.weight * 3,
    levels: descriptors[criterion.position]!.map((descriptor, index) => ({ level: index + 1, descriptor })),
  })),
  zeroRules: [
    { code: 'theme_not_developed', description: 'Tema não desenvolvido' },
    { code: 'type_not_met', description: 'Tipo de texto não atendido' },
    { code: 'full_copy', description: 'Cópia integral da coletânea' },
    { code: 'candidate_identified', description: 'Identificação do candidato, como nome ou assinatura na folha' },
  ],
};

export const account: Account = {
  id: '0198f0c0-0000-7000-8000-0000000000aa',
  email: 'ana.souza@email.com',
  name: 'Ana Souza',
  termsAcceptanceRequired: false,
  aiNoticeAccepted: true,
  emailPreferences: { correctionReady: true, illegibleReminder: true, newThemes: false },
  credits: {
    total: 3,
    buckets: [
      { source: 'plan_week', remaining: 2, expiresAt: '2026-11-01T03:00:00Z' },
      { source: 'single', remaining: 1, expiresAt: null },
    ],
  },
  subscription: { status: 'active', nextBillingAt: '2026-11-01T03:00:00Z', cardLast4: '4242' },
  targetExamSlug: 'fuvest',
  loginProvider: 'google',
  needsGuardianAuthorization: false,
};

const rawLines: [string, boolean?][] = [
  ['A tecnologia digital mudou a forma como as', true],
  ['pessoas se informam e participam do debate'],
  ['público. Hoje, boa parte dos brasileiros lê'],
  ['notícias apenas pelas redes sociais, como'],
  ['mostra o texto 2 da coletânea. Esse dado,'],
  ['revela que poucas empresas controlam o que'],
  ['milhões de pessoas leem todos os dias.'],
  ['Os algoritmos das plataformas decidem o que', true],
  ['cada usuário vê, priorizando sempre o conteúdo'],
  ['que gera mais engajamento e tempo de tela.'],
  ['Além disso, os algoritmos também escolhem', true],
  ['o que as pessoas veem, e cada uma recebe'],
  ['só aquilo que gera mais engajamento.'],
  ['À partir desse controle, cabe perguntar', true],
  ['quem deve regular esse filtro invisível e'],
  ['com quais critérios.'],
];

export const essayLines: TranscriptionLine[] = rawLines.map(([text, indent], index) => ({
  number: index + 1,
  text,
  indent: indent === true,
}));

function illegible(id: string, lineNumber: number, word: string, contextBefore: string, contextAfter: string): IllegibleWord {
  const start = essayLines[lineNumber - 1]!.text.indexOf(word);
  return { id, lineNumber, start, end: start + word.length, contextBefore, contextAfter };
}

export const illegibleWords: IllegibleWord[] = [
  illegible('word-1', 6, 'controlam', '…revela que poucas empresas', 'o que…'),
  illegible('word-2', 12, 'recebe', '…o que as pessoas veem, e cada uma', ''),
];

const algorithmsTitle = 'Fuvest – Dissertação – Algoritmos e o debate público';

function essay(
  id: string,
  title: string,
  status: EssaySummary['status'],
  createdAt: string,
  extra: Partial<EssaySummary> = {},
): EssaySummary {
  return {
    id,
    title,
    themeId: themes[1]!.id,
    essayTypeId: dissertacao.id,
    status,
    version: 1,
    hasVersions: false,
    createdAt,
    reviewDeadlineAt: null,
    illegibleCount: 0,
    score: null,
    maxScore: null,
    failureCode: null,
    ...extra,
  };
}

// "Hoje" das telas é 11/10/2026; os horários estão em UTC (Brasília = UTC−3).
export const initialEssays: EssaySummary[] = [
  essay('essay-review', 'Fuvest – Narrativa – [Tema]', 'awaiting_review', '2026-10-11T12:12:00Z', {
    essayTypeId: narrativa.id,
    reviewDeadlineAt: '2026-10-12T12:12:00Z',
    illegibleCount: 2,
  }),
  essay('essay-v2', algorithmsTitle, 'completed', '2026-10-11T00:40:00Z', {
    themeId: algorithmsThemeId,
    version: 2,
    hasVersions: true,
    score: 23,
    maxScore: 30,
  }),
  essay('essay-processing', 'Fuvest – Dissertação – [Tema]', 'processing', '2026-10-10T20:05:00Z', { themeId: themes[2]!.id }),
  essay('essay-queued', 'Fuvest – Dissertação – [Tema]', 'queued', '2026-10-10T19:30:00Z', { themeId: themes[3]!.id }),
  essay('essay-v1', algorithmsTitle, 'completed', '2026-09-28T22:15:00Z', {
    themeId: algorithmsThemeId,
    version: 1,
    hasVersions: true,
    score: 21,
    maxScore: 30,
  }),
  essay('essay-failed', 'Fuvest – Dissertação – [Tema]', 'failed', '2026-10-02T18:00:00Z', {
    themeId: themes[5]!.id,
    failureCode: 'GRADING_FAILED',
  }),
];

export function essayDetail(summary: EssaySummary): EssayDetail {
  return {
    ...summary,
    sheetLines: 30,
    lines: essayLines,
    illegibleWords: summary.status === 'awaiting_review' ? illegibleWords : [],
  };
}

/** Redação fixa da tela de revisão aprovada (título do tema de exemplo). */
export const reviewExample: EssaySummary = essay('exemplo', algorithmsTitle, 'awaiting_review', '2026-10-11T12:12:00Z', {
  themeId: algorithmsThemeId,
  reviewDeadlineAt: '2026-10-12T12:12:00Z',
  illegibleCount: 2,
});

function span(line: number, fragment: string, last = false) {
  const text = essayLines[line - 1]!.text;
  const start = last ? text.lastIndexOf(fragment) : text.indexOf(fragment);
  return { line, start, end: start + fragment.length };
}

function criterion(position: number, level: number, rest: Omit<Correction['criteria'][number], 'position' | 'name' | 'weight' | 'level' | 'points' | 'maxPoints' | 'descriptor'>) {
  const base = criteriaNames[position - 1]!;
  return {
    ...base,
    level,
    points: level * base.weight,
    maxPoints: 3 * base.weight,
    descriptor: descriptors[position]![level - 1]!,
    ...rest,
  };
}

export const correction: Correction = {
  id: 'correction-v2',
  essayId: 'essay-v2',
  title: algorithmsTitle,
  themeId: algorithmsThemeId,
  essayTypeId: dissertacao.id,
  sentAt: '2026-10-11T00:40:00Z',
  version: 2,
  examName: 'Fuvest',
  rubricVersion: 1,
  score: 23,
  maxScore: 30,
  scoreDelta: 2,
  previousVersion: 1,
  zeroReason: null,
  zeroExplanation: null,
  strengths: 'O dado do texto 2 sustenta a sua tese nas linhas 3 a 7, e a sua posição está clara desde a introdução.',
  mainIssue: 'O parágrafo das linhas 11 a 13 repete o anterior, e a conclusão não responde à pergunta da linha 14.',
  sheetLines: 30,
  lines: essayLines,
  marks: [
    { criterion: 1, kind: 'good', ...span(3, 'Hoje, boa parte dos brasileiros lê'), note: 'bom uso do texto 2', tagged: true },
    { criterion: 1, kind: 'good', ...span(4, 'notícias apenas pelas redes sociais, como'), note: null, tagged: false },
    { criterion: 1, kind: 'good', ...span(5, 'mostra o texto 2 da coletânea.'), note: null, tagged: false },
    { criterion: 4, kind: 'issue', ...span(5, ',', true), note: '"dado revela", sem vírgula', tagged: true },
    { criterion: 3, kind: 'issue', ...span(11, 'Além disso, os algoritmos também escolhem'), note: 'repete o § anterior', tagged: true },
    { criterion: 3, kind: 'issue', ...span(12, 'o que as pessoas veem, e cada uma recebe'), note: 'sem dado novo', tagged: false },
    { criterion: 3, kind: 'issue', ...span(13, 'só aquilo que gera mais engajamento.'), note: null, tagged: false },
    { criterion: 4, kind: 'issue', ...span(14, 'À partir'), note: '"A partir", sem crase', tagged: true },
  ],
  criteria: [
    criterion(1, 3, {
      justification:
        'O dado do texto 2 é usado para sustentar a tese, sem paráfrase, e a posição autoral aparece desde a introdução.',
      lines: [3, 4, 5, 6, 7],
      linesLabel: 'Linhas 3 a 7',
      guidance: null,
      deviations: [],
    }),
    criterion(2, 2, {
      justification:
        'A estrutura dissertativa está presente, mas a conclusão retoma o tema sem responder à pergunta aberta na linha 14.',
      lines: [27, 28, 29, 30],
      linesLabel: 'Linhas 27 a 30',
      guidance:
        'Reescreva a conclusão para responder à pergunta da linha 14: diga quem deve regular o filtro dos algoritmos e com qual critério.',
      deviations: [],
    }),
    criterion(3, 2, {
      justification:
        'Os conectivos funcionam, mas o parágrafo das linhas 11 a 13 repete a ideia das linhas 8 a 10: os dois dizem que os algoritmos escolhem o conteúdo pelo engajamento.',
      lines: [8, 9, 10, 11, 12, 13],
      linesLabel: 'Linhas 8 a 13',
      guidance:
        'Troque o parágrafo das linhas 11 a 13 por uma consequência que ainda não apareceu, como o efeito dessa seleção sobre o voto, sustentada por um dado da coletânea.',
      deviations: [],
    }),
    criterion(4, 2, {
      justification: 'Dois desvios de regra:',
      lines: [5, 14],
      linesLabel: 'Linhas 5 e 14',
      guidance: null,
      deviations: [
        {
          rule: 'Crase antes de verbo',
          line: 14,
          correction: 'Escreva "A partir", sem crase: "a" antes de verbo nunca leva acento grave.',
        },
        {
          rule: 'Vírgula entre sujeito e verbo',
          line: 5,
          correction: 'Retire a vírgula de "Esse dado, revela": sujeito e verbo não se separam por vírgula.',
        },
      ],
    }),
  ],
  nextSteps: [
    'Troque o parágrafo das linhas 11 a 13 por um argumento novo, apoiado na coletânea.',
    'Faça a conclusão responder à pergunta da linha 14.',
    'Corrija a crase da linha 14 e a vírgula da linha 5.',
  ],
  feedback: null,
};

export const progress: Progress = {
  points: [
    { essayId: 'essay-a', date: '2026-09-14T15:00:00Z', score: 17, maxScore: 30 },
    { essayId: 'essay-b', date: '2026-09-21T15:00:00Z', score: 19, maxScore: 30 },
    { essayId: 'essay-v1', date: '2026-09-28T22:15:00Z', score: 21, maxScore: 30 },
    { essayId: 'essay-v2', date: '2026-10-11T00:40:00Z', score: 23, maxScore: 30 },
  ],
  lastDelta: 2,
  focus: {
    criterionPosition: 3,
    criterionName: 'Coesão, coerência e progressão',
    guidance:
      'Seus parágrafos de desenvolvimento repetem o argumento anterior. Abra cada novo parágrafo com uma ideia que ainda não apareceu no texto.',
    essayId: 'essay-v2',
  },
};

export const payments: Payment[] = [
  {
    id: 'payment-plan',
    kind: 'plan',
    method: 'card',
    amountCents: 3990,
    quantity: 1,
    status: 'approved',
    createdAt: '2026-09-28T15:00:00Z',
    receiptUrl: '#',
    refundable: false,
  },
  {
    id: 'payment-single',
    kind: 'single',
    method: 'pix',
    amountCents: 1600,
    quantity: 1,
    status: 'approved',
    createdAt: '2026-09-14T15:00:00Z',
    receiptUrl: '#',
    refundable: false,
  },
];
