/**
 * Dados simulados (MSW) no lugar da API e sessão simulada no lugar do Clerk.
 * Só existe no servidor de desenvolvimento e no build de teste (`--mode e2e`): num build de produção
 * a variável é ignorada, e o próprio build falha se ela estiver ligada (vite.config.ts).
 */
export const mocksEnabled =
  import.meta.env.VITE_USE_MOCKS === 'true' && (import.meta.env.DEV || import.meta.env.MODE === 'e2e');

export const clerkKey = mocksEnabled ? undefined : (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined);
