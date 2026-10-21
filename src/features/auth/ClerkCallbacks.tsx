import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
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
