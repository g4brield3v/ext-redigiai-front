import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { request, setDevUser } from '../../lib/api';
import { json, mockApi, renderApp } from '../../test/helpers';
import { useAuthState } from './AuthContext';
import DevAuthProvider from './DevAuthProvider';
import { readPendingSignup } from './signup';

function Probe() {
  const auth = useAuthState();
  return (
    <div>
      <span data-testid="state">{auth.isSignedIn ? `logado:${auth.initial}` : 'visitante'}</span>
      <button type="button" onClick={() => void request('GET', '/v1/me')}>
        chamar
      </button>
    </div>
  );
}

function renderProvider(route = '/temas') {
  return renderApp(
    <DevAuthProvider>
      <Probe />
    </DevAuthProvider>,
    { route, path: '/temas' },
  );
}

describe('Acesso de desenvolvimento', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => setDevUser(null));

  it('entra como a Ana por padrão e manda o aluno de teste em cada chamada', async () => {
    const requests = mockApi({ 'GET /v1/me': json({}) });
    renderProvider();

    expect(screen.getByTestId('state')).toHaveTextContent('logado:A');
    await userEvent.click(screen.getByRole('button', { name: 'chamar' }));

    expect(requests[0]!.headers.get('X-Dev-User')).toBe('ana');
    expect(requests[0]!.headers.has('Authorization')).toBe(false);
  });

  it('trocar de aluno passa pela tela de primeiro acesso e volta para onde estava', async () => {
    mockApi({});
    renderProvider('/temas?q=algoritmos');

    await userEvent.selectOptions(screen.getByLabelText('Aluno'), 'nova');

    expect(await screen.findByTestId('location')).toHaveTextContent('/entrar/concluir');
    expect(readPendingSignup().next).toBe('/temas?q=algoritmos');
    expect(localStorage.getItem('redigiai.dev-user')).toBe('nova');
  });

  it('visitante navega sem login e sem o cabeçalho', async () => {
    const requests = mockApi({ 'GET /v1/me': json({}) });
    renderProvider();

    await userEvent.selectOptions(screen.getByLabelText('Aluno'), '');
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('visitante'));
    await userEvent.click(screen.getByRole('button', { name: 'chamar' }));

    expect(requests.at(-1)!.headers.has('X-Dev-User')).toBe(false);
  });
});
