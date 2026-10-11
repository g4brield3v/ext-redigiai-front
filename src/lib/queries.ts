import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrap } from './api';

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
