import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { clearDraft } from '../envio/draft';
import { useAuthState } from './AuthContext';
import { clearPendingSignup } from './signup';

const REVIEW_PREFIX = 'redigiai.review.';

/** Apaga o que o aluno deixou guardado neste navegador: rascunho do envio, palavras digitadas e cadastro pendente. */
async function clearLocalData() {
  await clearDraft();
  clearPendingSignup();
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(REVIEW_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Sem armazenamento: nada guardado.
  }
}

/**
 * Sai da conta sem deixar nada do aluno para a próxima pessoa que usar o navegador:
 * limpa os dados em memória (perfil, redações, correções) e o que ficou guardado localmente.
 */
export function useSignOut() {
  const auth = useAuthState();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await clearLocalData();
    await auth.signOut();
    queryClient.clear();
  }, [auth, queryClient]);
}
