import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { AlertIcon, CheckIcon, ErrorState, SheetThumb, Skeleton } from '../../components/primitives';
import { ApiError, errorMessage } from '../../lib/api';
import { formatSize } from '../../lib/format';
import { usePrompt } from '../../lib/queries';
import { useAuthState } from '../auth/AuthContext';
import { ConfirmSendModal } from './ConfirmSendModal';
import type { PendingEssay } from './ConfirmSendModal';
import { loadDraft, saveDraft } from './draft';
import type { DraftPhoto } from './draft';
import { preparePhoto, uploadPhoto } from './photo';
import styles from './SubmitPage.module.css';

function PageSkeleton() {
  return (
    <div className={styles.columns} aria-busy="true" aria-label="Carregando o envio">
      <div className={styles.card}>
        <Skeleton width={160} height={20} />
        <Skeleton height={70} radius={14} />
        <Skeleton height={70} radius={14} />
        <Skeleton height={130} radius={14} />
      </div>
      <div className={`${styles.card} ${styles.aside}`}>
        <Skeleton height={44} />
        <Skeleton height={48} radius={999} />
      </div>
    </div>
  );
}

/**
 * 3 · Envio da foto. O tipo de redação é o da proposta, só para leitura: o aluno não escolhe tipo. A coletânea
 * fica na página da proposta.
 */
export function SubmitPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuthState();
  // A reescrita responde à versão da proposta da redação original, que pode não ser mais a publicada.
  const version = Number(params.get('versao')) || undefined;
  const prompt = usePrompt(slug, version);
  const fileInput = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingEssay[] | null>(null);
  const [draftParentId, setDraftParentId] = useState<string>();
  const parentEssayId = params.get('reescrita') ?? draftParentId;
  const continuing = params.get('continuar') === '1';

  // O título vem pronto da API: "Vestibular – Tipo – Tema".
  const title = prompt.data?.essayTitle ?? null;
  const promptId = prompt.data?.id;

  // Retoma o que foi escolhido antes do login ou da câmera.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !slug) {
      return;
    }
    restored.current = true;
    void loadDraft().then((draft) => {
      if (draft?.promptSlug === slug) {
        setPhotos(draft.photos);
        setDraftParentId(draft.parentEssayId);
      }
    });
  }, [slug]);

  const upload = useMutation({
    mutationFn: async (): Promise<PendingEssay[]> => {
      const assetIds = await Promise.all(photos.map(uploadPhoto));
      return photos.map((photo, index) => ({
        title: title!,
        fileName: photo.name,
        promptId: promptId!,
        assetId: assetIds[index]!,
      }));
    },
    onSuccess: setPending,
  });
  const { mutate: startUpload, isPending: uploading } = upload;
  const submit = `/propostas/${encodeURIComponent(slug ?? '')}/enviar`;

  // De volta do login com o rascunho carregado: segue direto para a confirmação.
  const ready = !!title && photos.length > 0;
  useEffect(() => {
    if (continuing && auth.isSignedIn && ready && !uploading && !pending) {
      setParams((current) => {
        current.delete('continuar');
        return current;
      }, { replace: true });
      startUpload();
    }
  }, [continuing, auth.isSignedIn, ready, uploading, pending, setParams, startUpload]);

  async function addFiles(files: FileList | File[] | null) {
    if (!files?.length) {
      return;
    }
    setPhotoError(null);
    try {
      const prepared = await Promise.all(Array.from(files).map(preparePhoto));
      setPhotos((current) => [...current, ...prepared]);
    } catch (caught) {
      setPhotoError(errorMessage(caught));
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    void addFiles(event.dataTransfer.files);
  }

  async function send() {
    if (!ready || !slug) {
      return;
    }
    if (!auth.isSignedIn) {
      await saveDraft({ promptSlug: slug, title: title!, photos, parentEssayId });
      const rewrite = parentEssayId ? `&reescrita=${encodeURIComponent(parentEssayId)}` : '';
      const next = `${submit}?continuar=1${version ? `&versao=${version}` : ''}${rewrite}`;
      navigate(`/entrar?next=${encodeURIComponent(next)}`);
      return;
    }
    startUpload();
  }

  async function openCamera() {
    if (slug && title) {
      await saveDraft({ promptSlug: slug, title, photos, parentEssayId });
    }
    navigate(`/enviar/foto?proposta=${encodeURIComponent(slug ?? '')}`);
  }

  const notAvailable = prompt.error instanceof ApiError && prompt.error.code === 'PROMPT_NOT_AVAILABLE';
  const proposal = `/propostas/${encodeURIComponent(slug ?? '')}${version ? `?versao=${version}` : ''}`;
  const cost = Math.max(photos.length, 1);

  return (
    <>
      <Nav current="temas" />
      <main className={`container ${styles.page}`}>
        <div className={styles.heading}>
          <nav aria-label="Você está em" className={styles.crumbs}>
            <Link to="/propostas">{prompt.data?.examName ?? 'Fuvest'}</Link> <span className="muted">/</span>{' '}
            <Link to="/propostas">Propostas</Link> <span className="muted">/</span>{' '}
            <Link to={proposal}>{prompt.data?.title ?? 'Proposta'}</Link> <span className="muted">/ Envio</span>
          </nav>
          <h1 className="serif h1">Envie sua redação</h1>
          {prompt.data && (
            <p className={`muted ${styles.themeLine}`}>
              Proposta: <strong>{prompt.data.title}</strong> · <Link to={proposal}>Ver coletânea</Link>
            </p>
          )}
        </div>

        {prompt.error ? (
          <div className={styles.errorBlock}>
            <ErrorState message={errorMessage(prompt.error)} onRetry={notAvailable ? undefined : () => void prompt.refetch()} />
            {notAvailable && <Button to="/propostas">Ver as propostas</Button>}
          </div>
        ) : !prompt.data ? (
          <PageSkeleton />
        ) : (
          <div className={styles.columns}>
            <div className={styles.card}>
              <section className={styles.essaySection}>
                <h2 className="h3">Sua redação</h2>
                <div className={styles.genre}>
                  <span className={`muted ${styles.small13}`}>Tipo de redação, definido pela proposta</span>
                  <span className={styles.strong}>{prompt.data.essayType.name}</span>
                </div>
              </section>

              <section className={styles.photoSection}>
                <h2 className="h3">Foto da folha</h2>
                <input
                  ref={fileInput}
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/*"
                  multiple
                  aria-label="Foto da folha"
                  onChange={(event) => {
                    void addFiles(event.target.files);
                    event.target.value = '';
                  }}
                />

                {photos.length === 0 ? (
                  <div className={styles.dropzone} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2346C9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                    <span>Tire a foto ou arraste o arquivo</span>
                    <div className={styles.dropActions}>
                      <button type="button" className={styles.textButton} onClick={() => fileInput.current?.click()}>
                        Escolher arquivo
                      </button>
                      <button type="button" className={`${styles.textButton} ${styles.cameraButton}`} onClick={() => void openCamera()}>
                        Fotografar
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className={styles.photos} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
                    {photos.map((photo, index) => (
                      <li key={`${photo.name}-${index}`}>
                        <SheetThumb />
                        <div>
                          <span className={styles.strong}>{photo.name}</span>
                          <span className={`muted ${styles.small}`}>{formatSize(photo.blob.size)}</span>
                          <div className={styles.photoActions}>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => {
                              setPhotos((current) => current.filter((_, position) => position !== index));
                              if (photos.length === 1) {
                                fileInput.current?.click();
                              }
                            }}
                          >
                            {photos.length === 1 ? 'Trocar foto' : 'Remover'}
                          </button>
                          {index === photos.length - 1 && (
                            <button type="button" className={styles.textButton} onClick={() => fileInput.current?.click()}>
                              Adicionar outra foto
                            </button>
                          )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {photoError && (
                  <p className={styles.modalError} role="alert">
                    {photoError}
                  </p>
                )}

                <ul className={styles.tips}>
                  <li>
                    <CheckIcon />
                    Folha inteira, reta e com boa luz
                  </li>
                  <li>
                    <CheckIcon />
                    Uma face da folha por envio
                  </li>
                  <li>
                    <AlertIcon size={16} color="#B5530B" />
                    <span>Não escreva seu nome na folha: na Fuvest, identificação zera a redação.</span>
                  </li>
                </ul>
              </section>
            </div>

            <aside className={`${styles.card} ${styles.aside}`} aria-label="Resumo do envio">
                {title && (
                  <div className={styles.sending}>
                    <span className={`muted ${styles.small13}`}>Você vai enviar</span>
                    <span className={styles.strong}>
                      {photos.length > 1 ? `${photos.length} redações · ` : ''}
                      {title}
                    </span>
                  </div>
                )}
                <div className={title ? `${styles.cost} ${styles.costLine}` : styles.cost}>
                  <span className="muted">Custo</span>
                  <span className={styles.strong}>
                    {cost} {cost === 1 ? 'correção' : 'correções'}
                  </span>
                </div>
                <Button block disabled={!ready || uploading} onClick={() => void send()}>
                  Enviar para correção
                </Button>
                {upload.error && (
                  <p className={styles.modalError} role="alert">
                    {errorMessage(upload.error)}
                  </p>
                )}
                <span className={`muted ${styles.hint}`}>
                  Você confere tudo antes de confirmar. Se ainda não entrou, pedimos o login nesse momento.
                </span>
            </aside>
          </div>
        )}
      </main>

      {pending && <ConfirmSendModal essays={pending} parentEssayId={parentEssayId} onClose={() => setPending(null)} />}
    </>
  );
}
