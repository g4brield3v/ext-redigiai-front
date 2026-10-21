import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signIn = {
  create: vi.fn(),
  prepareFirstFactor: vi.fn(),
  attemptFirstFactor: vi.fn(),
  authenticateWithRedirect: vi.fn(),
};
const signUp = {
  create: vi.fn(),
  prepareEmailAddressVerification: vi.fn(),
  attemptEmailAddressVerification: vi.fn(),
};
const setActive = vi.fn();

vi.mock('@clerk/clerk-react', () => ({
  useSignIn: () => ({ isLoaded: true, signIn, setActive }),
  useSignUp: () => ({ isLoaded: true, signUp }),
}));

vi.mock('@clerk/clerk-react/errors', () => ({
  isClerkAPIResponseError: (error: unknown) => typeof error === 'object' && error !== null && 'errors' in error,
}));

const { default: ClerkLoginForm } = await import('./ClerkLoginForm');

function clerkError(code: string) {
  return { errors: [{ code }] };
}

function renderForm() {
  render(
    <MemoryRouter initialEntries={['/entrar']}>
      <Routes>
        <Route path="/entrar" element={<ClerkLoginForm next="/propostas" />} />
        <Route path="/entrar/concluir" element={<p>concluir</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function askCode(address = 'aluno@email.com') {
  await userEvent.type(screen.getByLabelText('Seu e-mail'), address);
  await userEvent.click(screen.getByRole('button', { name: 'Receber código de acesso' }));
  return screen.findByLabelText('Código de acesso');
}

describe('Login por código', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('conta existente: envia o código, confere e entra', async () => {
    signIn.create.mockResolvedValue({ supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'idn_1' }] });
    signIn.attemptFirstFactor.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_1' });
    renderForm();

    const field = await askCode();
    expect(signIn.prepareFirstFactor).toHaveBeenCalledWith({ strategy: 'email_code', emailAddressId: 'idn_1' });
    expect(screen.getByRole('status')).toHaveTextContent('Enviamos um código de acesso para aluno@email.com.');

    await userEvent.type(field, '12a3456');
    expect(field).toHaveValue('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('concluir')).toBeInTheDocument();
    expect(signIn.attemptFirstFactor).toHaveBeenCalledWith({ strategy: 'email_code', code: '123456' });
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_1' });
  });

  it('conta nova: o mesmo código faz o cadastro', async () => {
    signIn.create.mockRejectedValue(clerkError('form_identifier_not_found'));
    signUp.attemptEmailAddressVerification.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_2' });
    renderForm();

    const field = await askCode('nova@email.com');
    expect(signUp.create).toHaveBeenCalledWith({ emailAddress: 'nova@email.com' });
    expect(signUp.prepareEmailAddressVerification).toHaveBeenCalledWith({ strategy: 'email_code' });

    await userEvent.type(field, '654321');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('concluir')).toBeInTheDocument();
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_2' });
  });

  it('código errado: avisa e não entra', async () => {
    signIn.create.mockResolvedValue({ supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'idn_1' }] });
    signIn.attemptFirstFactor.mockRejectedValue(clerkError('form_code_incorrect'));
    renderForm();

    await userEvent.type(await askCode(), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Código incorreto. Confira e tente de novo.');
    expect(setActive).not.toHaveBeenCalled();
  });

  it('reenvia o código para o mesmo e-mail', async () => {
    signIn.create.mockResolvedValue({ supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'idn_1' }] });
    renderForm();

    await askCode();
    await userEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));

    await vi.waitFor(() => expect(signIn.prepareFirstFactor).toHaveBeenCalledTimes(2));
    expect(signIn.create).toHaveBeenLastCalledWith({ identifier: 'aluno@email.com' });
  });
});
