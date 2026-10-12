import type { Correction } from '../../api/provisional-types';
import { Button } from '../../components/Button';
import { Chip } from '../../components/primitives';
import styles from './CorrectionPage.module.css';
import { cx } from './parts';

type ZeroResultProps = {
  correction: Correction;
  /** Página da proposta do tema, para "Reler a proposta". */
  proposalTo: string;
};

/** Resultado da nota zero: o destaque é o motivo; o que funcionou vira uma linha "Aproveite". */
export function ZeroResult({ correction, proposalTo }: ZeroResultProps) {
  const { zero } = correction;
  // A regra vem da grade como frase completa; aqui ela continua a frase "Regra da Fuvest: …".
  const rule = zero.ruleNote ? zero.ruleNote.charAt(0).toLocaleLowerCase('pt-BR') + zero.ruleNote.slice(1) : null;

  return (
    <section className={cx(styles.wrap, styles.result)} aria-label="Resultado">
      <div className={cx(styles.resultCard, styles.resultZero)}>
        <div className={cx(styles.score, styles.scoreZero)}>
          <span className={cx('muted', styles.label)}>Nota da grade</span>
          <span>
            <span className={cx('serif', styles.scoreValue, styles.scoreValueZero)}>{correction.score}</span>
            <span className={cx('muted', styles.scoreMax)}> / {correction.maxScore}</span>
          </span>
          <Chip tone="error">Nota zero</Chip>
        </div>

        <div className={styles.zeroWhy}>
          <span className={cx(styles.eyebrow, styles.zeroEyebrow)}>Por que a nota foi zero</span>
          <h2 className={cx('serif', styles.zeroTitle)}>{zero.ruleLabel}</h2>
          {zero.explanation && <p className={styles.zeroExplanation}>{zero.explanation}</p>}
          {rule && (
            <p className={cx('muted', styles.zeroRule)}>
              Regra da {correction.examName}: {rule}
            </p>
          )}
        </div>

        <div className={cx(styles.start, styles.startZero)}>
          <span className={styles.eyebrow}>Comece por aqui</span>
          <p className={styles.startText}>{correction.mainIssue.text}</p>
          <Button className={styles.startButton} to={proposalTo}>
            Reler a proposta
          </Button>
          <p className={styles.keep}>
            <strong>✓ Aproveite:</strong> {correction.strengths}
          </p>
        </div>
      </div>
    </section>
  );
}
