import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Chip, ErrorState, Modal, Skeleton } from '../../components/primitives';
import { ApiError, errorMessage } from '../../lib/api';
import type { Schemas } from '../../lib/api';
import { useExams } from '../../lib/queries';
import styles from './Admin.module.css';
import { SecondFactorNotice } from './AdminArea';
import { AdminField, BlockCard } from './BlockCard';
import { PromptPreview } from './PromptPreview';
import { archivePrompt, createVersion, deletePrompt, publishPrompt, savePrompt, useAdminPrompt, validatePrompt } from './adminApi';
import {
  addBlock,
  dropBlock,
  duplicateBlock,
  fromApi,
  issueTarget,
  moveBlock,
  removeBlock,
  setPosition,
  toDocument,
  updateBlock,
  withSavedIds,
} from './editorState';
import type { BlockKind, EditorBlock, EditorPrompt } from './editorState';

/** Salva sozinho este tempo depois da última alteração. */
export const AUTOSAVE_DELAY_MS = 2000;

type Issue = Schemas['PromptIssueDto'];
type SaveState = 'saved' | 'dirty' | 'saving' | 'failed' | 'conflict';

const STATUS_LABEL = { draft: 'Rascunho', published: 'Publicada', archived: 'Arquivada' } as const;
const STATUS_TONE = { draft: 'review', published: 'ok', archived: 'queued' } as const;

/** O que não chegou ao servidor fica aqui até salvar: recarregar a página não perde o que foi digitado. */
const backupKey = (id: string) => `redigiai:admin:proposta:${id}`;

type Backup = { prompt: EditorPrompt; baseUpdatedAt: string };

function readBackup(id: string, updatedAt: string): EditorPrompt | null {
  try {
    const stored = JSON.parse(localStorage.getItem(backupKey(id)) ?? 'null') as Backup | null;
    // Só vale se foi escrito sobre a versão que está no servidor agora.
    return stored?.baseUpdatedAt === updatedAt ? stored.prompt : null;
  } catch {
    return null;
  }
}

function writeBackup(id: string, backup: Backup | null) {
  try {
    if (backup) {
      localStorage.setItem(backupKey(id), JSON.stringify(backup));
    } else {
      localStorage.removeItem(backupKey(id));
    }
  } catch {
    // Sem armazenamento local (modo privado): o que foi digitado vale enquanto a página estiver aberta.
  }
}

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Leva até o campo de uma pendência e põe o foco nele. */
function goTo(issue: Issue, blocks: EditorBlock[]) {
  const target = issueTarget(issue.path, blocks);
  const scope: ParentNode = (target.blockKey && document.getElementById(`bloco-${target.blockKey}`)) || document;
  const field =
    (target.field && scope.querySelector<HTMLElement>(`[data-field="${target.field}"]`)) ||
    (scope instanceof HTMLElement ? scope.querySelector<HTMLElement>('input, textarea, select, button') : null) ||
    document.getElementById('conteudo');
  // Nem todo ambiente tem a rolagem (os testes não têm); o foco basta para chegar ao campo.
  field?.scrollIntoView?.({ block: 'center' });
  field?.focus();
}

const ADDABLE: { kind: Exclude<BlockKind, 'instructions'>; label: string }[] = [
  { kind: 'collection_item', label: '+ Texto da coletânea' },
  { kind: 'command', label: '+ Comando' },
  { kind: 'heading', label: '+ Título de seção' },
  { kind: 'paragraph', label: '+ Parágrafo' },
  { kind: 'divider', label: '+ Separador' },
];

type EditorProps = { id: string; initial: Schemas['PromptAdminDto'] };

function Editor({ id, initial }: EditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exams = useExams();
  const readOnly = initial.status !== 'draft';

  // O que ficou sem salvar da última vez, se foi escrito sobre a versão que está no servidor.
  const [restored] = useState(() => (readOnly ? null : readBackup(id, initial.updatedAt)));
  const [prompt, setPrompt] = useState<EditorPrompt>(() => restored ?? fromApi(initial));
  const [issues, setIssues] = useState<Issue[]>(initial.issues);
  const [refused, setRefused] = useState<Issue[]>([]);
  const [state, setState] = useState<SaveState>(restored ? 'dirty' : 'saved');
  const [savedAt, setSavedAt] = useState(initial.updatedAt);
  const [failure, setFailure] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [confirm, setConfirm] = useState<'publish' | 'archive' | 'delete' | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);

  // O salvamento lê sempre o que está na tela agora, mesmo quando foi agendado antes da última tecla.
  const latest = useRef(prompt);
  useEffect(() => {
    latest.current = prompt;
  }, [prompt]);
  const updatedAt = useRef(initial.updatedAt);
  const saving = useRef(false);
  const pendingAgain = useRef(false);

  async function save(): Promise<boolean> {
    if (saving.current) {
      pendingAgain.current = true;
      return false;
    }
    saving.current = true;
    setState('saving');
    const sent = latest.current;
    try {
      const saved = await savePrompt(id, toDocument(sent, updatedAt.current));
      updatedAt.current = saved.updatedAt;
      setSavedAt(saved.updatedAt);
      setIssues(saved.issues);
      setRefused([]);
      setFailure(null);
      setValidated(false);
      // Os blocos novos ganham o id do servidor, sem trocar o que foi digitado enquanto o pedido estava no ar.
      setPrompt((current) => ({ ...current, blocks: withSavedIds(current.blocks, saved.blocks) }));
      const changedMeanwhile = latest.current !== sent;
      writeBackup(id, changedMeanwhile ? { prompt: latest.current, baseUpdatedAt: saved.updatedAt } : null);
      setState(changedMeanwhile ? 'dirty' : 'saved');
      return true;
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : null;
      // O que não foi salvo continua guardado no navegador.
      writeBackup(id, { prompt: latest.current, baseUpdatedAt: updatedAt.current });
      setRefused(error?.code === 'VALIDATION_FAILED' ? (error.details ?? []) : []);
      setFailure(errorMessage(caught));
      setState(error?.code === 'PROMPT_CHANGED' || error?.code === 'PROMPT_NOT_DRAFT' ? 'conflict' : 'failed');
      return false;
    } finally {
      saving.current = false;
      if (pendingAgain.current) {
        pendingAgain.current = false;
        void save();
      }
    }
  }

  // O temporizador chama sempre a versão atual do salvamento, sem recomeçar a contagem a cada desenho da tela.
  const saveNow = useRef(save);
  useEffect(() => {
    saveNow.current = save;
  });

  // Salvamento automático: 2 segundos depois da última alteração.
  useEffect(() => {
    if (state !== 'dirty') {
      return;
    }
    const timer = setTimeout(() => void saveNow.current(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, prompt]);

  const change = (changes: Partial<EditorPrompt>) => {
    if (readOnly || state === 'conflict') {
      return;
    }
    setPrompt((current) => ({ ...current, ...changes }));
    setState('dirty');
  };
  const changeBlocks = (update: (blocks: EditorBlock[]) => EditorBlock[]) => {
    if (readOnly || state === 'conflict') {
      return;
    }
    setPrompt((current) => ({ ...current, blocks: update(current.blocks) }));
    setState('dirty');
  };

  /** Antes de validar ou publicar, o que está na tela vai para o servidor. */
  const flush = async () => (state === 'saved' ? true : save());

  const validate = useMutation({
    mutationFn: async () => ((await flush()) ? validatePrompt(id) : null),
    onSuccess: (result) => {
      if (result) {
        setIssues(result.issues);
        setValidated(result.valid);
      }
    },
  });
  const leave = async () => {
    writeBackup(id, null);
    await queryClient.invalidateQueries({ queryKey: ['admin'] });
  };
  const publish = useMutation({
    mutationFn: async () => {
      if (!(await flush())) {
        throw new ApiError('INVALID_STATE', 'Não foi possível salvar a proposta. Confira as pendências e tente de novo.', false, 409);
      }
      return publishPrompt(id);
    },
    onSuccess: async () => {
      await leave();
      navigate('/admin/propostas');
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        setIssues(error.details ?? []);
      }
      setConfirm(null);
    },
  });
  const archive = useMutation({
    mutationFn: () => archivePrompt(id),
    onSuccess: async () => {
      await leave();
      navigate('/admin/propostas');
    },
    onError: () => setConfirm(null),
  });
  const remove = useMutation({
    mutationFn: () => deletePrompt(id),
    onSuccess: async () => {
      await leave();
      navigate('/admin/propostas');
    },
    onError: () => setConfirm(null),
  });
  const newVersion = useMutation({
    mutationFn: () => createVersion(id),
    onSuccess: async (draft) => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      navigate(`/admin/propostas/${draft.id}`);
    },
  });

  const actionError = publish.error ?? archive.error ?? remove.error ?? newVersion.error ?? validate.error;
  const shown = refused.length > 0 ? refused : issues;
  const issuesOf = (index: number) => shown.filter((issue) => issue.path.startsWith(`blocks[${index}]`)).map((issue) => issue.message);
  const noteIssue = (field: string) => shown.find((issue) => issue.path === `gradingNotes.${field}`)?.message;
  const examName = exams.data?.find((exam) => exam.slug === prompt.exam)?.name ?? 'Fuvest';
  const busy = publish.isPending || archive.isPending || remove.isPending;

  const saveLabel =
    state === 'saving'
      ? 'Salvando…'
      : state === 'dirty'
        ? 'Alterações não salvas'
        : state === 'failed'
          ? 'Não foi possível salvar. O que você digitou está guardado neste navegador.'
          : state === 'conflict'
            ? (failure ?? '')
            : `Salvo às ${time.format(new Date(savedAt))}`;

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.inner}>
          <div className={styles.barTitle}>
            <Link to="/admin/propostas">← Propostas</Link>
            <span>
              <strong>{prompt.title || 'Sem título'}</strong>
              <Chip tone={STATUS_TONE[initial.status]}>
                {STATUS_LABEL[initial.status]} · v{initial.version}
              </Chip>
              {!readOnly && (
                <span className={state === 'failed' || state === 'conflict' ? styles.errorText : styles.hint} role="status">
                  {saveLabel}
                </span>
              )}
            </span>
          </div>
          <div className={styles.actions}>
            {state === 'failed' && (
              <Button variant="ghost" onClick={() => void save()}>
                Tentar salvar de novo
              </Button>
            )}
            {state === 'conflict' && (
              <Button variant="ghost" onClick={() => window.location.reload()}>
                Recarregar
              </Button>
            )}
            <Button variant="ghost" onClick={() => download(`${prompt.slug || 'proposta'}.json`, JSON.stringify(toDocument(prompt), null, 2))}>
              Exportar JSON
            </Button>
            {readOnly ? (
              <>
                {initial.status === 'published' && (
                  <Button variant="ghost" disabled={busy} onClick={() => setConfirm('archive')}>
                    Arquivar
                  </Button>
                )}
                <Button disabled={newVersion.isPending} onClick={() => newVersion.mutate()}>
                  Criar nova versão
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" disabled={validate.isPending || state === 'conflict'} onClick={() => validate.mutate()}>
                  Validar
                </Button>
                <Button disabled={busy || state === 'conflict'} onClick={() => setConfirm('publish')}>
                  Publicar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className={`${styles.inner} ${styles.editor}`}>
        <div className={styles.form}>
          {actionError && (
            <div role="alert" className={styles.issues}>
              <span aria-hidden="true">⚠</span>
              <div>
                <strong>{errorMessage(actionError)}</strong>
              </div>
            </div>
          )}
          {readOnly ? (
            <div className={styles.ready}>
              Esta versão está {initial.status === 'published' ? 'publicada' : 'arquivada'} e abre só para leitura. Para alterar, crie uma nova versão.
            </div>
          ) : shown.length > 0 ? (
            <div role="alert" className={styles.issues}>
              <span aria-hidden="true">⚠</span>
              <div>
                <strong>
                  {refused.length > 0
                    ? 'Não foi possível salvar'
                    : `${shown.length} ${shown.length === 1 ? 'pendência' : 'pendências'} para publicar`}
                </strong>
                {shown.map((issue, index) => (
                  <button key={`${issue.path}-${index}`} type="button" onClick={() => goTo(issue, prompt.blocks)}>
                    {issue.message}
                  </button>
                ))}
              </div>
            </div>
          ) : validated ? (
            <div className={styles.ready} role="status">
              Nenhuma pendência: a proposta está pronta para publicar.
            </div>
          ) : null}

          <section className={styles.section} aria-labelledby="dados-gerais">
            <h2 id="dados-gerais">Título e dados gerais</h2>
            <div className={styles.columns2}>
              <AdminField label="Vestibular" name="exam">
                {(props) => (
                  <select {...props} className={styles.input} value={prompt.exam} disabled={readOnly} onChange={(event) => change({ exam: event.target.value })}>
                    {(exams.data ?? [{ slug: prompt.exam, name: examName, status: 'active' as const }])
                      .filter((exam) => exam.status === 'active' || exam.slug === prompt.exam)
                      .map((exam) => (
                        <option key={exam.slug} value={exam.slug}>
                          {exam.name}
                        </option>
                      ))}
                  </select>
                )}
              </AdminField>
              <AdminField label="Endereço (slug)" name="slug" hint={`redigiai.com.br/propostas/${prompt.slug}`}>
                {(props) => (
                  <input {...props} className={styles.input} value={prompt.slug} disabled={readOnly || initial.version > 1} onChange={(event) => change({ slug: event.target.value })} />
                )}
              </AdminField>
            </div>
            <AdminField label="Título da proposta (tema)" name="title" hint="Aparece no topo da página, na lista e no título da redação.">
              {(props) => (
                <input {...props} className={`${styles.input} ${styles.titleInput}`} value={prompt.title} disabled={readOnly} onChange={(event) => change({ title: event.target.value })} />
              )}
            </AdminField>
            <AdminField label="Resumo (opcional)" name="summary">
              {(props) => <input {...props} className={styles.input} value={prompt.summary} disabled={readOnly} onChange={(event) => change({ summary: event.target.value })} />}
            </AdminField>
          </section>

          <section className={styles.section} id="conteudo" aria-labelledby="conteudo-titulo" tabIndex={-1}>
            <div className={styles.sectionHeader}>
              <h2 id="conteudo-titulo">Conteúdo da página, de cima para baixo</h2>
              <span className={styles.hint}>Arraste pelo ⠿, use ↑ ↓ ou digite a posição</span>
            </div>
            {prompt.blocks.map((block, index) => (
              <BlockCard
                key={block.key}
                block={block}
                prompt={prompt}
                readOnly={readOnly}
                first={index === 0}
                last={index === prompt.blocks.length - 1}
                issues={issuesOf(index)}
                dragging={dragged === block.key}
                onChange={(changes) => changeBlocks((blocks) => updateBlock(blocks, block.key, changes))}
                onPromptChange={change}
                onMove={(direction) => changeBlocks((blocks) => moveBlock(blocks, block.key, direction))}
                onPosition={(position) => changeBlocks((blocks) => setPosition(blocks, block.key, position))}
                onDuplicate={() => changeBlocks((blocks) => duplicateBlock(blocks, block.key))}
                onRemove={() => changeBlocks((blocks) => removeBlock(blocks, block.key))}
                onDragStart={() => setDragged(block.key)}
                onDragEnd={() => setDragged(null)}
                onDropHere={() => {
                  if (dragged) {
                    changeBlocks((blocks) => dropBlock(blocks, dragged, block.key));
                  }
                  setDragged(null);
                }}
              />
            ))}
            {!readOnly && (
              <div className={styles.addRow}>
                <span className={styles.hint}>Adicionar bloco:</span>
                {ADDABLE.map((option) => (
                  <button key={option.kind} type="button" onClick={() => changeBlocks((blocks) => addBlock(blocks, option.kind))}>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={`${styles.section} ${styles.notes}`} aria-labelledby="abordagens">
            <h2 id="abordagens">
              Abordagens esperadas do tema <span className={styles.hint}>· só a IA vê</span>
            </h2>
            <p className={styles.hint}>
              O que a banca espera deste tema específico. O perfil de correção diz como corrigir qualquer redação; estas notas dizem o que é
              estar no tema nesta proposta.
            </p>
            <AdminField label="Recorte esperado" name="expectedFocus">
              {(props) => <textarea {...props} className={styles.textarea} value={prompt.expectedFocus} disabled={readOnly} onChange={(event) => change({ expectedFocus: event.target.value })} />}
            </AdminField>
            {noteIssue('expectedFocus') && <span className={styles.errorText}>⚠ Obrigatório para publicar.</span>}
            <AdminField label="Sinais de tangenciamento" name="tangentSignals">
              {(props) => (
                <textarea
                  {...props}
                  className={styles.textarea}
                  value={prompt.tangentSignals}
                  disabled={readOnly}
                  placeholder="O que caracteriza tratar do assunto sem o recorte pedido"
                  onChange={(event) => change({ tangentSignals: event.target.value })}
                />
              )}
            </AdminField>
            {noteIssue('tangentSignals') && <span className={styles.errorText}>⚠ Obrigatório para publicar.</span>}
            <AdminField label="Sinais de fuga ao tema (opcional)" name="offTopicSignals">
              {(props) => <textarea {...props} className={styles.textarea} value={prompt.offTopicSignals} disabled={readOnly} onChange={(event) => change({ offTopicSignals: event.target.value })} />}
            </AdminField>
            <AdminField label="Dados-chave da coletânea (um por linha)" name="keyData">
              {(props) => <textarea {...props} className={styles.textarea} value={prompt.keyData} disabled={readOnly} onChange={(event) => change({ keyData: event.target.value })} />}
            </AdminField>
          </section>

          {!readOnly && (
            <button type="button" className={styles.danger} disabled={busy} onClick={() => setConfirm('delete')}>
              Apagar este rascunho
            </button>
          )}
        </div>

        <PromptPreview prompt={prompt} examName={examName} />
      </main>

      {confirm === 'publish' && (
        <Modal title="Publicar esta proposta?" onClose={() => setConfirm(null)}>
          <p className={styles.modalText}>
            Ela entra na lista dos alunos agora{initial.version > 1 ? `, e a versão ${initial.version - 1} é arquivada` : ''}. Depois de publicada, a
            proposta não é mais editada: para mudar, você cria uma nova versão.
          </p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Voltar
            </Button>
            <Button disabled={publish.isPending} onClick={() => publish.mutate()}>
              Publicar agora
            </Button>
          </div>
        </Modal>
      )}
      {confirm === 'archive' && (
        <Modal title="Arquivar esta proposta?" onClose={() => setConfirm(null)}>
          <p className={styles.modalText}>Ela sai da lista dos alunos. Nada é apagado: as redações já feitas continuam mostrando esta versão.</p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Voltar
            </Button>
            <Button variant="danger" disabled={archive.isPending} onClick={() => archive.mutate()}>
              Arquivar
            </Button>
          </div>
        </Modal>
      )}
      {confirm === 'delete' && (
        <Modal title="Apagar este rascunho?" onClose={() => setConfirm(null)}>
          <p className={styles.modalText}>O rascunho e os blocos dele são apagados de vez. As versões já publicadas desta proposta não mudam.</p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Voltar
            </Button>
            <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
              Apagar rascunho
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** 11b · Admin: editar proposta. */
export function AdminPromptEditorPage() {
  const { id } = useParams();
  const prompt = useAdminPrompt(id);

  if (prompt.error instanceof ApiError && prompt.error.code === 'ADMIN_2FA_REQUIRED') {
    return <SecondFactorNotice error={prompt.error} />;
  }
  if (prompt.error) {
    return (
      <main className={`${styles.inner} ${styles.center}`}>
        <ErrorState
          message={errorMessage(prompt.error)}
          onRetry={prompt.error instanceof ApiError && prompt.error.status === 404 ? undefined : () => void prompt.refetch()}
        />
        <Link to="/admin/propostas">← Propostas</Link>
      </main>
    );
  }
  if (!prompt.data || !id) {
    return (
      <main className={`${styles.inner} ${styles.center}`} aria-busy="true" aria-label="Carregando a proposta">
        <Skeleton width={320} height={28} />
        <Skeleton width="100%" height={220} radius={16} />
      </main>
    );
  }

  // A chave refaz o editor quando a rota troca de proposta (por exemplo, ao criar uma nova versão).
  return <Editor key={`${prompt.data.id}-${prompt.data.updatedAt}`} id={id} initial={prompt.data} />;
}
