import { Fragment } from 'react';
import styles from './CorrectionPage.module.css';
import type { EssayViewProps } from './EssaySheet';
import { LinePieces, inSelection } from './LinePieces';
import { essayParagraphs, lineJoiner } from './essayParagraphs';
import { cx } from './parts';

/**
 * Modo "Texto corrido": a redação em parágrafos, como o aluno a escreveu, sem a quebra da folha. O número de cada
 * linha da folha aparece dentro do texto, no ponto em que ela começa (como o número de um versículo), e a margem
 * mostra o parágrafo e o intervalo de linhas. O texto do aluno não muda: as linhas só se juntam.
 */
export function EssayFlow({ lines, annotations, selectedId, onSelect }: EssayViewProps) {
  const selected = annotations.find((annotation) => annotation.id === selectedId);

  return (
    <div className={styles.flow}>
      {essayParagraphs(lines).map((paragraph) => (
        <Fragment key={paragraph.number}>
          <div className={styles.flowMargin} aria-hidden="true">
            <span className={styles.flowParagraph}>§{paragraph.number}</span>
            <span className={styles.flowRange}>
              {paragraph.first === paragraph.last ? paragraph.first : `${paragraph.first}–${paragraph.last}`}
            </span>
          </div>
          <p className={styles.flowText}>
            {paragraph.lines.map((line, index) => {
              const selectedLine = inSelection(selected, line);
              return (
                <Fragment key={line.number}>
                  {index > 0 && lineJoiner(paragraph.lines[index - 1]!)}
                  <span data-line={line.number} title={`Linha ${line.number}`} className={cx(selectedLine && styles.flowLineSelected)}>
                    <span className={cx(styles.flowLineNumber, selectedLine && styles.flowLineNumberSelected)} aria-hidden="true">
                      {line.number}
                    </span>
                    <LinePieces line={line} annotations={annotations} selectedId={selectedId} onSelect={onSelect} />
                  </span>
                </Fragment>
              );
            })}
          </p>
        </Fragment>
      ))}
    </div>
  );
}
