import type { ReactNode } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';
import { ApiError } from '../../lib/api';
import { useAccount } from '../../lib/queries';
import { NotFoundPage } from '../../routes/NotFoundPage';
import { useAuthState } from '../auth/AuthContext';
import styles from './Admin.module.css';
import { AdminPromptEditorPage } from './AdminPromptEditorPage';
import { AdminPromptsPage } from './AdminPromptsPage';

/** A moldura da administração: barra escura com o selo "Admin", o caminho de volta ao site e quem está logado. */
export function AdminShell({ email, children }: { email?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className={styles.admin}>
      <header className={styles.top}>
        <div className={styles.inner}>
          <span className={styles.brand}>
            <Link to="/">
              <LogoMark />
              RedigiAI
            </Link>
            <span className={styles.badge}>Admin</span>
          </span>
          <nav className={styles.topLinks} aria-label="Administração">
            <Link to="/admin/propostas" aria-current={pathname.startsWith('/admin/propostas') ? 'page' : undefined}>
              Propostas
            </Link>
            <Link to="/">Ver o site</Link>
          </nav>
          <span className={styles.email}>{email}</span>
        </div>
      </header>
      {children}
    </div>
  );
}

/**
 * Sessão de administrador sem a verificação em duas etapas: a API responde `ADMIN_2FA_REQUIRED` e a tela pede a
 * ativação. Qualquer outro erro segue para quem chamou.
 */
export function SecondFactorNotice({ error }: { error: unknown }) {
  if (!(error instanceof ApiError) || error.code !== 'ADMIN_2FA_REQUIRED') {
    return null;
  }
  return (
    <main className={`${styles.inner} ${styles.center}`}>
      <h1 className="serif h1">Ative a verificação em duas etapas</h1>
      <p className="muted" role="alert">
        {error.message} Ative-a na sua conta, saia e entre de novo para abrir a administração.
      </p>
      <Link to="/perfil">Ir para o meu perfil</Link>
    </main>
  );
}

/**
 * `/admin/*`: só existe para quem tem o papel de administrador, que vem do backend em `/v1/me`. Para os demais,
 * inclusive quem não está logado, é a página de "não encontrado": nada indica que a área existe.
 */
export default function AdminArea() {
  const auth = useAuthState();
  const account = useAccount(auth.isSignedIn);

  if (!auth.isLoaded || (auth.isSignedIn && account.isPending)) {
    return null;
  }
  if (!auth.isSignedIn || account.data?.role !== 'admin') {
    return <NotFoundPage />;
  }

  return (
    <Routes>
      <Route
        path="propostas"
        element={
          <AdminShell email={account.data.email}>
            <AdminPromptsPage />
          </AdminShell>
        }
      />
      <Route
        path="propostas/:id"
        element={
          <AdminShell email={account.data.email}>
            <AdminPromptEditorPage />
          </AdminShell>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
