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

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5080',
  // Resolvido a cada chamada, para os testes poderem trocar o fetch global.
  fetch: (request) => globalThis.fetch(request),
});

api.use({
  async onRequest({ request }) {
    const token = await tokenSource();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
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
  );
}
