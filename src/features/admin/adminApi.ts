import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, unwrap, upload } from '../../lib/api';
import type { Schemas } from '../../lib/api';

export type PromptStatus = Schemas['PromptStatus'];

/** Lista da administração: as versões e as contagens das abas. */
export function useAdminPrompts(status: PromptStatus | null, search: string) {
  return useQuery({
    queryKey: ['admin', 'prompts', status, search],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/prompts', {
          params: { query: { ...(status ? { status } : {}), ...(search ? { q: search } : {}) } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminPrompt(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'prompt', id],
    queryFn: () => unwrap(api.GET('/v1/admin/prompts/{id}', { params: { path: { id: id! } } })),
    enabled: !!id,
    // O editor é a fonte do que está na tela: nada de buscar de novo por trás e trocar o que foi digitado.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** As categorias de correção do vestibular, para a lista do cartão Instruções. Vêm do banco, não da tela. */
export function useEssayTypes(exam: string) {
  return useQuery({
    queryKey: ['admin', 'essay-types', exam],
    queryFn: () => unwrap(api.GET('/v1/admin/exams/{slug}/essay-types', { params: { path: { slug: exam } } })),
    enabled: !!exam,
    staleTime: 5 * 60_000,
  });
}

/** Cria um rascunho, vazio ou a partir do JSON importado. A chave evita rascunhos em dobro num clique repetido. */
export function createPrompt(document: Schemas['PromptDocument'], idempotencyKey: string) {
  return unwrap(api.POST('/v1/admin/prompts', { params: { header: { 'Idempotency-Key': idempotencyKey } }, body: document }));
}

export function savePrompt(id: string, document: Schemas['PromptDocument']) {
  return unwrap(api.PUT('/v1/admin/prompts/{id}', { params: { path: { id } }, body: document }));
}

export function validatePrompt(id: string) {
  return unwrap(api.POST('/v1/admin/prompts/{id}/validate', { params: { path: { id } } }));
}

export function publishPrompt(id: string) {
  return unwrap(api.POST('/v1/admin/prompts/{id}/publish', { params: { path: { id } } }));
}

export function createVersion(id: string) {
  return unwrap(api.POST('/v1/admin/prompts/{id}/new-version', { params: { path: { id } } }));
}

export function archivePrompt(id: string) {
  return unwrap(api.POST('/v1/admin/prompts/{id}/archive', { params: { path: { id } } }));
}

export function deletePrompt(id: string) {
  return unwrap(api.DELETE('/v1/admin/prompts/{id}', { params: { path: { id } } }));
}

/** Envia a imagem de um texto da coletânea (JPG, PNG ou WebP, até 5 MB). */
export function uploadImage(file: File) {
  const form = new FormData();
  form.append('file', file, file.name);
  return upload<Schemas['PromptImageDto']>('/v1/admin/assets', form);
}
