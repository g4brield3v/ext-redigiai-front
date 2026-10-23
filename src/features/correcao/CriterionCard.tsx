import { useState } from 'react';
import type { Annotation, CorrectionCriterion } from '../../api/provisional-types';
import styles from './CorrectionPage.module.css';
import { CriterionNumber, HEAVY_LOSS, Meter, PinMark, cx } from './parts';

type Example = NonNullable<CorrectionCriterion['example']>;

/** Um trecho do texto reescrito: o que sai riscado em vermelho, o que entra com fundo verde. */
function RewriteExample({ example }: { example: Example }) {
  return (
    <div className={styles.example}>
      <b>Como ficaria no seu texto</b>
      <span className={styles.exampleSource}>{example.lineLabel} · um exemplo, não a única forma</span>
      <span className={styles.exampleText}>
        {example.segments.map((segment, index) =>
          segment.kind === 'remove' ? (
            <s key={index}>{segment.text}</s>
          ) : segment.kind === 'add' ? (
            <ins key={index} className={styles.exampleAdd}>
              {segment.text}
            </ins>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </span>
    </div>
  );
}

type CriterionCardProps = {
  criterion: CorrectionCriterion;
  maxLevel: number;
  /** Todos os apontamentos da correção; o cartão usa os de `annotationIds`. */
  annotations: Annotation[];
  /** O critério do "Comece por aqui": o exemplo vem aberto. */
  mainIssue?: boolean;
  /** "Ver N apontamentos no texto": filtra a folha por este critério e rola até ela. */
  onShowInText: (position: number) => void;
};

/**
 * Um critério: pontos e perda (vindos da API), nível, o que a grade pede para o próximo nível, o que isso quer
 * dizer em palavras simples, o que corrigir e como ficaria no texto do aluno.
 */
export function CriterionCard({ criterion, maxLevel, annotations, mainIssue = false, onShowInText }: CriterionCardProps) {
  const [exampleOpen, setExampleOpen] = useState(mainIssue);
  const [fixesShown, setFixesShown] = useState(false);
  const own = annotations.filter((annotation) => criterion.annotationIds.includes(annotation.id));
  // Desvios de escrita: apontamentos com regra. A forma correta é a resposta exata (ou o `fix` das correções antigas).
  const deviations = own.filter((annotation) => annotation.kind === 'issue' && annotation.ruleName);
  const correctForm = (annotation: Annotation) => (annotation.answerKind === 'exact' ? annotation.answer : null) ?? annotation.fix;
  const withCorrectForm = deviations.some((annotation) => correctForm(annotation));

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

      {criterion.plainExplanation && (
        <div className={styles.plain}>
          <b>Em palavras simples</b>
          <span>{criterion.plainExplanation}</span>
        </div>
      )}

      <p className={styles.justification}>{criterion.justification}</p>

      {deviations.length > 0 ? (
        <div className={styles.guidance}>
          <span className={styles.guidanceLabel}>O que corrigir · desvios por regra</span>
          <ul className={styles.deviations}>
            {deviations.map((annotation) => {
              const form = correctForm(annotation);
              return (
                <li key={annotation.id}>
                  <PinMark id={annotation.id} kind={annotation.kind} />
                  <span>
                    <strong>{annotation.ruleName}</strong> · linha {annotation.lineStart} ·{' '}
                    <span className={styles.deviationQuote}>“{annotation.quote}”</span>
                    {/* A forma correta só aparece quando o aluno pede: antes, ele tenta sozinho. */}
                    {form
                      ? fixesShown && (
                          <>
                            <br />
                            <span className="muted">Escreva</span> “{form}” <span className="muted">no lugar de</span> “{annotation.quote}”.
                          </>
                        )
                      : annotation.note && (
                          <>
                            <br />
                            {annotation.note}
                          </>
                        )}
                  </span>
                </li>
              );
            })}
          </ul>
          {withCorrectForm && (
            <button type="button" className={styles.showButton} aria-pressed={fixesShown} onClick={() => setFixesShown(!fixesShown)}>
              {fixesShown ? 'Esconder as formas corretas' : 'Mostrar as formas corretas'}
            </button>
          )}
        </div>
      ) : (
        criterion.guidance && (
          <div className={styles.guidance}>
            <span className={styles.guidanceLabel}>O que corrigir</span>
            <span>{criterion.guidance}</span>
          </div>
        )
      )}

      {criterion.example &&
        (exampleOpen ? (
          <RewriteExample example={criterion.example} />
        ) : (
          <button type="button" className={styles.showButton} onClick={() => setExampleOpen(true)}>
            Ver como ficaria no seu texto ▾
          </button>
        ))}

      {own.length > 0 && (
        <button type="button" className={styles.criterionLink} onClick={() => onShowInText(criterion.position)}>
          Ver {own.length} {own.length === 1 ? 'apontamento' : 'apontamentos'} no texto →
        </button>
      )}
    </article>
  );
}
