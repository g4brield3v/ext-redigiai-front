import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckIcon } from '../../components/primitives';
import { errorMessage } from '../../lib/api';
import styles from './CameraPage.module.css';
import { loadDraft, saveDraft } from './draft';
import { preparePhoto } from './photo';

/** 5 · Câmera no celular: fotografa a folha e volta para a tela do tema com a foto escolhida. */
export function CameraPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const themeId = params.get('tema');
  const back = themeId ? `/temas/${themeId}` : '/temas';
  const draft = useQuery({ queryKey: ['draft'], queryFn: loadDraft, staleTime: 0 });

  const video = useRef<HTMLVideoElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let current: MediaStream | null = null;

    const open = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      : () => Promise.reject<MediaStream>(new Error('camera unavailable'));

    open({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false })
      .then((media) => {
        if (!active) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        current = media;
        setStream(media);
      })
      // Sem permissão ou sem câmera: a pessoa escolhe a foto pelo seletor do aparelho.
      .catch(() => active && setCameraFailed(true));

    return () => {
      active = false;
      current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (video.current && stream) {
      video.current.srcObject = stream;
    }
  }, [stream]);

  async function acceptPhoto(file: File) {
    setBusy(true);
    setError(null);
    try {
      const photo = await preparePhoto(file);
      if (draft.data && draft.data.themeId === themeId) {
        await saveDraft({ ...draft.data, photos: [...draft.data.photos, photo] });
      }
      navigate(back);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  function shoot() {
    const element = video.current;
    if (!element || !element.videoWidth) {
      gallery.current?.click();
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext('2d')?.drawImage(element, 0, 0);
    canvas.toBlob(
      (blob) => blob && void acceptPhoto(new File([blob], 'foto-redacao.jpg', { type: 'image/jpeg' })),
      'image/jpeg',
      0.92,
    );
  }

  async function toggleTorch() {
    const track = stream?.getVideoTracks()[0];
    try {
      // A lanterna só existe em alguns aparelhos.
      await track?.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorch(false);
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link to={back} aria-label="Fechar câmera" className={styles.iconButton}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
        <h1 className={styles.title}>Fotografar redação</h1>
        <button type="button" className={styles.iconButton} aria-label={torch ? 'Desligar flash' : 'Ligar flash'} aria-pressed={torch} disabled={!stream} onClick={() => void toggleTorch()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={torch ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
          </svg>
        </button>
      </header>
      <p className={styles.essay}>{draft.data?.themeId === themeId ? draft.data?.title : ' '}</p>

      <div className={styles.viewfinder}>
        {stream ? (
          <video ref={video} autoPlay playsInline muted aria-label="Imagem da câmera" />
        ) : (
          <p className={styles.fallback}>
            {cameraFailed ? 'Não foi possível abrir a câmera. Toque em "Galeria" para escolher a foto da folha.' : 'Abrindo a câmera…'}
          </p>
        )}
        <span className={`${styles.corner} ${styles.topLeft}`} />
        <span className={`${styles.corner} ${styles.topRight}`} />
        <span className={`${styles.corner} ${styles.bottomLeft}`} />
        <span className={`${styles.corner} ${styles.bottomRight}`} />
        {error && (
          <span className={`${styles.message} ${styles.messageError}`} role="alert">
            {error}
          </span>
        )}
      </div>

      <div className={styles.tips}>
        <span>
          <CheckIcon color="#7FE0B0" />
          Luz boa
        </span>
        <span>
          <CheckIcon color="#7FE0B0" />
          Sem sombra
        </span>
        <span>Sem nome na folha</span>
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.gallery} onClick={() => gallery.current?.click()}>
          Galeria
        </button>
        <button type="button" className={styles.shutter} aria-label="Fotografar" disabled={busy} onClick={shoot} />
        <span aria-hidden="true" />
        <input
          ref={gallery}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/*"
          capture="environment"
          aria-label="Escolher foto da galeria"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void acceptPhoto(file);
            }
            event.target.value = '';
          }}
        />
      </footer>
    </div>
  );
}
