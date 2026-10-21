import { AuthenticateWithRedirectCallback, useClerk } from '@clerk/clerk-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/primitives';
import { LoginShell } from './LoginPage';
import styles from './LoginPage.module.css';

const COMPLETE_PATH = '/entrar/concluir';

function Waiting() {
  return (
    <div className={styles.center} aria-busy="true" aria-label="Entrando">
      <Skeleton height={48} radius={12} />
      <Skeleton height={48} radius={999} />
    </div>
  );
}

/** Volta do Google: o Clerk conclui a entrada (ou o cadastro) e segue para o primeiro acesso. */
export function SsoCallbackPage() {
  return (
    <LoginShell closeTo="/propostas">
      <Waiting />
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl={COMPLETE_PATH}
        signUpForceRedirectUrl={COMPLETE_PATH}
      />
    </LoginShell>
  );
}

/** Destino do link enviado por e-mail. */
export function VerifyEmailLinkPage() {
  const { handleEmailLinkVerification, loaded } = useClerk();
  const [failed, setFailed] = useState(false);
  // O link vale uma vez: no StrictMode o efeito roda duas vezes, e a segunda verificação encontrava o link já usado.
  const started = useRef(false);

  useEffect(() => {
    if (!loaded || started.current) {
      return;
    }
    started.current = true;
    handleEmailLinkVerification({ redirectUrlComplete: COMPLETE_PATH, redirectUrl: COMPLETE_PATH }).catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.error('[email link]', error);
      }
      setFailed(true);
    });
  }, [loaded, handleEmailLinkVerification]);

  return (
    <LoginShell closeTo="/propostas">
      {failed ? (
        <div className={styles.center}>
          <p className={styles.error} role="alert">
            Esse link expirou ou já foi usado. Peça um novo link de acesso.
          </p>
          <Button to="/entrar" block>
            Receber link de acesso
          </Button>
        </div>
      ) : (
        <Waiting />
      )}
    </LoginShell>
  );
}
