import { lazy, Suspense, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { Field, Modal } from '../../components/primitives';
import { useAuthState } from './AuthContext';
import styles from './LoginPage.module.css';
import { maskBirthDate, parseBirthDate, safeNext, savePendingSignup } from './signup';

export const COMPLETE_PATH = '/entrar/concluir';

// O SDK do Clerk só é carregado quando o login real está configurado.
const ClerkLoginForm = lazy(() => import('./ClerkLoginForm'));

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

/** O diálogo de login sobre a página, como na tela aprovada. */
export function LoginShell({
  closeTo,
  title = 'Entre para enviar sua redação',
  children,
}: {
  closeTo: string;
  title?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <>
      <div aria-hidden="true">
        <Nav current="temas" />
        <div className={`container ${styles.behind}`}>
          <div />
          <div />
        </div>
      </div>
      <Modal title={title} width={448} closeButton onClose={() => navigate(closeTo)}>
        {children}
      </Modal>
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

/** Entrar (conta existente) ou criar conta (conta nova, com a data de nascimento). */
export type LoginMode = 'signIn' | 'signUp';

export type LoginFieldsProps = {
  next: string;
  ready: boolean;
  busy?: boolean;
  error?: string | null;
  /** E-mail para o qual o código foi enviado; troca o formulário pelo campo do código. */
  sentTo?: string | null;
  onUseAnotherEmail?: () => void;
  onResend?: () => void;
  onCode?: (code: string) => void;
  onGoogle: () => void;
  onEmail: (email: string, mode: LoginMode) => void;
};

/** Os campos do login. Quem entra de fato (Clerk ou sessão simulada) é decidido por quem usa. */
export function LoginFields({
  next,
  ready,
  busy,
  error,
  sentTo,
  onUseAnotherEmail,
  onResend,
  onCode,
  onGoogle,
  onEmail,
}: LoginFieldsProps) {
  const [mode, setMode] = useState<LoginMode>('signIn');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [birth, setBirth] = useState('');
  const [birthError, setBirthError] = useState<string | null>(null);

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

  function submit(event: FormEvent) {
    event.preventDefault();
    if (ready && !busy && email.trim() && rememberBirthDate()) {
      onEmail(email.trim(), mode);
    }
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    if (ready && !busy && code.length === 6) {
      onCode?.(code);
    }
  }

  if (sentTo) {
    return (
      <form className={styles.form} onSubmit={submitCode} noValidate>
        <div className={styles.sent} role="status">
          <strong>Enviamos um código de acesso para {sentTo}.</strong>
          <span className="muted">Digite o código de 6 dígitos do e-mail. Sem senha. O código vale por 10 minutos.</span>
        </div>
        <Field
          label="Código de acesso"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
        />
        <Button type="submit" block disabled={!ready || busy || code.length !== 6}>
          Entrar
        </Button>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="button" className={styles.linkButton} disabled={busy} onClick={onResend}>
          Reenviar código
        </button>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => {
            setCode('');
            onUseAnotherEmail?.();
          }}
        >
          Usar outro e-mail
        </button>
      </form>
    );
  }

  function choose(next: LoginMode) {
    setMode(next);
    setBirth('');
    setBirthError(null);
  }

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Acesso">
        <button type="button" role="tab" aria-selected={mode === 'signIn'} onClick={() => choose('signIn')}>
          Entrar
        </button>
        <button type="button" role="tab" aria-selected={mode === 'signUp'} onClick={() => choose('signUp')}>
          Criar conta
        </button>
      </div>
      <Button variant="ghost" block disabled={!ready} onClick={() => rememberBirthDate() && onGoogle()}>
        <GoogleIcon />
        Continuar com Google
      </Button>
      <div className={`muted ${styles.separator}`}>
        <span />
        ou
        <span />
      </div>
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field
          label="Seu e-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {mode === 'signUp' && (
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
        )}
        <Button type="submit" block disabled={!ready || busy}>
          Receber código de acesso
        </Button>
        <p className={`muted ${styles.note}`}>Sem senha. O código vale por 10 minutos.</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </>
  );
}

/** Modo de desenvolvimento: entra direto como um dos alunos de teste. */
export function LoginPage() {
  const auth = useAuthState();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  if (auth.isSignedIn) {
    return <Navigate to={COMPLETE_PATH} replace />;
  }

  return (
    // Fechar o login volta à página inicial: o destino é área interna e pediria o login de novo.
    <LoginShell closeTo="/" title="Acesse sua conta">
      {auth.mode === 'clerk' ? (
        <Suspense fallback={null}>
          <ClerkLoginForm next={next} />
        </Suspense>
      ) : (
        <LoginFields
          next={next}
          ready={false}
          error="O login não está configurado neste ambiente."
          onGoogle={() => {}}
          onEmail={() => {}}
        />
      )}
      <TermsNotice />
    </LoginShell>
  );
}
