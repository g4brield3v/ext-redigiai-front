import { createContext, useContext } from 'react';

export type DevUserOption = { key: string; label: string };

export type Auth = {
  /**
   * `off`: ambiente sem a chave do Clerk (telas públicas funcionam, login não).
   * `dev`: alunos de teste sem login, só no servidor de desenvolvimento.
   */
  mode: 'clerk' | 'dev' | 'off';
  isLoaded: boolean;
  isSignedIn: boolean;
  /** Inicial mostrada no avatar da navegação. */
  initial: string | null;
  signOut: () => Promise<void>;
  /** Só no modo `dev`: os alunos de teste e como entrar com um deles. */
  devUsers?: DevUserOption[];
  signInAs?: (key: string) => void;
};

export const signedOut: Auth = {
  mode: 'off',
  isLoaded: true,
  isSignedIn: false,
  initial: null,
  signOut: async () => {},
};

export const AuthContext = createContext<Auth>(signedOut);

export function useAuthState() {
  return useContext(AuthContext);
}
