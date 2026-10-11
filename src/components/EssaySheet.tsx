import { Fragment } from 'react';
import styles from './EssaySheet.module.css';

export type SheetMark = 'wavy' | 'circle' | 'good' | 'illegible';

export type SheetSegment = {
  text: string;
  mark?: SheetMark;
  /** Critério que a marca afeta; clicar na marca leva até ele. */
  criterion?: number;
};

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
  /** Linhas em destaque (ex.: as citadas no critério que o aluno abriu). */
  highlighted?: number[];
  onMarkClick?: (criterion: number) => void;
};

const markClass: Record<SheetMark, string | undefined> = {
  wavy: styles.wavy,
  circle: styles.circle,
  good: styles.good,
  illegible: styles.illegible,
};

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(' ');
}

function Note({ note }: { note: SheetNote }) {
  const tag = note.criterion !== undefined && (
    <span className={cx(styles.tag, note.kind === 'good' && styles.tagGood)}>{note.criterion}</span>
  );

  // No acerto, o selo vem antes do comentário; no problema, depois.
  return note.kind === 'good' ? (
    <span className={styles.noteGood}>
      {tag}
      {note.text}
    </span>
  ) : (
    <>
      {note.text}
      {tag}
    </>
  );
}

/** A folha pautada: o texto do aluno sentado na pauta, com as marcas e os comentários da correção. */
export function EssaySheet({ lines, withMargin = false, compact = false, label, highlighted, onMarkClick }: EssaySheetProps) {
  return (
    <div
      className={cx(styles.sheet, withMargin && styles.withMargin, compact && styles.compact)}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {lines.map((line) => {
        const lit = highlighted?.includes(line.number);
        return (
          <Fragment key={line.number}>
            <span className={cx(styles.number, lit && styles.lit)} data-line={line.number}>
              {String(line.number).padStart(2, '0')}
            </span>
            <span className={cx(styles.text, line.indent && styles.indent, lit && styles.lit)}>
              {line.segments.map((segment, index) => {
                if (!segment.mark) {
                  return <Fragment key={index}>{segment.text}</Fragment>;
                }
                const { criterion } = segment;
                return onMarkClick && criterion !== undefined ? (
                  <span
                    key={index}
                    className={cx(markClass[segment.mark], styles.clickable)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${segment.text}: ver o critério ${criterion}`}
                    onClick={() => onMarkClick(criterion)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onMarkClick(criterion);
                      }
                    }}
                  >
                    {segment.text}
                  </span>
                ) : (
                  <span key={index} className={markClass[segment.mark]}>
                    {segment.text}
                  </span>
                );
              })}
            </span>
            {withMargin && <span className={cx(styles.margin, lit && styles.lit)}>{line.note && <Note note={line.note} />}</span>}
            {withMargin && line.note && (
              <span className={styles.below}>
                <Note note={line.note} />
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
