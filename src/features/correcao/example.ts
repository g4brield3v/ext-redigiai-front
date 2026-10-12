// Correções de exemplo: conteúdo fixo e fictício, copiado das telas aprovadas
// (docs/telas/html/09-correcao.html e 09z-correcao-nota-zero.html). Não vêm da API.
// A primeira é a correção pública de /exemplo; a de nota zero é usada nos testes e, só em
// desenvolvimento, em /exemplo/nota-zero.

import type { Annotation, Correction, IllegibleWord, TranscriptionLine } from '../../api/provisional-types';

function toLines(raw: [string, boolean?][]): TranscriptionLine[] {
  return raw.map(([text, indent], index) => ({ number: index + 1, text, indent: indent === true }));
}

export const exampleLines = toLines([
  ['A tecnologia digital mudou a forma como as pessoas se informam', true],
  ['e participam do debate público. Hoje, boa parte dos brasileiros'],
  ['lê notícias apenas pelas redes sociais, como mostra o texto 2 da'],
  ['coletânea. Esse dado, revela que poucas empresas controlam o que'],
  ['milhões de pessoas leem todos os dias, sem que ninguém perceba.'],
  ['Os algoritmos das plataformas decidem o que cada usuário vê,', true],
  ['priorizando sempre o conteúdo que gera mais engajamento e tempo'],
  ['de tela. Por isso, notícias falsas e indignadas circulam mais'],
  ['rápido do que as verdadeiras, como alerta o texto 3.'],
  ['Além disso, os algoritmos também escolhem o que as pessoas', true],
  ['veem, e cada uma recebe só aquilo que gera mais engajamento. Assim,'],
  ['a gente acaba vendo sempre as mesmas opiniões.'],
  ['À partir desse controle, cabe perguntar quem deve regular', true],
  ['esse filtro invisível e com quais critérios. Em países europeus,'],
  ['leis já obrigam as empresas a explicar como seus sistemas'],
  ['recomendam conteúdo, o que mostra que a transparência é possível.'],
  ['Portanto, os algoritmos não são neutros: eles moldam o debate', true],
  ['público ao escolher o que merece atenção. Cabe à sociedade'],
  ['discutir esse tema com seriedade, para que a tecnologia sirva à'],
  ['democracia e não o contrário.'],
]);

type Spot = [line: number, fragment: string];

/** Monta um apontamento como a API devolve: posições e o trecho recortado das linhas. */
function annotate(
  lines: TranscriptionLine[],
  id: number,
  kind: Annotation['kind'],
  criterion: number,
  [lineStart, first]: Spot,
  [lineEnd, last]: Spot,
  note: string,
  ruleName: string | null = null,
  fix: string | null = null,
): Annotation {
  const text = (line: number) => lines[line - 1]!.text;
  const charStart = text(lineStart).indexOf(first);
  const charEnd = text(lineEnd).indexOf(last) + last.length;
  const quote =
    lineStart === lineEnd
      ? text(lineStart).slice(charStart, charEnd)
      : [
          text(lineStart).slice(charStart),
          ...lines.slice(lineStart, lineEnd - 1).map((line) => line.text),
          text(lineEnd).slice(0, charEnd),
        ].join(' ');
  return { id, kind, criterion, lineStart, lineEnd, charStart, charEnd, quote, note, ruleName, fix };
}

function illegible(id: string, lineNumber: number, word: string, contextBefore: string, contextAfter: string): IllegibleWord {
  const start = exampleLines[lineNumber - 1]!.text.indexOf(word);
  return { id, lineNumber, start, end: start + word.length, contextBefore, contextAfter };
}

/** Palavras ilegíveis da tela de revisão aprovada, usadas no mostruário de componentes. */
export const exampleIllegibleWords: IllegibleWord[] = [
  illegible('word-1', 4, 'controlam', '…revela que poucas empresas', 'o que…'),
  illegible('word-2', 11, 'recebe', '…o que as pessoas veem, e cada uma', ''),
];

const rubric = { version: 1, maxLevel: 4, maxScore: 40, versionLabel: 'Fuvest 2027 (v1)' };

export const exampleCorrection: Correction = {
  id: 'exemplo',
  essayId: 'exemplo',
  title: 'Fuvest – Dissertação – Algoritmos e o debate público',
  themeId: '',
  essayTypeId: '',
  sentAt: '2026-10-12T15:00:00Z',
  version: 2,
  examName: 'Fuvest',
  rubric,
  score: 27,
  maxScore: 40,
  scoreDelta: 4,
  previousVersion: 1,
  previousVersionScore: 23,
  zero: { applies: false, ruleCode: null, ruleLabel: null, ruleNote: null, explanation: null },
  strengths: 'O dado do texto 2 sustenta a sua tese logo na introdução.',
  mainIssue: {
    text: 'O parágrafo das linhas 10 a 12 repete o anterior. Troque-o por uma consequência nova, apoiada na coletânea.',
    criterion: 3,
    potentialGain: 6,
  },
  sheetLines: 30,
  lines: exampleLines,
  annotations: [
    annotate(exampleLines, 1, 'good', 1, [3, 'como mostra o texto 2 da'], [4, 'coletânea'], 'O dado do texto 2 sustenta a sua tese logo na introdução.'),
    annotate(exampleLines, 2, 'issue', 4, [4, 'Esse dado, revela'], [4, 'Esse dado, revela'], 'Vírgula separando sujeito e verbo.', 'Vírgula entre sujeito e verbo', 'Esse dado revela'),
    annotate(exampleLines, 3, 'good', 3, [8, 'Por isso,'], [8, 'Por isso,'], 'Conectivo certo: liga a causa (o algoritmo) à consequência (notícias falsas circulam mais).'),
    annotate(exampleLines, 4, 'issue', 3, [10, 'Além disso,'], [11, 'que gera mais engajamento.'], 'Este parágrafo repete a ideia das linhas 6 a 8: não traz informação nova.'),
    annotate(exampleLines, 5, 'issue', 4, [12, 'a gente'], [12, 'a gente'], 'Marca de oralidade no registro formal.', 'Marca de oralidade', 'nós / os usuários'),
    annotate(exampleLines, 6, 'issue', 4, [13, 'À partir'], [13, 'À partir'], '“A” antes de verbo nunca leva crase.', 'Crase antes de verbo', 'A partir'),
    annotate(exampleLines, 7, 'good', 1, [14, 'Em países europeus,'], [16, 'recomendam conteúdo'], 'Repertório próprio, além da coletânea: mostra autoria.'),
    annotate(exampleLines, 8, 'issue', 2, [18, 'Cabe à sociedade'], [19, 'discutir esse tema com seriedade'], 'Conclusão genérica: não responde à pergunta que você mesmo fez na linha 13.'),
  ],
  criteria: [
    {
      position: 1,
      shortName: 'Tema e autoria',
      fullName: 'Compreensão e desenvolvimento do tema, uso da coletânea e autoria',
      weight: 3,
      level: 3,
      points: 9,
      maxPoints: 12,
      pointsLost: 3,
      currentDescriptor: 'Abordagem adequada do tema, com uso produtivo da coletânea e repertório próprio, com fortes indícios de autoria.',
      nextDescriptor: 'Abordagem aprimorada do tema, com apropriação consistente da coletânea e repertório próprio, com indícios robustos de autoria.',
      justification:
        'A tese está clara desde a introdução e o texto 2 é usado como prova, não como resumo. O exemplo europeu das linhas 14 a 16 é seu, mas aparece só de passagem.',
      guidance: 'Transforme o exemplo europeu das linhas 14 a 16 no argumento central de um parágrafo e ligue-o ao dado do texto 2.',
      annotationIds: [1, 7],
    },
    {
      position: 2,
      shortName: 'Tipo e gênero',
      fullName: 'Compreensão e atendimento da proposta quanto à modalidade textual (tipo/gênero)',
      weight: 2,
      level: 3,
      points: 6,
      maxPoints: 8,
      pointsLost: 2,
      currentDescriptor: 'Atendimento adequado: tipo e gênero claramente identificáveis, mesmo que falte algum traço específico.',
      nextDescriptor: 'Atendimento pleno, com domínio evidente da estrutura composicional do tipo e do gênero escolhidos.',
      justification:
        'Introdução com tese, desenvolvimento e conclusão estão presentes. Falta o traço que fecha a dissertação: a conclusão não responde à pergunta da linha 13.',
      guidance: 'Reescreva a conclusão (linhas 17 a 20) dizendo quem deve regular os algoritmos e com que critério.',
      annotationIds: [8],
    },
    {
      position: 3,
      shortName: 'Coesão e progressão',
      fullName: 'Recursos linguísticos (coesão e coerência) e progressão textual',
      weight: 3,
      level: 2,
      points: 6,
      maxPoints: 12,
      pointsLost: 6,
      currentDescriptor: 'Articulação satisfatória, com poucos recursos de coesão e coerência e algumas falhas de composição.',
      nextDescriptor: 'Boa articulação, com recursos adequados de coesão e coerência e raras falhas de composição.',
      justification: 'Os conectivos funcionam, mas o parágrafo das linhas 10 a 12 repete o das linhas 6 a 8: o texto para de avançar no meio.',
      guidance:
        'Troque o parágrafo das linhas 10 a 12 por uma consequência nova, como o efeito das bolhas de opinião sobre o voto, apoiada na coletânea.',
      annotationIds: [3, 4],
    },
    {
      position: 4,
      shortName: 'Escrita e vocabulário',
      fullName: 'Correção gramatical, convenção da escrita e adequação vocabular',
      weight: 2,
      level: 3,
      points: 6,
      maxPoints: 8,
      pointsLost: 2,
      currentDescriptor: 'Rompe raramente as convenções da escrita, com bom domínio da norma-padrão e do vocabulário.',
      nextDescriptor: 'Rompe as convenções apenas de forma mínima e ocasional, com excelente domínio da norma-padrão e do vocabulário.',
      justification: 'Três desvios em 20 linhas, cada um de uma regra diferente.',
      guidance: 'Corrija os três desvios marcados nas linhas 4, 12 e 13.',
      annotationIds: [2, 5, 6],
    },
  ],
  nextSteps: [
    {
      text: 'Troque o parágrafo das linhas 10 a 12 por uma consequência nova, como o efeito das bolhas de opinião sobre o voto, apoiada na coletânea.',
      criterion: 3,
      potentialGain: 6,
    },
    {
      text: 'Transforme o exemplo europeu das linhas 14 a 16 no argumento central de um parágrafo e ligue-o ao dado do texto 2.',
      criterion: 1,
      potentialGain: 3,
    },
    { text: 'Reescreva a conclusão dizendo quem deve regular os algoritmos e com que critério.', criterion: 2, potentialGain: 2 },
  ],
  feedback: null,
};

const zeroLines = toLines([
  ['Sem limites'],
  ['Não há limites para o imaginário humano. Mesmo em condições', true],
  ['adversas, o homem é capaz de criar representações da realidade'],
  ['com a intenção de mudar uma situação vigente, seja para sair da'],
  ['rotina ou para fugir de uma realidade hostil. Essas imagens'],
  ['exercem um papel importante na vida humana, pois vão muito além'],
  ['da diversão: elas alimentam a esperança e, em alguns casos,'],
  ['podem decidir a sobrevivência de uma pessoa.'],
  ['Em um filme muito conhecido, um pai transforma a vida num campo', true],
  ['de prisioneiros em uma brincadeira para proteger o filho.'],
]);

/** Nota zero por fuga ao tema: sem critérios, sem pontos a ganhar. */
export const exampleZeroCorrection: Correction = {
  ...exampleCorrection,
  id: 'exemplo-zero',
  essayId: 'exemplo-zero',
  themeId: 'tema-algoritmos',
  essayTypeId: 'tipo-dissertacao',
  version: 1,
  score: 0,
  scoreDelta: null,
  previousVersion: null,
  previousVersionScore: null,
  zero: {
    applies: true,
    ruleCode: 'theme_not_addressed',
    ruleLabel: 'Não abordagem (compreensão e desenvolvimento) do tema proposto.',
    ruleNote:
      'Texto que não aborda o tema recebe nota zero, e os quatro critérios não são pontuados. Isso é diferente de tangenciar o tema, que só reduz o nível do critério 1.',
    explanation:
      'A proposta pede uma discussão sobre algoritmos e o debate público. O texto trata do imaginário humano como fuga da realidade (linhas 2 a 8) e não menciona algoritmos, redes ou a coletânea em nenhuma linha.',
  },
  strengths:
    'Os exemplos de repertório estão bem escolhidos e sustentam a sua tese; use a mesma segurança com exemplos ligados ao tema.',
  mainIssue: {
    text: 'Releia o enunciado e escreva, numa frase, o recorte pedido antes de planejar a nova redação.',
    criterion: null,
    potentialGain: null,
  },
  lines: zeroLines,
  annotations: [
    annotate(zeroLines, 1, 'issue', 1, [2, 'Não há limites'], [2, 'imaginário humano.'], 'A tese trata do imaginário humano, não de algoritmos e do debate público.'),
    annotate(zeroLines, 2, 'good', 1, [9, 'Em um filme'], [10, 'para proteger o filho'], 'Bom repertório: o exemplo sustenta com clareza a ideia que você defendeu.'),
  ],
  criteria: [],
  nextSteps: [
    {
      text: 'Releia o enunciado e escreva numa frase o recorte pedido: a relação entre algoritmos e o debate público.',
      criterion: null,
      potentialGain: null,
    },
    { text: 'Use pelo menos dois textos da coletânea como ponto de partida dos argumentos.', criterion: null, potentialGain: null },
    {
      text: 'Escolha repertório ligado ao tema, como bolhas de filtro ou desinformação nas redes, com a mesma segurança dos exemplos de filmes.',
      criterion: null,
      potentialGain: null,
    },
  ],
};
