import { Fragment } from 'react';
import type { Annotation, TranscriptionLine } from '../../api/provisional-types';
import styles from './CorrectionPage.module.css';
import { kindLabel, linePieces } from './annotations';
import { cx } from './parts';

type EssayLinesProps = {
  lines: TranscriptionLine[];
  /** Só os apontamentos visíveis pelos filtros; os demais aparecem como texto comum. */
  annotations: Annotation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

/**
 * A redação sobre a pauta. O texto quebra linha (nada é cortado), cada trecho marcado é clicável e o número
 * do apontamento vem logo depois do trecho, como botão.
 */
export function EssayLines({ lines, annotations, selectedId, onSelect }: EssayLinesProps) {
  const selected = annotations.find((annotation) => annotation.id === selectedId);

  return (
    <div className={styles.lines}>
      {lines.map((line) => {
        const inSelection = selected !== undefined && selected.lineStart <= line.number && line.number <= selected.lineEnd;
        return (
          <Fragment key={line.number}>
            <span className={styles.lineNumber} aria-hidden="true">
              {String(line.number).padStart(2, '0')}
            </span>
            <span
              className={cx(styles.lineText, line.indent && styles.paragraph, inSelection && styles.lineSelected)}
              data-line={line.number}
            >
              {linePieces(line, annotations).map((piece, index) => {
                const annotation = piece.annotation;
                if (!annotation) {
                  return <Fragment key={index}>{piece.text}</Fragment>;
                }
                const isSelected = annotation.id === selectedId;
                return (
                  <Fragment key={index}>
                    {/* O clique no trecho é um atalho para o mouse; pelo teclado, a seleção é o botão com o número. */}
                    <span
                      className={cx(annotation.kind === 'issue' ? styles.issue : styles.good, isSelected && styles.markSelected)}
                      data-annotation={annotation.id}
                      onClick={() => onSelect(annotation.id)}
                    >
                      {piece.text}
                    </span>
                    {piece.pin && (
                      <button
                        type="button"
                        className={cx(styles.pin, styles.pinInText, annotation.kind === 'good' && styles.pinGood, isSelected && styles.pinSelected)}
                        aria-label={`Apontamento ${annotation.id}: ${kindLabel(annotation.kind)}, critério ${annotation.criterion}`}
                        aria-pressed={isSelected}
                        onClick={() => onSelect(annotation.id)}
                      >
                        {annotation.id}
                      </button>
                    )}
                  </Fragment>
                );
              })}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
