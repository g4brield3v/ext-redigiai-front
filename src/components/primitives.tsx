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
  /** Linha de apoio abaixo do título. */
  subtitle?: string;
  onClose: () => void;
  /** Mostra o X no canto; sem ele, o diálogo fecha por um dos botões ou pelo Esc. */
  closeButton?: boolean;
  width?: 448 | 480;
  children: ReactNode;
};

/** Diálogo modal sobre o elemento nativo: foco preso, Esc fecha, foco devolvido ao fechar. */
export function Modal({ title, subtitle, onClose, closeButton = false, width = 480, children }: ModalProps) {
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
      style={{ maxWidth: width, gap: width === 448 ? 20 : 22 }}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalHeading}>
          <h2 id={titleId} className={cx('serif', styles.modalTitle)}>
            {title}
          </h2>
          {subtitle && <span className={styles.modalSubtitle}>{subtitle}</span>}
        </div>
        {closeButton && (
          <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </dialog>
  );
}

/** Aviso âmbar com ícone de atenção. */
export function Notice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx(styles.notice, className)}>
      <AlertIcon />
      <span>{children}</span>
    </div>
  );
}

export function AlertIcon({ size = 20, color = '#6B4300' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={size === 16 ? 2.4 : 2} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.5" />
    </svg>
  );
}

export function CheckIcon({ size = 16, color = '#2346C9' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={size === 18 ? 2.6 : 2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Miniatura da folha pautada, levemente inclinada. */
export function SheetThumb({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return <span className={cx(styles.thumb, size === 'sm' && styles.thumbSmall)} aria-hidden="true" />;
}

/** Nível do critério em bolinhas: uma por nível da grade (`max` vem da versão da grade, nunca é fixo). */
export function Dots({ level, max }: { level: number; max: number }) {
  return (
    <span className={styles.dots} role="img" aria-label={`Nível ${level} de ${max}`}>
      {Array.from({ length: max }, (_, index) => index + 1).map((dot) => (
        <span key={dot} className={dot <= level ? styles.dotOn : undefined} />
      ))}
    </span>
  );
}

/** Barra das quatro etapas do envio; `current` é a última etapa já alcançada. */
export function StepBar({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = ['Vestibular', 'Tema', 'Tipo de redação', 'Envio'];
  return (
    <ol className={styles.steps} aria-label="Etapas">
      {steps.map((label, index) => (
        <li key={label} className={index < current ? styles.stepCurrent : undefined} aria-current={index + 1 === current ? 'step' : undefined}>
          {index + 1} · {label}
        </li>
      ))}
    </ol>
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
