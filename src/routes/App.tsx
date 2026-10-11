import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Nav } from '../components/Nav';
import { OfflineBanner } from '../components/OfflineBanner';
import { ClerkAuthProvider } from '../features/auth/ClerkAuthProvider';
import { SsoCallbackPage, VerifyEmailLinkPage } from '../features/auth/ClerkCallbacks';
import { CompleteSignupPage } from '../features/auth/CompleteSignupPage';
import { LoginPage } from '../features/auth/LoginPage';
import { HomePage } from '../features/home/HomePage';
import { ThemesPage } from '../features/temas/ThemesPage';
import { ApiError } from '../lib/api';

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Só vale repetir o que a API marcou como retentável.
        retry: (failures, error) => failures < 2 && error instanceof ApiError && error.retryable,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** Leva à seção da âncora (`/#nota`) e volta ao topo ao trocar de página. */
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

function NotFoundPage() {
  return (
    <>
      <Nav />
      <main className="container" style={{ paddingTop: 72, paddingBottom: 96, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
        <h1 className="serif h1">Não encontramos essa página.</h1>
        <Button to="/temas">Ver os temas</Button>
      </main>
    </>
  );
}

function AuthProvider({ children }: { children: ReactNode }) {
  // Sem a chave do Clerk, as telas públicas funcionam e o login fica indisponível.
  return clerkKey ? <ClerkAuthProvider publishableKey={clerkKey}>{children}</ClerkAuthProvider> : <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/temas" element={<ThemesPage />} />
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/entrar/concluir" element={<CompleteSignupPage />} />
      {clerkKey && <Route path="/entrar/sso" element={<SsoCallbackPage />} />}
      {clerkKey && <Route path="/entrar/verificar" element={<VerifyEmailLinkPage />} />}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OfflineBanner />
          <ScrollManager />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
