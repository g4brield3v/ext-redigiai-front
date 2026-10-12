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

export type Annotation = Schemas['CorrectionAnnotationDto'];
export type CorrectionCriterion = Schemas['CorrectionCriterionDto'];
export type CorrectionPoint = Schemas['CorrectionPointDto'];
export type FeedbackRating = Schemas['FeedbackRating'];
export type Correction = Schemas['CorrectionDto'];

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
