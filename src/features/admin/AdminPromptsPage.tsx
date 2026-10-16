import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip, ErrorState, Skeleton } from '../../components/primitives';
import { ApiError, errorMessage } from '../../lib/api';
import type { Schemas } from '../../lib/api';
import { formatSentAt } from '../../lib/format';
import styles from './Admin.module.css';
import { SecondFactorNotice } from './AdminArea';
import { createPrompt, createVersion, useAdminPrompts } from './adminApi';
import type { PromptStatus } from './adminApi';

const SEARCH_DELAY_MS = 300;

type Item = Schemas['PromptListItemDto'];

const FILTERS: { status: PromptStatus | null; label: string; count: keyof Schemas['PromptCountsDto'] }[] = [
  { status: null, label: 'Todas', count: 'all' },
  { status: 'draft', label: 'Rascunhos', count: 'draft' },
  { status: 'published', label: 'Publicadas', count: 'published' },
  { status: 'archived', label: 'Arquivadas', count: 'archived' },
];

const STATUS: Record<PromptStatus, { label: string; tone: 'review' | 'ok' | 'queued' }> = {
  draft: { label: 'Rascunho', tone: 'review' },
  published: { label: 'Publicada', tone: 'ok' },
  archived: { label: 'Arquivada', tone: 'queued' },
};

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** "Fuvest · Dissertação em prosa · 5 textos", ou, na versão arquivada, qual versão entrou no lugar. */
function detailOf(item: Item, items: Item[]) {
  const replacement =
    item.status === 'archived' &&
    items.find((other) => other.slug === item.slug && other.status === 'published' && other.version > item.version);
  if (replacement) {
    return `${item.examName} · v${item.version} substituída pela v${replacement.version}`;
  }
  const texts = `${item.textCount} ${item.textCount === 1 ? 'texto' : 'textos'}`;
  return [item.examName, item.essayTypeName, texts].filter(Boolean).join(' · ');
}

/** Um documento de proposta lido de um arquivo: só precisa ser um objeto JSON; quem valida o conteúdo é a API. */
async function readDocument(file: File): Promise<Schemas['PromptDocument']> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'O arquivo não é um JSON válido.', false, 422);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ApiError('VALIDATION_ERROR', 'O arquivo não traz uma proposta no formato de importação.', false, 422);
  }
  return parsed as Schemas['PromptDocument'];
}

/** 11 · Admin: propostas de redação. */
export function AdminPromptsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<PromptStatus | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim(), SEARCH_DELAY_MS);
  const prompts = useAdminPrompts(status, debouncedSearch);

  const open = async (prompt: { id: string }) => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'prompts'] });
    navigate(`/admin/propostas/${prompt.id}`);
  };
  // Uma chave por tentativa: repetir o clique não cria dois rascunhos.
  const create = useMutation({
    mutationFn: ({ document, key }: { document: Schemas['PromptDocument']; key: string }) => createPrompt(document, key),
    onSuccess: open,
  });
  const importFile = useMutation({
    mutationFn: async (file: File) => createPrompt(await readDocument(file), crypto.randomUUID()),
    onSuccess: open,
  });
  const newVersion = useMutation({ mutationFn: createVersion, onSuccess: open });

  const failure = create.error ?? importFile.error ?? newVersion.error;
  const items = prompts.data?.items ?? [];

  if (prompts.error instanceof ApiError && prompts.error.code === 'ADMIN_2FA_REQUIRED') {
    return <SecondFactorNotice error={prompts.error} />;
  }

  return (
    <main className={`${styles.inner} ${styles.listPage}`}>
      <div className={styles.listHeader}>
        <div>
          <h1 className="serif">Propostas de redação</h1>
          <p className="muted">Rascunhos só aparecem para você. Publicar coloca a proposta na lista dos alunos.</p>
        </div>
        <div className={styles.actions}>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            aria-label="Arquivo JSON da proposta"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                importFile.mutate(file);
              }
            }}
          />
          <Button variant="ghost" disabled={importFile.isPending} onClick={() => fileInput.current?.click()}>
            Importar JSON
          </Button>
          <Button disabled={create.isPending} onClick={() => create.mutate({ document: {}, key: crypto.randomUUID() })}>
            Nova proposta
          </Button>
        </div>
      </div>

      {failure && (
        <div role="alert" className={styles.issues}>
          <span aria-hidden="true">⚠</span>
          <div>
            <strong>{errorMessage(failure)}</strong>
            {failure instanceof ApiError &&
              failure.details?.map((detail, index) => (
                <span key={index}>
                  {detail.path}: {detail.message}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className={styles.filters}>
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            className={styles.filter}
            aria-pressed={status === filter.status}
            onClick={() => setStatus(filter.status)}
          >
            {filter.label}
            {prompts.data ? ` · ${prompts.data.counts[filter.count]}` : ''}
          </button>
        ))}
        <div className={styles.search}>
          <input
            className={styles.input}
            type="search"
            placeholder="Buscar proposta"
            aria-label="Buscar proposta"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {prompts.error ? (
        <ErrorState message={errorMessage(prompts.error)} onRetry={() => void prompts.refetch()} />
      ) : (
        <div className={styles.card} aria-live="polite">
          <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Proposta</th>
                <th>Versão</th>
                <th>Status</th>
                <th>Atualizada</th>
                <th>
                  <span className="visually-hidden">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!prompts.data ? (
                [0, 1, 2].map((row) => (
                  <tr key={row}>
                    <td colSpan={5}>
                      <Skeleton height={36} />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <p className={`muted ${styles.empty}`}>
                      {debouncedSearch || status ? 'Nenhuma proposta com esse filtro.' : 'Ainda não há propostas. Comece por "Nova proposta".'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className={styles.rowTitle} to={`/admin/propostas/${item.id}`}>
                        {item.title || 'Sem título'}
                      </Link>
                      <div className={styles.hint}>{detailOf(item, items)}</div>
                    </td>
                    <td>
                      v{item.version}
                      {item.status === 'draft' ? ' · rascunho' : ''}
                    </td>
                    <td>
                      <Chip tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Chip>
                    </td>
                    <td className="muted">{formatSentAt(item.updatedAt)}</td>
                    <td className={styles.rowAction}>
                      {item.status === 'published' ? (
                        <button type="button" className={styles.linkButton} disabled={newVersion.isPending} onClick={() => newVersion.mutate(item.id)}>
                          Nova versão
                        </button>
                      ) : (
                        <Link className={styles.linkButton} to={`/admin/propostas/${item.id}`}>
                          {item.status === 'draft' ? 'Continuar' : 'Ver'}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </main>
  );
}
