import { useEffect, useRef } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import styles from './CorrectionPage.module.css';

/** Arrastar o topo da folha para baixo por esta distância fecha. */
const DRAG_TO_CLOSE = 60;

type AnnotationSheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Folha inferior do celular, sobre o <dialog> nativo: o foco fica preso nela e Esc fecha. Também fecha no
 * "×", tocando fora ou arrastando o topo para baixo.
 */
export function AnnotationSheet({ title, onClose, children }: AnnotationSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => dialog?.close();
  }, []);

  function endDrag(event: PointerEvent) {
    if (dragStart.current !== null && event.clientY - dragStart.current > DRAG_TO_CLOSE) {
      onClose();
    }
    dragStart.current = null;
  }

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // O clique no fundo escurecido chega no próprio <dialog>, não no conteúdo.
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={styles.sheetHead}
        onPointerDown={(event) => {
          dragStart.current = event.clientY;
        }}
        onPointerUp={endDrag}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
      >
        <h2 className={styles.sheetTitle}>{title}</h2>
        <button type="button" className={styles.sheetClose} aria-label="Fechar" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={styles.sheetBody}>{children}</div>
    </dialog>
  );
}
