import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setDevUser } from '../../lib/api';
import { AuthContext } from './AuthContext';
import type { Auth, DevUserOption } from './AuthContext';
import styles from './DevAuthProvider.module.css';
import { savePendingSignup } from './signup';

// Os mesmos usuários que a API cadastra ao subir com DevAuth__Enabled=true.
const USERS: (DevUserOption & { initial: string })[] = [
  { key: 'ana', label: 'Ana Souza · adulta, com correções', initial: 'A' },
  { key: 'bruno', label: 'Bruno Lima · 16 anos', initial: 'B' },
  { key: 'nova', label: 'Conta nova · ainda sem cadastro', initial: 'C' },
  // Vem com a flag de administrador ligada pela API de desenvolvimento: abre a área /admin.
  { key: 'admin', label: 'Administração · cadastra as propostas', initial: 'G' },
];

const STORAGE_KEY = 'redigiai.dev-user';
const VISITOR = '';
const COMPLETE_PATH = '/entrar/concluir';

function readStored(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === VISITOR) {
      return null;
    }
    return USERS.some((user) => user.key === stored) ? stored : USERS[0]!.key;
  } catch {
    return USERS[0]!.key;
  }
}

function store(key: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, key ?? VISITOR);
  } catch {
    // Sem armazenamento: a escolha vale só até recarregar a página.
  }
}

/**
 * Acesso sem login, só no servidor de desenvolvimento (`VITE_DEV_AUTH=true`): no lugar do Clerk, cada chamada
 * leva o cabeçalho `X-Dev-User` com o aluno de teste escolhido na barra do topo.
 */
export default function DevAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [current, setCurrent] = useState(() => {
    const stored = readStored();
    // Já na primeira renderização, antes de qualquer chamada das telas.
    setDevUser(stored);
    return stored;
  });

  const change = useCallback(
    (key: string | null) => {
      setDevUser(key);
      store(key);
      setCurrent(key);
      // Nada do aluno anterior continua na tela.
      void queryClient.resetQueries();
    },
    [queryClient],
  );

  const value = useMemo<Auth>(
    () => ({
      mode: 'dev',
      isLoaded: true,
      isSignedIn: current !== null,
      initial: USERS.find((user) => user.key === current)?.initial ?? null,
      signOut: async () => change(null),
      devUsers: USERS,
      signInAs: change,
    }),
    [current, change],
  );

  function pick(key: string) {
    if (key === VISITOR) {
      change(null);
      return;
    }
    change(key);
    // Passa pela mesma tela de depois do login: a conta nova faz ali o primeiro acesso.
    if (!location.pathname.startsWith('/entrar')) {
      savePendingSignup({ next: location.pathname + location.search });
      navigate(COMPLETE_PATH);
    }
  }

  return (
    <AuthContext.Provider value={value}>
      <div className={styles.bar}>
        <span className={styles.badge}>Ambiente de teste</span>
        <label className={styles.picker}>
          <span>Aluno</span>
          <select value={current ?? VISITOR} onChange={(event) => pick(event.target.value)}>
            {USERS.map((user) => (
              <option key={user.key} value={user.key}>
                {user.label}
              </option>
            ))}
            <option value={VISITOR}>Visitante · sem login</option>
          </select>
        </label>
      </div>
      {children}
    </AuthContext.Provider>
  );
}
