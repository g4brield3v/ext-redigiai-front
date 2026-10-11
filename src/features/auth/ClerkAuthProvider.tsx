import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { setTokenSource } from '../../lib/api';
import { AuthContext } from './AuthContext';
import type { Auth } from './AuthContext';

function Bridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    setTokenSource(() => getToken());
    return () => setTokenSource(async () => null);
  }, [getToken]);

  const name = user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? null;
  const value = useMemo<Auth>(
    () => ({
      enabled: true,
      isLoaded,
      isSignedIn: isSignedIn === true,
      initial: name ? name.charAt(0).toUpperCase() : null,
      signOut: () => signOut(),
    }),
    [isLoaded, isSignedIn, name, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Login pelo Clerk com o nosso visual: o SDK cuida da sessão, as telas são nossas. */
export function ClerkAuthProvider({ publishableKey, children }: { publishableKey: string; children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      afterSignOutUrl="/"
    >
      <Bridge>{children}</Bridge>
    </ClerkProvider>
  );
}
