import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** O que o aluno escreveu em cada apontamento e quais respostas já abriu. Nada disso vai para a API. */
type Saved = { attempts: Record<string, string>; revealed: number[] };

const empty: Saved = { attempts: {}, revealed: [] };

const storageKey = (correctionId: string) => `redigiai.tentativas.${correctionId}`;

/** As tentativas ficam no navegador, por correção. Sem armazenamento, a tela funciona igual. */
function readSaved(correctionId: string): Saved {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(storageKey(correctionId)) ?? 'null');
    if (typeof saved !== 'object' || saved === null) {
      return empty;
    }
    const { attempts, revealed } = saved as Partial<Record<keyof Saved, unknown>>;
    return {
      attempts:
        typeof attempts === 'object' && attempts !== null
          ? Object.fromEntries(Object.entries(attempts).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
          : {},
      revealed: Array.isArray(revealed) ? revealed.filter((item): item is number => typeof item === 'number') : [],
    };
  } catch {
    return empty;
  }
}

function save(correctionId: string, saved: Saved) {
  try {
    window.localStorage.setItem(storageKey(correctionId), JSON.stringify(saved));
  } catch {
    // Navegação privada ou armazenamento cheio: as tentativas só não ficam guardadas.
  }
}

type Learning = {
  attempt: (id: number) => string;
  setAttempt: (id: number, text: string) => void;
  revealed: (id: number) => boolean;
  reveal: (id: number) => void;
};

const LearningContext = createContext<Learning | null>(null);

/** Guarda as tentativas e as respostas abertas da correção, para o painel e a folha do celular. */
export function LearningProvider({ correctionId, children }: { correctionId: string; children: ReactNode }) {
  const [saved, setSaved] = useState(() => readSaved(correctionId));

  const update = useCallback(
    (change: (current: Saved) => Saved) =>
      setSaved((current) => {
        const next = change(current);
        save(correctionId, next);
        return next;
      }),
    [correctionId],
  );

  const value = useMemo<Learning>(
    () => ({
      attempt: (id) => saved.attempts[id] ?? '',
      setAttempt: (id, text) => update((current) => ({ ...current, attempts: { ...current.attempts, [id]: text } })),
      revealed: (id) => saved.revealed.includes(id),
      reveal: (id) =>
        update((current) => (current.revealed.includes(id) ? current : { ...current, revealed: [...current.revealed, id] })),
    }),
    [saved, update],
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const learning = useContext(LearningContext);
  if (!learning) {
    throw new Error('useLearning precisa de um LearningProvider.');
  }
  return learning;
}
