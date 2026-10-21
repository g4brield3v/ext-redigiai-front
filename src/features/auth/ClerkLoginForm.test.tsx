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

async function askCode(address = 'aluno@email.com', tab: 'Entrar' | 'Criar conta' = 'Entrar') {
  await userEvent.click(screen.getByRole('tab', { name: tab }));
  await userEvent.type(screen.getByLabelText('Seu e-mail'), address);
  await userEvent.click(screen.getByRole('button', { name: 'Receber código de acesso' }));
  return screen.findByLabelText('Código de acesso');
}

describe('Login por código', () => {
  beforeEach(() => {
    // reset, não clear: a resposta simulada de um teste não pode vazar para o seguinte.
    vi.resetAllMocks();
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

  it('entrar: só o e-mail, sem data de nascimento', async () => {
    renderForm();

    expect(screen.getByRole('tab', { name: 'Entrar' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Seu e-mail')).toBeInTheDocument();
    expect(screen.queryByLabelText('Data de nascimento')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Criar conta' }));
    expect(screen.getByLabelText('Data de nascimento')).toBeInTheDocument();
  });

  it('entrar com e-mail sem conta: indica Criar conta', async () => {
    signIn.create.mockRejectedValue(clerkError('form_identifier_not_found'));
    renderForm();

    await userEvent.type(screen.getByLabelText('Seu e-mail'), 'nova@email.com');
    await userEvent.click(screen.getByRole('button', { name: 'Receber código de acesso' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não encontramos uma conta com esse e-mail. Para se cadastrar, use Criar conta.',
    );
    expect(signUp.create).not.toHaveBeenCalled();
  });

  it('criar conta com e-mail já cadastrado: indica Entrar', async () => {
    signUp.create.mockRejectedValue(clerkError('form_identifier_exists'));
    renderForm();

    await userEvent.click(screen.getByRole('tab', { name: 'Criar conta' }));
    await userEvent.type(screen.getByLabelText('Seu e-mail'), 'aluno@email.com');
    await userEvent.click(screen.getByRole('button', { name: 'Receber código de acesso' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma conta com esse e-mail. Use Entrar.');
  });

  it('criar conta: o código faz o cadastro', async () => {
    signUp.attemptEmailAddressVerification.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_2' });
    renderForm();

    const field = await askCode('nova@email.com', 'Criar conta');
    expect(signIn.create).not.toHaveBeenCalled();
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
