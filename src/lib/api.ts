import createClient from 'openapi-fetch';
import type { components, paths } from '../api/schema';

export type Schemas = components['schemas'];

/** Erro da API no formato {code, message, retryable, traceId}. A tela decide pelo `code` e mostra o `message`. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly status: number,
    readonly traceId?: string,
    /** Só em `VALIDATION_FAILED` (administração): cada pendência, com o campo a que se refere. */
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenSource = () => Promise<string | null>;

let tokenSource: TokenSource = async () => null;

/** O provedor de login registra aqui como obter o token da sessão atual. */
export function setTokenSource(source: TokenSource) {
  tokenSource = source;
}

/** Identifica quem chama: o token da sessão do Clerk. Não existe acesso sem login, nem em desenvolvimento. */
async function authorize(headers: Headers) {
  const token = await tokenSource();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
}

export const api = createClient<paths>({
  baseUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5080',
  // Resolvido a cada chamada, para os testes poderem trocar o fetch global.
  fetch: (request) => globalThis.fetch(request),
});

api.use({
  async onRequest({ request }) {
    await authorize(request.headers);
    return request;
  },
  onError() {
    return new ApiError('NETWORK_ERROR', 'Não foi possível conectar. Confira a sua internet e tente de novo.', true, 0);
  },
});

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

/** Devolve os dados ou lança ApiError. */
export async function unwrap<T>(call: Promise<ApiResult<T>>): Promise<T> {
  const { data, error, response } = await call;
  if (response.ok) {
    return data as T;
  }

  const body = error as Partial<Schemas['ErrorResponse']> | undefined;
  throw new ApiError(
    body?.code ?? 'INTERNAL_ERROR',
    body?.message ?? 'Algo deu errado do nosso lado. Tente novamente em instantes.',
    body?.retryable ?? false,
    response.status,
    body?.traceId,
    body?.details ?? undefined,
  );
}

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5080';

/**
 * Chamada direta para endpoints que ainda não estão no cliente gerado (tipos em `api/provisional-types.ts`).
 * Mesmo token e mesmo formato de erro do cliente gerado.
 */
export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: { body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const headers = new Headers();
  await authorize(headers);
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  let response: Response;
  try {
    response = await globalThis.fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Não foi possível conectar. Confira a sua internet e tente de novo.', true, 0);
  }

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (response.ok) {
    return data as T;
  }

  const error = data as Partial<Schemas['ErrorResponse']> | undefined;
  throw new ApiError(
    error?.code ?? 'INTERNAL_ERROR',
    error?.message ?? 'Algo deu errado do nosso lado. Tente novamente em instantes.',
    error?.retryable ?? false,
    response.status,
    error?.traceId,
    error?.details ?? undefined,
  );
}

/** Envia um arquivo (`multipart/form-data`) com o mesmo login e o mesmo formato de erro das outras chamadas. */
export async function upload<T>(path: string, form: FormData): Promise<T> {
  const headers = new Headers();
  await authorize(headers);

  let response: Response;
  try {
    response = await globalThis.fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: form });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Não foi possível conectar. Confira a sua internet e tente de novo.', true, 0);
  }

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (response.ok) {
    return data as T;
  }

  const error = data as Partial<Schemas['ErrorResponse']> | undefined;
  throw new ApiError(
    error?.code ?? 'INTERNAL_ERROR',
    error?.message ?? 'Algo deu errado do nosso lado. Tente novamente em instantes.',
    error?.retryable ?? false,
    response.status,
    error?.traceId,
    error?.details ?? undefined,
  );
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Algo deu errado do nosso lado. Tente novamente em instantes.';
}
