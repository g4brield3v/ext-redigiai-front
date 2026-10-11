import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { isClerkAPIResponseError } from '@clerk/clerk-react/errors';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPLETE_PATH, LoginFields } from './LoginPage';

/** Login real: Google ou link por e-mail pelo Clerk, com os nossos campos. */
export default function ClerkLoginForm({ next }: { next: string }) {
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

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

  async function sendLink(address: string) {
    if (!ready) {
      return;
    }

    const redirectUrl = `${window.location.origin}/entrar/verificar`;
    setError(null);
    setBusy(true);
    try {
      let sessionId: string | null | undefined;
      try {
        const attempt = await signIn.create({ identifier: address });
        const factor = attempt.supportedFirstFactors?.find((item) => item.strategy === 'email_link');
        if (!factor || !('emailAddressId' in factor)) {
          throw new Error('email_link is not enabled');
        }
        setSentTo(address);
        const result = await signIn.createEmailLinkFlow().startEmailLinkFlow({
          emailAddressId: factor.emailAddressId,
          redirectUrl,
        });
        sessionId = result.status === 'complete' ? result.createdSessionId : null;
      } catch (signInError) {
        // Conta nova: o mesmo link serve de cadastro.
        if (!isClerkAPIResponseError(signInError) || signInError.errors[0]?.code !== 'form_identifier_not_found') {
          throw signInError;
        }
        await signUp.create({ emailAddress: address });
        setSentTo(address);
        const result = await signUp.createEmailLinkFlow().startEmailLinkFlow({ redirectUrl });
        sessionId = result.status === 'complete' ? result.createdSessionId : null;
      }

      // O link foi aberto em outra aba: esta aba continua daqui.
      if (sessionId) {
        await setActive({ session: sessionId });
        navigate(COMPLETE_PATH, { replace: true });
      }
    } catch (caught) {
      setSentTo(null);
      setError(
        isClerkAPIResponseError(caught) && caught.errors[0]?.code === 'form_param_format_invalid'
          ? 'Informe um e-mail válido.'
          : 'Não foi possível enviar o link. Tente de novo.',
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
      sentTo={sentTo}
      onUseAnotherEmail={() => setSentTo(null)}
      onGoogle={() => void continueWithGoogle()}
      onEmail={(address) => void sendLink(address)}
    />
  );
}
