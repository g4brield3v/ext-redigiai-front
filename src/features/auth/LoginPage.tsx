import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { Field, Modal, SheetThumb } from '../../components/primitives';
import { loadDraft } from '../envio/draft';
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
export function LoginShell({ closeTo, children }: { closeTo: string; children: ReactNode }) {
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
      <Modal title="Entre para enviar sua redação" width={448} closeButton onClose={() => navigate(closeTo)}>
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

/** Aviso de que a foto escolhida antes do login está guardada. */
function DraftNotice() {
  const draft = useQuery({ queryKey: ['draft'], queryFn: loadDraft, staleTime: 0 });
  if (!draft.data) {
    return null;
  }

  return (
    <div className={styles.draft}>
      <SheetThumb size="sm" />
      <span>
        <span className={styles.draftTitle}>{draft.data.title}</span>
        <span className="muted">A foto está guardada. O envio continua depois de entrar.</span>
      </span>
    </div>
  );
}

export type LoginFieldsProps = {
  next: string;
  ready: boolean;
  busy?: boolean;
  error?: string | null;
  /** E-mail para o qual o link foi enviado; troca o formulário pelo aviso. */
  sentTo?: string | null;
  onUseAnotherEmail?: () => void;
  onGoogle: () => void;
  onEmail: (email: string) => void;
};

/** Os campos do login. Quem entra de fato (Clerk ou sessão simulada) é decidido por quem usa. */
export function LoginFields({ next, ready, busy, error, sentTo, onUseAnotherEmail, onGoogle, onEmail }: LoginFieldsProps) {
  const [email, setEmail] = useState('');
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
      onEmail(email.trim());
    }
  }

  if (sentTo) {
    return (
      <div className={styles.sent} role="status">
        <strong>Enviamos o link de acesso para {sentTo}.</strong>
        <span className="muted">Abra o e-mail e toque no link para entrar. Sem senha. O link vale por 15 minutos.</span>
        <button type="button" className={styles.linkButton} onClick={onUseAnotherEmail}>
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <>
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
        <Button type="submit" block disabled={!ready || busy}>
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
    <LoginShell closeTo={next}>
      <DraftNotice />
      {auth.mode === 'clerk' ? (
        <Suspense fallback={null}>
          <ClerkLoginForm next={next} />
        </Suspense>
      ) : (
        <LoginFields
          next={next}
          ready={auth.mode === 'mock'}
          error={auth.mode === 'off' ? 'O login não está configurado neste ambiente.' : null}
          onGoogle={() => auth.mockSignIn?.()}
          onEmail={() => auth.mockSignIn?.()}
        />
      )}
      <TermsNotice />
    </LoginShell>
  );
}
