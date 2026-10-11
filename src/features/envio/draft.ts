// Rascunho do envio: tema, tipo e fotos escolhidos antes do login ficam guardados no navegador
// (IndexedDB, com a memória da página como reserva) e o envio continua depois de entrar.

export type DraftPhoto = { name: string; blob: Blob };

export type Draft = {
  themeId: string;
  essayTypeId: string;
  /** "Vestibular – Tipo – Tema", para mostrar na tela de login. */
  title: string;
  photos: DraftPhoto[];
  /** Redação que está sendo reescrita, se for o caso. */
  parentEssayId?: string;
};

type StoredDraft = Draft & { savedAt: number };

/** Um rascunho esquecido (login abandonado, computador compartilhado) não fica guardado além disso. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const DATABASE = 'redigiai';
const STORE = 'draft';
const KEY = 'current';

let memory: StoredDraft | null = null;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(database.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function saveDraft(draft: Draft) {
  const stored: StoredDraft = { ...draft, savedAt: Date.now() };
  memory = stored;
  try {
    await run('readwrite', (store) => store.put(stored, KEY));
  } catch {
    // Sem IndexedDB (modo privado): o rascunho vale enquanto a página não for recarregada.
  }
}

export async function loadDraft(): Promise<Draft | null> {
  let stored = memory;
  try {
    stored = ((await run('readonly', (store) => store.get(KEY))) as StoredDraft | undefined) ?? memory;
  } catch {
    // Sem IndexedDB: vale o que está na memória da página.
  }

  if (stored && Date.now() - (stored.savedAt ?? 0) > MAX_AGE_MS) {
    await clearDraft();
    return null;
  }
  return stored;
}

export async function clearDraft() {
  memory = null;
  try {
    await run('readwrite', (store) => store.delete(KEY));
  } catch {
    // Nada guardado.
  }
}
