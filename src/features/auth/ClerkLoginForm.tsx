import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { isClerkAPIResponseError } from '@clerk/clerk-react/errors';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPLETE_PATH, LoginFields } from './LoginPage';

/** Para quem o código foi enviado e por qual fluxo: conta existente (entrada) ou conta nova (cadastro). */
type Pending = { address: string; flow: 'signIn' | 'signUp' };

function clerkCode(error: unknown) {
  return isClerkAPIResponseError(error) ? error.errors[0]?.code : undefined;
}

/** Login real: Google ou código por e-mail pelo Clerk, com os nossos campos. */
export default function ClerkLoginForm({ next }: { next: string }) {
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const ready = signInLoaded && signUpLoaded;

  async function continueWithGoogle() {
    if (!ready) {
      return;
    }
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/entrar/sso',
        redirectUrlComplete: COMPLETE_PATH,
      });
    } catch {
      setError('Não foi possível continuar com o Google. Tente de novo.');
    }
  }

  async function sendCode(address: string) {
    if (!ready) {
      return;
    }

    setError(null);
    setBusy(true);
    try {
      try {
        const attempt = await signIn.create({ identifier: address });
        const factor = attempt.supportedFirstFactors?.find((item) => item.strategy === 'email_code');
        if (!factor || !('emailAddressId' in factor)) {
          throw new Error('email_code is not enabled');
        }
        await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
        setPending({ address, flow: 'signIn' });
      } catch (signInError) {
        // Conta nova: o mesmo código serve de cadastro.
        if (clerkCode(signInError) !== 'form_identifier_not_found') {
          throw signInError;
        }
        await signUp.create({ emailAddress: address });
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPending({ address, flow: 'signUp' });
      }
    } catch (caught) {
      if (import.meta.env.DEV) {
        console.error('[email code]', caught);
      }
      setError(
        clerkCode(caught) === 'form_param_format_invalid'
          ? 'Informe um e-mail válido.'
          : 'Não foi possível enviar o código. Tente de novo.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function checkCode(code: string) {
    if (!ready || !pending) {
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const result =
        pending.flow === 'signIn'
          ? await signIn.attemptFirstFactor({ strategy: 'email_code', code })
          : await signUp.attemptEmailAddressVerification({ code });
      if (result.status !== 'complete' || !result.createdSessionId) {
        throw new Error(`Clerk ${pending.flow} is ${result.status}`);
      }
      await setActive({ session: result.createdSessionId });
      navigate(COMPLETE_PATH, { replace: true });
    } catch (caught) {
      if (import.meta.env.DEV) {
        console.error('[email code]', caught);
      }
      const reason = clerkCode(caught);
      setError(
        reason === 'form_code_incorrect'
          ? 'Código incorreto. Confira e tente de novo.'
          : reason === 'verification_expired' || reason === 'verification_failed'
            ? 'Esse código venceu. Peça um novo.'
            : 'Não foi possível entrar. Tente de novo.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <LoginFields
      next={next}
      ready={ready}
      busy={busy}
      error={error}
      sentTo={pending?.address ?? null}
      onUseAnotherEmail={() => {
        setPending(null);
        setError(null);
      }}
      onResend={() => pending && void sendCode(pending.address)}
      onCode={(code) => void checkCode(code)}
      onGoogle={() => void continueWithGoogle()}
      onEmail={(address) => void sendCode(address)}
    />
  );
}
