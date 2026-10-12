import type { Annotation, CorrectionCriterion } from '../../api/provisional-types';
import styles from './CorrectionPage.module.css';
import { CriterionNumber, HEAVY_LOSS, Meter, PinMark, cx } from './parts';

type CriterionCardProps = {
  criterion: CorrectionCriterion;
  maxLevel: number;
  /** Todos os apontamentos da correção; o cartão usa os de `annotationIds`. */
  annotations: Annotation[];
  /** "Ver N apontamentos no texto": filtra a folha por este critério e rola até ela. */
  onShowInText: (position: number) => void;
};

/** Um critério: pontos e perda (vindos da API), nível, o que a grade pede para o próximo nível e o que corrigir. */
export function CriterionCard({ criterion, maxLevel, annotations, onShowInText }: CriterionCardProps) {
  const own = annotations.filter((annotation) => criterion.annotationIds.includes(annotation.id));
  // Desvios de escrita: apontamentos com regra, cada um com a forma correta.
  const deviations = own.filter((annotation) => annotation.kind === 'issue' && annotation.ruleName);

  return (
    <article id={`criterio-${criterion.position}`} className={styles.criterion} tabIndex={-1}>
      <div className={styles.criterionHead}>
        <CriterionNumber position={criterion.position} bad={criterion.pointsLost >= HEAVY_LOSS} size="large" />
        <div className={styles.criterionNames}>
          <h3 className={styles.h3}>{criterion.shortName}</h3>
          <span className={cx('muted', styles.criterionFull)}>
            {criterion.fullName} · peso {criterion.weight}
          </span>
        </div>
        <div className={styles.criterionPoints}>
          <span className={styles.criterionValue}>
            {criterion.points}
            <span className="muted"> / {criterion.maxPoints}</span>
          </span>
          {criterion.pointsLost > 0 ? (
            <span className={styles.lost}>−{criterion.pointsLost} {criterion.pointsLost === 1 ? 'ponto' : 'pontos'}</span>
          ) : (
            <span className={styles.full}>Nota máxima</span>
          )}
        </div>
      </div>

      <div className={styles.level}>
        <Meter level={criterion.level} max={maxLevel} large />
        <span>
          Nível {criterion.level} de {maxLevel}
        </span>
      </div>

      <div className={cx(styles.ladder, !criterion.nextDescriptor && styles.ladderSingle)}>
        <div className={cx(styles.rung, styles.rungNow)}>
          <span className={styles.rungLabel}>Seu nível</span>
          <q>{criterion.currentDescriptor}</q>
        </div>
        {criterion.nextDescriptor && (
          <div className={cx(styles.rung, styles.rungNext)}>
            <span className={styles.rungLabel}>Para chegar ao nível {criterion.level + 1}</span>
            <q>{criterion.nextDescriptor}</q>
          </div>
        )}
      </div>

      <p className={styles.justification}>{criterion.justification}</p>

      {deviations.length > 0 ? (
        <div className={styles.guidance}>
          <span className={styles.guidanceLabel}>O que corrigir · desvios por regra</span>
          <ul className={styles.deviations}>
            {deviations.map((annotation) => (
              <li key={annotation.id}>
                <PinMark id={annotation.id} kind={annotation.kind} />
                <span>
                  <strong>{annotation.ruleName}</strong> · linha {annotation.lineStart}
                  <br />
                  {annotation.fix ? (
                    <>
                      <span className="muted">Escreva</span> “{annotation.fix}” <span className="muted">no lugar de</span> “{annotation.quote}”.
                    </>
                  ) : (
                    annotation.note
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        criterion.guidance && (
          <div className={styles.guidance}>
            <span className={styles.guidanceLabel}>O que corrigir</span>
            <span>{criterion.guidance}</span>
          </div>
        )
      )}

      {own.length > 0 && (
        <button type="button" className={styles.criterionLink} onClick={() => onShowInText(criterion.position)}>
          Ver {own.length} {own.length === 1 ? 'apontamento' : 'apontamentos'} no texto →
        </button>
      )}
    </article>
  );
}
