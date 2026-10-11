import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Account, Correction, EssayDetail, EssayList, EssayStatus, Payment, Progress } from '../api/mock-types';
import { api, request, unwrap } from './api';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useExams() {
  return useQuery({
    queryKey: ['exams'],
    queryFn: () => unwrap(api.GET('/v1/exams')),
    staleTime: FIVE_MINUTES,
  });
}

export function useThemes(examSlug: string | undefined, search: string) {
  return useQuery({
    queryKey: ['themes', examSlug, search],
    queryFn: () =>
      unwrap(
        api.GET('/v1/exams/{slug}/themes', {
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

// Endpoints que ainda não estão no cliente gerado: tipos provisórios em api/mock-types.ts.

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
    queryFn: () => request<EssayList>('GET', '/v1/essays'),
    enabled,
    refetchInterval: (query) =>
      query.state.data?.items.some((essay) => IN_PROGRESS.includes(essay.status)) ? 5000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useEssay(id: string | undefined) {
  return useQuery({
    queryKey: ['essay', id],
    queryFn: () => request<EssayDetail>('GET', `/v1/essays/${id}`),
    enabled: !!id,
  });
}

export function useCorrection(id: string | undefined) {
  return useQuery({
    queryKey: ['correction', id],
    queryFn: () => request<Correction>('GET', `/v1/essays/${id}/correction`),
    enabled: !!id,
  });
}

export function useProgress() {
  return useQuery({ queryKey: ['progress'], queryFn: () => request<Progress>('GET', '/v1/me/progress') });
}

export function usePayments() {
  return useQuery({ queryKey: ['payments'], queryFn: () => request<Payment[]>('GET', '/v1/payments') });
}

export function useTheme(id: string | undefined) {
  return useQuery({
    queryKey: ['theme', id],
    queryFn: () => unwrap(api.GET('/v1/themes/{id}', { params: { path: { id: id! } } })),
    enabled: !!id,
    staleTime: FIVE_MINUTES,
  });
}
