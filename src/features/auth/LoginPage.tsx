import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { isClerkAPIResponseError } from '@clerk/clerk-react/errors';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { Field } from '../../components/primitives';
import { useAuthState } from './AuthContext';
import styles from './LoginPage.module.css';
import { maskBirthDate, parseBirthDate, safeNext, savePendingSignup } from './signup';

const COMPLETE_PATH = '/entrar/concluir';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" />
      <path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" fill="#FBBC05" />
      <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z" fill="#EA4335" />
    </svg>
  );
}

export function LoginShell({ title, closeTo, children }: { title: string; closeTo: string; children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={`serif ${styles.title}`}>{title}</h1>
            <Link to={closeTo} className={styles.close} aria-label="Fechar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Link>
          </div>
          {children}
        </div>
      </main>
    </>
  );
}

export function TermsNotice() {
  return (
    <p className={`muted ${styles.terms}`}>
      Ao continuar, você aceita os <Link to="/termos">Termos de uso</Link> e a{' '}
      <Link to="/privacidade">Política de privacidade</Link>, inclusive o envio do texto a um serviço de IA para
      correção.
    </p>
  );
}

function LoginForm({ next }: { next: string }) {
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [birth, setBirth] = useState('');
  const [birthError, setBirthError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const ready = signInLoaded && signUpLoaded;

  /** Valida o formato e guarda a data para o primeiro acesso; a idade é conferida pelo backend. */
  function rememberBirthDate() {
    const birthDate = birth ? parseBirthDate(birth) : undefined;
    if (birthDate === null) {
      setBirthError('Informe a data no formato dd/mm/aaaa.');
      return false;
    }
    setBirthError(null);
    savePendingSignup({ birthDate, next });
    return true;
  }

  async function continueWithGoogle() {
    if (!ready || !rememberBirthDate()) {
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

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    if (!ready || busy || !rememberBirthDate()) {
      return;
    }

    const address = email.trim();
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

  if (sentTo) {
    return (
      <div className={styles.sent} role="status">
        <strong>Enviamos o link de acesso para {sentTo}.</strong>
        <span className="muted">Abra o e-mail e toque no link para entrar. Sem senha. O link vale por 15 minutos.</span>
        <button type="button" className={styles.linkButton} onClick={() => setSentTo(null)}>
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <>
      <Button variant="ghost" block disabled={!ready} onClick={() => void continueWithGoogle()}>
        <GoogleIcon />
        Continuar com Google
      </Button>
      <div className={`muted ${styles.separator}`}>
        <span />
        ou
        <span />
      </div>
      <form className={styles.form} onSubmit={(event) => void sendLink(event)} noValidate>
        <Field
          label="Seu e-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          label="Data de nascimento"
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="dd/mm/aaaa"
          value={birth}
          onChange={(event) => setBirth(maskBirthDate(event.target.value))}
          hint="A plataforma é para quem tem 16 anos ou mais."
          error={birthError}
        />
        <Button type="submit" block disabled={!ready || busy || !email.trim()}>
          Receber link de acesso
        </Button>
        <p className={`muted ${styles.note}`}>Sem senha. O link vale por 15 minutos.</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </>
  );
}

export function LoginPage() {
  const auth = useAuthState();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  if (auth.isSignedIn) {
    return <Navigate to={COMPLETE_PATH} replace />;
  }

  return (
    <LoginShell title="Entre para enviar sua redação" closeTo={next}>
      {auth.enabled ? (
        <LoginForm next={next} />
      ) : (
        <p className={styles.error} role="alert">
          O login não está configurado neste ambiente.
        </p>
      )}
      <TermsNotice />
    </LoginShell>
  );
}
