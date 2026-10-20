import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuthState } from '../features/auth/AuthContext';
import { CompleteSignupPage } from '../features/auth/CompleteSignupPage';
import { LoginPage } from '../features/auth/LoginPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { CorrectionPage } from '../features/correcao/CorrectionPage';
import { CameraPage } from '../features/envio/CameraPage';
import { SubmitPage } from '../features/envio/SubmitPage';
import { HomePage } from '../features/home/HomePage';
import { DashboardPage } from '../features/painel/DashboardPage';
import { ProfilePage } from '../features/perfil/ProfilePage';
import { ReviewPage } from '../features/revisao/ReviewPage';
import { ProposalPage } from '../features/proposta/ProposalPage';
import { PromptsPage } from '../features/propostas/PromptsPage';
import { TermsUpdate } from '../features/auth/TermsUpdate';
import { ApiError } from '../lib/api';
import { useAccount } from '../lib/queries';
import { NotFoundPage } from './NotFoundPage';

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Alunos de teste sem login: só no servidor de desenvolvimento, e só com VITE_DEV_AUTH=true.
const devAuth = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH === 'true';
const DevAuthProvider = devAuth ? lazy(() => import('../features/auth/DevAuthProvider')) : null;

// O SDK do Clerk só é carregado quando a chave está configurada.
const ClerkAuthProvider = lazy(() => import('../features/auth/ClerkAuthProvider'));
const SsoCallbackPage = lazy(() => import('../features/auth/ClerkCallbacks').then((m) => ({ default: m.SsoCallbackPage })));
const VerifyEmailLinkPage = lazy(() =>
  import('../features/auth/ClerkCallbacks').then((m) => ({ default: m.VerifyEmailLinkPage })),
);
// A correção de exemplo traz os próprios dados e só é carregada por quem abre /exemplo.
const ExampleCorrectionPage = lazy(() => import('../features/correcao/ExampleCorrectionPage'));
// A variante de nota zero do exemplo serve para revisar a tela: só existe em desenvolvimento.
const ExampleZeroCorrectionPage = import.meta.env.DEV
  ? lazy(() => import('../features/correcao/ExampleZeroCorrectionPage'))
  : null;
// A administração é um pedaço à parte: quem não é administrador nem baixa esse código.
const AdminArea = lazy(() => import('../features/admin/AdminArea'));
// Mostruário dos componentes: só existe em desenvolvimento.
const ComponentsPage = import.meta.env.DEV ? lazy(() => import('./ComponentsPage')) : null;

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
      // As âncoras do site são ASCII; o id vai direto, sem decodificar o que veio da URL.
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

function AuthProvider({ children }: { children: ReactNode }) {
  if (DevAuthProvider) {
    return (
      <Suspense fallback={null}>
        <DevAuthProvider>{children}</DevAuthProvider>
      </Suspense>
    );
  }

  // Sem a chave do Clerk, as telas públicas funcionam e o login fica indisponível.
  return clerkKey ? (
    <Suspense fallback={null}>
      <ClerkAuthProvider publishableKey={clerkKey}>{children}</ClerkAuthProvider>
    </Suspense>
  ) : (
    <>{children}</>
  );
}

/**
 * Rota logada: sem sessão, vai para o login e volta para cá depois. Com sessão mas sem cadastro na plataforma (o
 * cadastro ficou pela metade), vai concluir o cadastro. Com Termos novos ainda não aceitos, pede o aceite antes.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  const location = useLocation();
  const account = useAccount(auth.isLoaded && auth.isSignedIn);
  const here = encodeURIComponent(location.pathname + location.search);

  if (!auth.isLoaded) {
    return <Nav />;
  }
  if (!auth.isSignedIn) {
    return <Navigate to={`/entrar?next=${here}`} replace />;
  }
  if (account.isPending) {
    // Espera o perfil: cadastro e termos são conferidos antes de abrir a tela.
    return <Nav />;
  }
  if (account.error instanceof ApiError && account.error.code === 'PROFILE_NOT_FOUND') {
    return <Navigate to={`/entrar/concluir?next=${here}`} replace />;
  }
  if (account.data?.termsAcceptanceRequired) {
    return <TermsUpdate />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  const logged = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/propostas" element={<PromptsPage />} />
        <Route path="/propostas/:slug" element={<ProposalPage />} />
        <Route path="/propostas/:slug/enviar" element={<SubmitPage />} />
        {/* Endereço antigo da lista, que ainda pode estar em favoritos e e-mails. */}
        <Route path="/temas" element={<Navigate to="/propostas" replace />} />
        <Route path="/enviar/foto" element={<CameraPage />} />
        <Route path="/exemplo" element={<ExampleCorrectionPage />} />
        {ExampleZeroCorrectionPage && <Route path="/exemplo/nota-zero" element={<ExampleZeroCorrectionPage />} />}
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/entrar/concluir" element={<CompleteSignupPage />} />
        {clerkKey && !devAuth && <Route path="/entrar/sso" element={<SsoCallbackPage />} />}
        {clerkKey && !devAuth && <Route path="/entrar/verificar" element={<VerifyEmailLinkPage />} />}
        <Route path="/painel" element={logged(<DashboardPage />)} />
        <Route path="/redacoes/:id/revisao" element={logged(<ReviewPage />)} />
        <Route path="/redacoes/:id" element={logged(<CorrectionPage />)} />
        <Route path="/perfil" element={logged(<ProfilePage />)} />
        <Route path="/comprar" element={logged(<CheckoutPage />)} />
        <Route path="/admin/*" element={<AdminArea />} />
        {ComponentsPage && <Route path="/_componentes" element={<ComponentsPage />} />}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
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
