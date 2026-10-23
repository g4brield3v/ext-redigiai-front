import { Fragment } from 'react';
import type { Annotation, TranscriptionLine } from '../../api/provisional-types';
import styles from './CorrectionPage.module.css';
import { LinePieces, inSelection } from './LinePieces';
import { cx } from './parts';

export type EssayViewProps = {
  lines: TranscriptionLine[];
  /** Só os apontamentos visíveis pelos filtros; os demais aparecem como texto comum. */
  annotations: Annotation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

/**
 * Modo "Como na folha": uma fileira por linha manuscrita, com o número na coluna da margem. O texto quebra linha
 * (nada é cortado), sempre sobre a pauta.
 */
export function EssaySheet({ lines, annotations, selectedId, onSelect }: EssayViewProps) {
  const selected = annotations.find((annotation) => annotation.id === selectedId);

  return (
    <div className={styles.lines}>
      {lines.map((line) => (
        <Fragment key={line.number}>
          <span className={styles.lineNumber} aria-hidden="true">
            {String(line.number).padStart(2, '0')}
          </span>
          <span
            className={cx(styles.lineText, line.indent && styles.paragraph, inSelection(selected, line) && styles.lineSelected)}
            data-line={line.number}
          >
            <LinePieces line={line} annotations={annotations} selectedId={selectedId} onSelect={onSelect} />
          </span>
        </Fragment>
      ))}
    </div>
  );
}
