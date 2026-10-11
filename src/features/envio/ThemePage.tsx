import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Nav } from '../../components/Nav';
import { AlertIcon, CheckIcon, ErrorState, SheetThumb, Skeleton } from '../../components/primitives';
import { ApiError, errorMessage } from '../../lib/api';
import type { Schemas } from '../../lib/api';
import { formatSize } from '../../lib/format';
import { useTheme } from '../../lib/queries';
import { useAuthState } from '../auth/AuthContext';
import { ConfirmSendModal } from './ConfirmSendModal';
import type { PendingEssay } from './ConfirmSendModal';
import { loadDraft, saveDraft } from './draft';
import type { DraftPhoto } from './draft';
import { preparePhoto, uploadPhoto } from './photo';
import styles from './ThemePage.module.css';

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5080';

function Collection({ texts }: { texts: Schemas['ThemeTextDto'][] }) {
  return (
    <section className={styles.collection}>
      <span className="eyebrow">Coletânea</span>
      {texts.map((text, index) => (
        <details key={text.position} className={styles.text} open={index === 0}>
          <summary>
            <span>
              Texto {text.position} · {text.title}
            </span>
            <span className={`muted ${styles.source}`}>{text.source}</span>
          </summary>
          {text.kind === 'image' ? (
            <div className={`muted ${styles.image}`}>[Imagem]</div>
          ) : (
            <p className={index === 0 ? styles.firstBody : undefined}>{text.body}</p>
          )}
        </details>
      ))}
    </section>
  );
}

function PageSkeleton() {
  return (
    <div className={styles.columns} aria-busy="true" aria-label="Carregando o tema">
      <div className={styles.card}>
        <Skeleton width={90} height={14} />
        <Skeleton height={90} />
        <Skeleton height={220} />
      </div>
      <div className={`${styles.card} ${styles.aside}`}>
        <Skeleton width={160} height={20} />
        <Skeleton height={70} radius={14} />
        <Skeleton height={70} radius={14} />
        <Skeleton height={48} radius={999} />
      </div>
    </div>
  );
}

/** 3 · Tipo de redação e envio da foto. */
export function ThemePage() {
  const { themeId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuthState();
  const theme = useTheme(themeId);
  const fileInput = useRef<HTMLInputElement>(null);

  const [typeId, setTypeId] = useState<string | null>(params.get('tipo'));
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingEssay[] | null>(null);
  const parentEssayId = params.get('reescrever') ?? undefined;
  const continuing = params.get('continuar') === '1';

  const types = theme.data?.essayTypes ?? [];
  const selectedType = types.find((type) => type.id === typeId) ?? null;
  const title = theme.data && selectedType ? `${theme.data.examName} – ${selectedType.name} – ${theme.data.title}` : null;

  // Retoma o que foi escolhido antes do login ou da câmera.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !themeId) {
      return;
    }
    restored.current = true;
    void loadDraft().then((draft) => {
      if (draft?.themeId === themeId) {
        setTypeId((current) => current ?? draft.essayTypeId);
        setPhotos(draft.photos);
      }
    });
  }, [themeId]);

  const upload = useMutation({
    mutationFn: async (): Promise<PendingEssay[]> => {
      const assetIds = await Promise.all(photos.map(uploadPhoto));
      return photos.map((photo, index) => ({
        title: title!,
        fileName: photo.name,
        themeId: themeId!,
        essayTypeId: typeId!,
        assetId: assetIds[index]!,
      }));
    },
    onSuccess: setPending,
  });
  const { mutate: startUpload, isPending: uploading } = upload;

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
    if (!ready || !themeId || !typeId) {
      return;
    }
    if (!auth.isSignedIn) {
      await saveDraft({ themeId, essayTypeId: typeId, title: title!, photos, parentEssayId });
      const next = `/temas/${themeId}?continuar=1${parentEssayId ? `&reescrever=${parentEssayId}` : ''}`;
      navigate(`/entrar?next=${encodeURIComponent(next)}`);
      return;
    }
    startUpload();
  }

  async function openCamera() {
    if (themeId && typeId && title) {
      await saveDraft({ themeId, essayTypeId: typeId, title, photos, parentEssayId });
    }
    navigate(`/enviar/foto?tema=${themeId}`);
  }

  const notAvailable = theme.error instanceof ApiError && theme.error.code === 'THEME_NOT_AVAILABLE';

  return (
    <>
      <Nav current="temas" />
      <main className={`container ${styles.page}`}>
        <div className={styles.heading}>
          <nav aria-label="Você está em" className={styles.crumbs}>
            <Link to="/temas">{theme.data?.examName ?? 'Temas'}</Link> <span className="muted">/ Temas</span>
          </nav>
          <h1 className="serif h1">{theme.data ? theme.data.title : theme.error ? 'Tema' : <Skeleton width={420} height={46} />}</h1>
        </div>

        {theme.error ? (
          <div className={styles.errorBlock}>
            <ErrorState message={errorMessage(theme.error)} onRetry={notAvailable ? undefined : () => void theme.refetch()} />
            {notAvailable && <Button to="/temas">Ver os temas</Button>}
          </div>
        ) : !theme.data ? (
          <PageSkeleton />
        ) : (
          <div className={styles.columns}>
            <article className={styles.card}>
              <section className={styles.statement}>
                <span className="eyebrow">Proposta</span>
                <p>{theme.data.statement}</p>
              </section>
              <Collection texts={theme.data.texts} />
              <a className={styles.download} href={`${apiUrl}/v1/themes/${theme.data.id}/sheet.pdf`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                </svg>
                Baixar a folha pautada (PDF, {theme.data.sheetLines} linhas)
              </a>
            </article>

            <aside className={`${styles.card} ${styles.aside}`} aria-label="Sua redação">
              <fieldset className={styles.types}>
                <legend className="h3">3. Tipo de redação</legend>
                {types.map((type) => (
                  <label key={type.id} className={type.id === typeId ? styles.typeOn : undefined}>
                    <input type="radio" name="tipo" checked={type.id === typeId} onChange={() => setTypeId(type.id)} />
                    <span>
                      <span className={styles.strong}>{type.name}</span>
                      <span className={`muted ${styles.small}`}>{type.description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <section className={styles.photoSection}>
                <h2 className="h3">4. Envie a foto da folha</h2>
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

              <div className={styles.summary}>
                {title && (
                  <div>
                    <span className={`muted ${styles.small13}`}>Você vai enviar</span>
                    <span className={styles.strong}>
                      {photos.length > 1 ? `${photos.length} redações · ` : ''}
                      {title}
                    </span>
                  </div>
                )}
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
              </div>
            </aside>
          </div>
        )}
      </main>

      {pending && <ConfirmSendModal essays={pending} parentEssayId={parentEssayId} onClose={() => setPending(null)} />}
    </>
  );
}
