// Tipos provisórios dos endpoints que o backend ainda não publica no openapi.json (etapas 2 a 5).
// Seguem a seção 6 da especificação. Quando o endpoint entrar no cliente gerado (schema.d.ts),
// apague o tipo daqui e use o gerado.

import type { components } from './schema';

type Schemas = components['schemas'];

// Já publicados pelo backend: estes nomes só apontam para os tipos gerados.
export type EssayStatus = Schemas['EssayStatus'];
export type EssaySummary = Schemas['EssaySummaryDto'];
export type EssayDetail = Schemas['EssayDetailDto'];
export type TranscriptionLine = Schemas['TranscriptionLineDto'];
export type IllegibleWord = Schemas['IllegibleWordDto'];

export type IllegibleAnswer = { wordId: string; value: string };

export type CorrectionMark = {
  criterion: number;
  kind: 'good' | 'issue';
  line: number;
  start: number;
  end: number;
  /** Nota de margem, na mesma linha da marca. */
  note: string | null;
  /** Quando verdadeiro, o selo do critério acompanha a nota. */
  tagged: boolean;
};

export type RuleDeviation = { rule: string; line: number; correction: string };

export type CorrectionCriterion = {
  position: number;
  name: string;
  weight: number;
  level: number;
  /** Nível mais alto da grade usada (4 na Fuvest atual). */
  maxLevel: number;
  points: number;
  maxPoints: number;
  /** Descritor oficial do nível, da grade. */
  descriptor: string;
  justification: string;
  lines: number[];
  /** Texto pronto da referência às linhas: "Linhas 3 a 7". */
  linesLabel: string;
  guidance: string | null;
  deviations: RuleDeviation[];
};

export type FeedbackRating = 'helped_a_lot' | 'helped_partly' | 'did_not_help';

export type Correction = {
  id: string;
  essayId: string;
  title: string;
  themeId: string;
  essayTypeId: string;
  sentAt: string;
  version: number;
  examName: string;
  rubricVersion: number;
  score: number;
  maxScore: number;
  /** Diferença para a versão anterior da mesma redação. */
  scoreDelta: number | null;
  previousVersion: number | null;
  zeroReason: string | null;
  zeroExplanation: string | null;
  strengths: string;
  mainIssue: string;
  sheetLines: number;
  lines: TranscriptionLine[];
  marks: CorrectionMark[];
  criteria: CorrectionCriterion[];
  nextSteps: string[];
  feedback: { rating: FeedbackRating; comment: string | null } | null;
};

export type Progress = {
  points: { essayId: string; date: string; score: number; maxScore: number }[];
  lastDelta: number | null;
  focus: { criterionPosition: number; criterionName: string; guidance: string; essayId: string } | null;
};

export type Subscription = {
  status: 'active' | 'paused' | 'cancelled';
  nextBillingAt: string | null;
  cardLast4: string | null;
};

/** `GET /v1/me` com a assinatura e o vestibular de interesse, que o backend ainda não devolve. */
export type Account = Schemas['ProfileDto'] & {
  subscription: Subscription | null;
  targetExamSlug: string | null;
  loginProvider: 'google' | 'email';
  /** 16 ou 17 anos: a compra exige a declaração de autorização do responsável. */
  needsGuardianAuthorization: boolean;
};

export type Payment = {
  id: string;
  kind: 'plan' | 'single';
  method: 'pix' | 'card';
  amountCents: number;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  createdAt: string;
  receiptUrl: string | null;
  /** Dentro dos 7 dias do direito de arrependimento. */
  refundable: boolean;
};

export type PixCheckout = {
  paymentId: string;
  qrCode: string;
  copyPaste: string;
  expiresAt: string;
};

export type CheckoutResponse =
  | ({ method: 'pix' } & PixCheckout)
  | { method: 'card'; paymentId: string; checkoutUrl: string };
