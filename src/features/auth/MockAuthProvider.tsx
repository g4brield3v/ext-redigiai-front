import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setTokenSource } from '../../lib/api';
import { AuthContext } from './AuthContext';
import type { Auth } from './AuthContext';

const STORAGE_KEY = 'redigiai.mock.session';

function readSession() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'ana';
  } catch {
    return false;
  }
}

let signedIn = readSession();

function writeSession(value: boolean) {
  signedIn = value;
  try {
    if (value) {
      sessionStorage.setItem(STORAGE_KEY, 'ana');
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Sem armazenamento: a sessão simulada dura até recarregar a página.
  }
}

/** Registra o token simulado antes de a aplicação renderizar. */
export function installMockSession() {
  setTokenSource(async () => (signedIn ? 'mock-token' : null));
}

/** Sessão simulada para construir e testar as telas sem o Clerk (VITE_USE_MOCKS=true). */
export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setSignedIn] = useState(signedIn);

  const value = useMemo<Auth>(
    () => ({
      mode: 'mock',
      isLoaded: true,
      isSignedIn,
      initial: isSignedIn ? 'A' : null,
      signOut: async () => {
        writeSession(false);
        setSignedIn(false);
      },
      mockSignIn: () => {
        writeSession(true);
        setSignedIn(true);
      },
    }),
    [isSignedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
