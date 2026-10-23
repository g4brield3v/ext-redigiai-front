import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setTokenSource } from '../../lib/api';
import { AuthContext, signedOut } from './AuthContext';
import type { Auth } from './AuthContext';

/** Onde o teste do Playwright deixa a sessão, antes de a página carregar (`page.addInitScript`). */
export const E2E_SESSION_KEY = '__redigiaiE2eSession';

type E2eSession = { initial: string };

declare global {
  interface Window {
    [E2E_SESSION_KEY]?: E2eSession;
  }
}

/**
 * Sessão dos testes de navegador: só existe no build de teste (`vite build --mode e2e`), que o build de produção
 * nunca inclui (o `vite.config.ts` recusa o build que contiver esta chave). O próprio teste injeta a sessão e
 * intercepta a API; sem a sessão injetada, o visitante fica deslogado, como no site.
 */
export default function E2eAuthProvider({ children }: { children: ReactNode }) {
  // Lida e aplicada já na primeira renderização: os filhos pedem o perfil antes de os efeitos deste componente rodarem.
  const [session] = useState(() => {
    const injected = window[E2E_SESSION_KEY];
    if (injected) {
      setTokenSource(async () => 'e2e-session');
    }
    return injected;
  });

  useEffect(() => () => setTokenSource(async () => null), []);

  const value = useMemo<Auth>(
    () =>
      session
        ? { mode: 'clerk', isLoaded: true, isSignedIn: true, initial: session.initial, signOut: async () => {} }
        : signedOut,
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
