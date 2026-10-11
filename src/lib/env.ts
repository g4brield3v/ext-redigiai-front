/** Dados simulados (MSW) no lugar da API e sessão simulada no lugar do Clerk. Nunca ligado em produção. */
export const mocksEnabled = import.meta.env.VITE_USE_MOCKS === 'true';

export const clerkKey = mocksEnabled ? undefined : (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined);
