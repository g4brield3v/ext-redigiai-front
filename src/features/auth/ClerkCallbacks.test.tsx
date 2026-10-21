import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const handleEmailLinkVerification = vi.fn();

vi.mock('@clerk/clerk-react', () => ({
  useClerk: () => ({ loaded: true, handleEmailLinkVerification }),
  AuthenticateWithRedirectCallback: () => null,
}));

const { VerifyEmailLinkPage } = await import('./ClerkCallbacks');

function renderPage() {
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <VerifyEmailLinkPage />
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe('Link de acesso por e-mail', () => {
  it('verifica o link uma vez só, mesmo com o efeito rodando duas vezes', async () => {
    handleEmailLinkVerification.mockReset().mockResolvedValue(undefined);
    renderPage();

    await vi.waitFor(() => expect(handleEmailLinkVerification).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('avisa quando o link venceu', async () => {
    handleEmailLinkVerification.mockReset().mockRejectedValue(new Error('expired'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Esse link expirou ou já foi usado.');
  });
});
