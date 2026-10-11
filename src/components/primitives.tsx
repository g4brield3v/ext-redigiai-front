import { useEffect, useId, useRef } from 'react';
import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import styles from './primitives.module.css';

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(' ');
}

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.card, className)} {...rest} />;
}

/** Cartão em destaque, com sombra ("janela"). */
export function Window({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.window, className)} {...rest} />;
}

export type ChipTone = 'ok' | 'review' | 'running' | 'queued' | 'error' | 'tag';

export function Chip({ tone = 'tag', children }: { tone?: ChipTone; children: ReactNode }) {
  return <span className={cx(styles.chip, styles[tone])}>{children}</span>;
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  hideLabel?: boolean;
};

export function Field({ label, hint, error, hideLabel, id, className, ...rest }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint && (
        <span id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${inputId}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Diálogo modal sobre o elemento nativo: foco preso, Esc fecha, foco devolvido ao fechar. */
export function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.modalHeader}>
        <h2 id={titleId} className={cx('serif', styles.modalTitle)}>
          {title}
        </h2>
        <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {children}
    </dialog>
  );
}

/** Esqueleto de carregamento com o formato do conteúdo. */
export function Skeleton({ width, height = 16, radius = 8 }: { width?: number | string; height?: number | string; radius?: number }) {
  return <span className={styles.skeleton} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.errorState} role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}
