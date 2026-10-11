import { createContext, useContext } from 'react';

export type Auth = {
  /** Falso quando o ambiente não tem a chave pública do Clerk: as telas públicas funcionam, o login não. */
  enabled: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  /** Inicial mostrada no avatar da navegação. */
  initial: string | null;
  signOut: () => Promise<void>;
};

export const signedOut: Auth = {
  enabled: false,
  isLoaded: true,
  isSignedIn: false,
  initial: null,
  signOut: async () => {},
};

export const AuthContext = createContext<Auth>(signedOut);

export function useAuthState() {
  return useContext(AuthContext);
}
