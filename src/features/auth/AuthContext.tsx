import { createContext, useContext } from 'react';

export type Auth = {
  /** `off`: ambiente sem a chave do Clerk (só a página inicial funciona; o login fica indisponível). */
  mode: 'clerk' | 'off';
  isLoaded: boolean;
  isSignedIn: boolean;
  /** Inicial mostrada no avatar da navegação. */
  initial: string | null;
  signOut: () => Promise<void>;
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
