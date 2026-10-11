import { Link, NavLink } from 'react-router-dom';
import { useAuthState } from '../features/auth/AuthContext';
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

/** Navegação. `home` é a variante da página inicial (fixa no topo, com as âncoras das seções). */
export function Nav({ variant = 'app' }: { variant?: 'home' | 'app' }) {
  const auth = useAuthState();
  const isHome = variant === 'home';

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
              <NavLink to="/temas" className={({ isActive }) => (isActive ? styles.current : undefined)}>
                Temas
              </NavLink>
              {!auth.isSignedIn && <Link to="/#nota">Como a nota é calculada</Link>}
            </>
          )}
        </nav>

        <div className={styles.actions}>
          {auth.isSignedIn ? (
            <>
              {/* Provisório: "Sair" passa para o Perfil quando a tela existir (etapa 5). */}
              <button type="button" className={styles.signOut} onClick={() => void auth.signOut()}>
                Sair
              </button>
              <span className={styles.avatar} aria-hidden="true">
                {auth.initial ?? '·'}
              </span>
            </>
          ) : (
            <>
              <Link className={styles.signIn} to="/entrar">
                Entrar
              </Link>
              {isHome && (
                <Button to="/temas" size="sm">
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
