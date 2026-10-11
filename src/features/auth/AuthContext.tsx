import { createContext, useContext } from 'react';

export type Auth = {
  /** `off`: ambiente sem a chave do Clerk (telas públicas funcionam, login não). `mock`: sessão simulada. */
  mode: 'clerk' | 'mock' | 'off';
  isLoaded: boolean;
  isSignedIn: boolean;
  /** Inicial mostrada no avatar da navegação. */
  initial: string | null;
  signOut: () => Promise<void>;
  /** Só na sessão simulada: entra como a aluna de exemplo. */
  mockSignIn?: () => void;
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
