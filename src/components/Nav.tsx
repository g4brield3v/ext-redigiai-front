import { Link, useLocation } from 'react-router-dom';
import { useAuthState } from '../features/auth/AuthContext';
import { useAccount } from '../lib/queries';
import { Button } from './Button';
import { Logo } from './Logo';
import styles from './Nav.module.css';

const homeLinks = [
  { to: '/#como', label: 'Como funciona' },
  { to: '/#carta', label: 'A correção' },
  { to: '/#nota', label: 'Como é a nota' },
  { to: '/#precos', label: 'Preços' },
  { to: '/#duvidas', label: 'Dúvidas' },
];

type NavProps = {
  /** `home` é a variante da página inicial (fixa no topo, com as âncoras das seções). */
  variant?: 'home' | 'app';
  /** Link marcado como página atual quando a rota não é a do próprio link (ex.: correção → Minhas correções). */
  current?: 'temas' | 'painel';
};

export function Nav({ variant = 'app', current }: NavProps) {
  const auth = useAuthState();
  // O papel vem do backend: o link da administração só aparece para quem é administrador.
  const account = useAccount(auth.isSignedIn);
  const isHome = variant === 'home';
  const { pathname } = useLocation();
  // O link fica marcado na própria rota e nas telas que pertencem a ela (ex.: correção → Minhas correções).
  const active = {
    temas: current === 'temas' || (!current && pathname.startsWith('/propostas')),
    painel: current === 'painel' || (!current && pathname.startsWith('/painel')),
  };
  const mark = (name: 'temas' | 'painel') =>
    active[name] ? ({ className: styles.current, 'aria-current': 'page' } as const) : {};

  return (
    <header className={[styles.nav, isHome && styles.home].filter(Boolean).join(' ')}>
      <div className={`container ${styles.inner}`}>
        <Logo />

        <nav className={styles.links} aria-label="Principal">
          {isHome && !auth.isSignedIn ? (
            homeLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))
          ) : (
            <>
              <Link to="/propostas" {...mark('temas')}>
                Temas
              </Link>
              {auth.isSignedIn ? (
                <Link to="/painel" {...mark('painel')}>
                  Minhas correções
                </Link>
              ) : (
                <Link to="/#nota">Como a nota é calculada</Link>
              )}
            </>
          )}
        </nav>

        <div className={styles.actions}>
          {auth.isSignedIn ? (
            <>
              {account.data?.isAdmin && (
                <Link className={styles.signIn} to="/admin/propostas">
                  Admin
                </Link>
              )}
              <Link className={styles.avatar} to="/perfil" aria-label="Meu perfil">
                {auth.initial ?? '·'}
              </Link>
            </>
          ) : (
            <>
              <Link className={styles.signIn} to="/entrar">
                Entrar
              </Link>
              {isHome && (
                <Button to="/propostas" size="sm">
                  Corrigir redação
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
