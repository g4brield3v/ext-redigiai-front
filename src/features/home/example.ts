import type { SheetLine } from '../../components/EssaySheet';

// Redação de exemplo da página inicial: conteúdo fixo, copiado da tela aprovada (docs/telas/html/01-inicio.html).

export const exampleTitle = 'Fuvest – Dissertação – Algoritmos e o debate público';

export const exampleLines: SheetLine[] = [
  { number: 8, indent: true, segments: [{ text: 'Os algoritmos das plataformas decidem o que' }] },
  { number: 9, segments: [{ text: 'cada usuário vê, priorizando sempre o conteúdo' }] },
  { number: 10, segments: [{ text: 'que gera mais engajamento e tempo de tela.' }] },
  {
    number: 11,
    indent: true,
    segments: [{ text: 'Além disso, os algoritmos também escolhem', mark: 'wavy' }],
    note: { text: 'repete o § anterior', criterion: 3 },
  },
  {
    number: 12,
    segments: [{ text: 'o que as pessoas veem, e cada uma recebe', mark: 'wavy' }],
    note: { text: 'sem dado novo' },
  },
  { number: 13, segments: [{ text: 'só aquilo que gera mais engajamento.', mark: 'wavy' }] },
  {
    number: 14,
    indent: true,
    segments: [{ text: 'À partir', mark: 'circle' }, { text: ' desse controle, cabe perguntar' }],
    note: { text: '"A partir", sem crase', criterion: 4 },
  },
  { number: 15, segments: [{ text: 'quem deve regular esse filtro invisível e' }] },
  { number: 16, segments: [{ text: 'com quais critérios.' }] },
];

/** Níveis e pontos do exemplo, por posição do critério na grade. */
export const exampleCriteria = [
  { position: 1, shortName: 'Tema e autoria', level: 3, points: 9, maxPoints: 12, lostPoints: false },
  { position: 2, shortName: 'Gênero', level: 3, points: 6, maxPoints: 8, lostPoints: false },
  { position: 3, shortName: 'Progressão', level: 2, points: 6, maxPoints: 12, lostPoints: true },
  { position: 4, shortName: 'Escrita', level: 3, points: 6, maxPoints: 8, lostPoints: true },
];

/** Níveis da grade do exemplo (Simulado Fuvest 2027: 1 a 4, máximo 40). */
export const exampleMaxLevel = 4;

export const exampleScore = 27;

export const exampleMaxScore = 40;

export const faq = [
  {
    question: 'A correção substitui um professor?',
    answer:
      'Não. Ela segue os critérios públicos da Fuvest e ajuda você a praticar com mais frequência, mas não substitui a banca nem o acompanhamento de um professor.',
  },
  {
    question: 'Como envio a minha redação?',
    answer:
      'Escreva à mão, como na prova, e envie a foto da folha. Transcrevemos exatamente o que está escrito, sem corrigir nada antes da nota. Se uma palavra ficar ilegível, pedimos que você a digite.',
  },
  {
    question: 'Quanto tempo leva?',
    answer:
      'Normalmente poucos minutos. Avisamos por e-mail quando a correção fica pronta, e ela aparece na sua conta.',
  },
  {
    question: 'O que acontece com a minha redação?',
    answer:
      'Ela fica na sua conta e só você vê. Você pode baixar seus dados ou excluir a conta quando quiser.',
  },
];
