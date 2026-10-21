import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../features/auth/AuthContext';
import type { Auth } from '../features/auth/AuthContext';
import { apiError, mockApi } from '../test/helpers';
import { Nav } from '../components/Nav';
import { AppRoutes, RequireAuth } from './App';

// Nenhuma situação do login pode virar um laço de chamadas a /v1/me (o 429 de 20/10/2026, com o token recusado).
const signedIn: Auth = { mode: 'clerk', isLoaded: true, isSignedIn: true, initial: 'G', signOut: vi.fn(async () => {}) };

async function count(route: string, me: Response) {
  const requests = mockApi({ 'GET /v1/me': me });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={signedIn}>
        <MemoryRouter initialEntries={[route]}>
          {route === '/so-guard' ? <RequireAuth><p>x</p></RequireAuth> : route === '/so-nav' ? <Nav /> : <AppRoutes />}
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  await new Promise((r) => setTimeout(r, 1500));
  return requests.filter((r) => r.url.pathname === '/v1/me').length;
}

describe('Perfil com erro', () => {
  it.each([
    ['/propostas', 'PROFILE_NOT_FOUND', 404],
    ['/entrar/concluir', 'PROFILE_NOT_FOUND', 404],
    ['/propostas', 'UNAUTHENTICATED', 401],
    ['/so-guard', 'UNAUTHENTICATED', 401],
    ['/so-nav', 'UNAUTHENTICATED', 401],
    ['/entrar/concluir', 'UNAUTHENTICATED', 401],
  ])('%s com %s não repete a chamada sem parar', async (route, code, status) => {
    const calls = await count(route, apiError(code, 'x', status));
    expect(calls).toBeLessThan(5);
  });
});
