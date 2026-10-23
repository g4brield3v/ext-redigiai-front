import { Fragment } from 'react';
import type { Annotation, TranscriptionLine } from '../../api/provisional-types';
import styles from './CorrectionPage.module.css';
import { kindLabel, linePieces } from './annotations';
import { cx } from './parts';

type LinePiecesProps = {
  line: TranscriptionLine;
  /** Só os apontamentos visíveis pelos filtros; os demais aparecem como texto comum. */
  annotations: Annotation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

/**
 * O texto de uma linha da folha, com os trechos marcados clicáveis e o número do apontamento logo depois do
 * trecho, como botão. Os dois modos de mostrar a redação usam este mesmo pedaço.
 */
export function LinePieces({ line, annotations, selectedId, onSelect }: LinePiecesProps) {
  return (
    <>
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
    </>
  );
}

/** As linhas do apontamento selecionado, para o destaque da seleção. */
export function inSelection(selected: Annotation | undefined, line: TranscriptionLine) {
  return selected !== undefined && selected.lineStart <= line.number && line.number <= selected.lineEnd;
}
