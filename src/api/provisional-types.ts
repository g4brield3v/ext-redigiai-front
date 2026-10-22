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

export type Progress = Schemas['ProgressDto'];

/** `GET /v1/me` com o vestibular de interesse e o modo de login, que o backend ainda não devolve. */
export type Account = Schemas['ProfileDto'] & {
  targetExamSlug: string | null;
  loginProvider: 'google' | 'email';
};

// Já publicados pelo backend.
export type Payment = Schemas['PaymentDto'];
export type RefundRequest = Schemas['RefundRequestDto'];
