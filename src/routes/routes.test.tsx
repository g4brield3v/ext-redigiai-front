import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext, signedOut } from '../features/auth/AuthContext';
import { mockApi } from '../test/helpers';
import { AppRoutes } from './App';

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderSignedOut(route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={signedOut}>
        <MemoryRouter initialEntries={[route]}>
          <AppRoutes />
          <Where />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

// Sem login, só a página inicial e o login: qualquer caminho para dentro pede o login na hora e guarda para onde voltar.
describe('Sem login', () => {
  it.each([
    '/propostas',
    '/propostas/algoritmos-e-o-debate-publico',
    '/propostas/algoritmos-e-o-debate-publico/enviar',
    '/enviar/foto',
    '/exemplo',
    '/painel',
    '/redacoes/0198f0c0-0000-7000-8000-000000000001',
    '/redacoes/0198f0c0-0000-7000-8000-000000000001/revisao',
    '/perfil',
    '/comprar',
  ])('%s leva ao login', async (route) => {
    const requests = mockApi({});
    renderSignedOut(route);

    expect(await screen.findByTestId('where')).toHaveTextContent(`/entrar?next=${encodeURIComponent(route)}`);
    // Nada da área interna é pedido à API.
    expect(requests).toHaveLength(0);
  });

  it('a página inicial abre', async () => {
    mockApi({});
    renderSignedOut('/');

    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });
});
