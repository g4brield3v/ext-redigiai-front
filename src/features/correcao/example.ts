// Correção de exemplo, pública (/exemplo): conteúdo fixo e fictício, copiado da tela aprovada
// (docs/telas/html/09-correcao.html). Não vem da API.

import type { Correction, IllegibleWord, TranscriptionLine } from '../../api/provisional-types';

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

export const exampleLines: TranscriptionLine[] = rawLines.map(([text, indent], index) => ({
  number: index + 1,
  text,
  indent: indent === true,
}));

function span(line: number, fragment: string, last = false) {
  const text = exampleLines[line - 1]!.text;
  const start = last ? text.lastIndexOf(fragment) : text.indexOf(fragment);
  return { line, start, end: start + fragment.length };
}

function illegible(id: string, lineNumber: number, word: string, contextBefore: string, contextAfter: string): IllegibleWord {
  const { start, end } = span(lineNumber, word);
  return { id, lineNumber, start, end, contextBefore, contextAfter };
}

/** Palavras ilegíveis da tela de revisão aprovada, usadas no mostruário de componentes. */
export const exampleIllegibleWords: IllegibleWord[] = [
  illegible('word-1', 6, 'controlam', '…revela que poucas empresas', 'o que…'),
  illegible('word-2', 12, 'recebe', '…o que as pessoas veem, e cada uma', ''),
];

const base = { deviations: [], guidance: null };

export const exampleCorrection: Correction = {
  id: 'exemplo',
  essayId: 'exemplo',
  title: 'Fuvest – Dissertação – Algoritmos e o debate público',
  themeId: '',
  essayTypeId: '',
  sentAt: '2026-10-11T00:40:00Z',
  version: 2,
  examName: 'Fuvest',
  rubricVersion: 1,
  score: 27,
  maxScore: 40,
  scoreDelta: 2,
  previousVersion: 1,
  zeroReason: null,
  zeroExplanation: null,
  strengths: 'O dado do texto 2 sustenta a sua tese nas linhas 3 a 7, e a sua posição está clara desde a introdução.',
  mainIssue: 'O parágrafo das linhas 11 a 13 repete o anterior, e a conclusão não responde à pergunta da linha 14.',
  sheetLines: 30,
  lines: exampleLines,
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
    {
      ...base,
      position: 1,
      name: 'Tema, coletânea e autoria',
      weight: 3,
      level: 3,
      maxLevel: 4,
      points: 9,
      maxPoints: 12,
      descriptor: 'Abordagem (compreensão e desenvolvimento) adequada do tema definido pela frase temática, com utilização produtiva da coletânea e mobilização de conhecimentos próprios que demonstrem fortes indícios de autoria.',
      justification:
        'O dado do texto 2 é usado para sustentar a tese, sem paráfrase, e a posição autoral aparece desde a introdução.',
      lines: [3, 4, 5, 6, 7],
      linesLabel: 'Linhas 3 a 7',
    },
    {
      ...base,
      position: 2,
      name: 'Gênero e tipo de texto',
      weight: 2,
      level: 3,
      maxLevel: 4,
      points: 6,
      maxPoints: 8,
      descriptor: 'Atendimento adequado à modalidade textual, permitindo identificar nitidamente tipo e gênero da proposta de redação escolhida, ainda que lhe falte algum traço específico.',
      justification:
        'A estrutura dissertativa está presente, mas a conclusão retoma o tema sem responder à pergunta aberta na linha 14.',
      lines: [27, 28, 29, 30],
      linesLabel: 'Linhas 27 a 30',
      guidance:
        'Reescreva a conclusão para responder à pergunta da linha 14: diga quem deve regular o filtro dos algoritmos e com qual critério.',
    },
    {
      ...base,
      position: 3,
      name: 'Coesão, coerência e progressão',
      weight: 3,
      level: 2,
      maxLevel: 4,
      points: 6,
      maxPoints: 12,
      descriptor: 'Satisfatória articulação formal e de sentido, com poucos recursos linguísticos (coesão e coerência) e algumas falhas na composição textual.',
      justification:
        'Os conectivos funcionam, mas o parágrafo das linhas 11 a 13 repete a ideia das linhas 8 a 10: os dois dizem que os algoritmos escolhem o conteúdo pelo engajamento.',
      lines: [8, 9, 10, 11, 12, 13],
      linesLabel: 'Linhas 8 a 13',
      guidance:
        'Troque o parágrafo das linhas 11 a 13 por uma consequência que ainda não apareceu, como o efeito dessa seleção sobre o voto, sustentada por um dado da coletânea.',
    },
    {
      ...base,
      position: 4,
      name: 'Convenções da escrita e vocabulário',
      weight: 2,
      level: 3,
      maxLevel: 4,
      points: 6,
      maxPoints: 8,
      descriptor: 'Rompe raramente convenções da escrita e apresenta bom domínio da norma padrão gramatical e do vocabulário selecionado.',
      justification: 'Dois desvios de regra:',
      lines: [5, 14],
      linesLabel: 'Linhas 5 e 14',
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
    },
  ],
  nextSteps: [
    'Troque o parágrafo das linhas 11 a 13 por um argumento novo, apoiado na coletânea.',
    'Faça a conclusão responder à pergunta da linha 14.',
    'Corrija a crase da linha 14 e a vírgula da linha 5.',
  ],
  feedback: null,
};
