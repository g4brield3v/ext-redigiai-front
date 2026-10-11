import { Fragment } from 'react';
import styles from './EssaySheet.module.css';

export type SheetMark = 'wavy' | 'circle' | 'good' | 'illegible';

export type SheetSegment = { text: string; mark?: SheetMark };

export type SheetNote = {
  /** Comentário da margem; precisa corresponder ao trecho marcado na mesma linha. */
  text: string;
  /** Número do critério no selo redondo. */
  criterion?: number;
  kind?: 'issue' | 'good';
};

export type SheetLine = {
  number: number;
  /** Texto exatamente como transcrito, sem quebra automática. */
  segments: SheetSegment[];
  /** Recuo de início de parágrafo. */
  indent?: boolean;
  note?: SheetNote;
};

type EssaySheetProps = {
  lines: SheetLine[];
  /** Coluna de comentários à direita (some abaixo de 620 px; os comentários passam para baixo da linha). */
  withMargin?: boolean;
  /** Proporções da folha de exemplo da página inicial. */
  compact?: boolean;
  /** Descrição para leitores de tela quando a folha é só ilustração. */
  label?: string;
};

const markClass: Record<SheetMark, string | undefined> = {
  wavy: styles.wavy,
  circle: styles.circle,
  good: styles.good,
  illegible: styles.illegible,
};

function Note({ note }: { note: SheetNote }) {
  return (
    <>
      {note.text}
      {note.criterion !== undefined && (
        <span className={[styles.tag, note.kind === 'good' && styles.tagGood].filter(Boolean).join(' ')}>
          {note.criterion}
        </span>
      )}
    </>
  );
}

/** A folha pautada: o texto do aluno sentado na pauta, com as marcas e os comentários da correção. */
export function EssaySheet({ lines, withMargin = false, compact = false, label }: EssaySheetProps) {
  const className = [styles.sheet, withMargin && styles.withMargin, compact && styles.compact].filter(Boolean).join(' ');

  return (
    <div className={className} role={label ? 'img' : undefined} aria-label={label}>
      {lines.map((line) => (
        <Fragment key={line.number}>
          <span className={styles.number}>{String(line.number).padStart(2, '0')}</span>
          <span className={[styles.text, line.indent && styles.indent].filter(Boolean).join(' ')}>
            {line.segments.map((segment, index) =>
              segment.mark ? (
                <span key={index} className={markClass[segment.mark]}>
                  {segment.text}
                </span>
              ) : (
                <Fragment key={index}>{segment.text}</Fragment>
              ),
            )}
          </span>
          {withMargin && <span className={styles.margin}>{line.note && <Note note={line.note} />}</span>}
          {withMargin && line.note && (
            <span className={styles.below}>
              <Note note={line.note} />
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
