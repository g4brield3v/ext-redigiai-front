import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Account, Correction, EssayStatus, Payment, Progress } from '../api/provisional-types';
import { api, request, unwrap } from './api';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useExams() {
  return useQuery({
    queryKey: ['exams'],
    queryFn: () => unwrap(api.GET('/v1/exams')),
    staleTime: FIVE_MINUTES,
  });
}

/** Propostas publicadas do vestibular. */
export function usePrompts(examSlug: string | undefined, search: string) {
  return useQuery({
    queryKey: ['prompts', examSlug, search],
    queryFn: () =>
      unwrap(
        api.GET('/v1/exams/{slug}/prompts', {
          params: { path: { slug: examSlug! }, query: search ? { q: search } : {} },
        }),
      ),
    enabled: !!examSlug,
    placeholderData: keepPreviousData,
  });
}

export function useRubric(versionId: string | null | undefined) {
  return useQuery({
    queryKey: ['rubric', versionId],
    queryFn: () => unwrap(api.GET('/v1/rubrics/{versionId}', { params: { path: { versionId: versionId! } } })),
    enabled: !!versionId,
    staleTime: FIVE_MINUTES,
  });
}

// Endpoints que ainda não estão no cliente gerado: tipos provisórios em api/provisional-types.ts.

const IN_PROGRESS: EssayStatus[] = ['uploaded', 'queued', 'processing'];

/** Conta do aluno logado: perfil, saldo e assinatura. */
export function useAccount(enabled = true) {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => request<Account>('GET', '/v1/me'),
    enabled,
    retry: false,
  });
}

/** Lista do painel. Enquanto houver redação em andamento, consulta de novo a cada 5 s com a aba visível. */
export function useEssays(enabled = true) {
  return useQuery({
    queryKey: ['essays'],
    queryFn: () => unwrap(api.GET('/v1/essays')),
    enabled,
    refetchInterval: (query) =>
      query.state.data?.items.some((essay) => IN_PROGRESS.includes(essay.status)) ? 5000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useEssay(id: string | undefined) {
  return useQuery({
    queryKey: ['essay', id],
    queryFn: () => unwrap(api.GET('/v1/essays/{id}', { params: { path: { id: id! } } })),
    enabled: !!id,
  });
}

export function useCorrection(id: string | undefined) {
  return useQuery({
    queryKey: ['correction', id],
    queryFn: (): Promise<Correction> => unwrap(api.GET('/v1/essays/{id}/correction', { params: { path: { id: id! } } })),
    enabled: !!id,
  });
}

export function useProgress() {
  return useQuery({ queryKey: ['progress'], queryFn: () => request<Progress>('GET', '/v1/me/progress') });
}

export function usePayments() {
  return useQuery({ queryKey: ['payments'], queryFn: () => request<Payment[]>('GET', '/v1/payments') });
}

/**
 * A proposta pelo endereço. Sem versão, a publicada; com versão, a que uma redação antiga usou, mesmo que a
 * proposta já tenha outra no lugar.
 */
export function usePrompt(slug: string | undefined, version?: number) {
  return useQuery({
    queryKey: ['prompt', slug, version ?? null],
    queryFn: () =>
      unwrap(
        api.GET('/v1/prompts/{slug}', {
          params: { path: { slug: slug! }, query: version ? { version } : {} },
        }),
      ),
    enabled: !!slug,
    staleTime: FIVE_MINUTES,
  });
}
