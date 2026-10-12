import type { Correction, CorrectionCriterion } from '../../api/provisional-types';
import { Button } from '../../components/Button';
import { Chip } from '../../components/primitives';
import styles from './CorrectionPage.module.css';
import { CriterionNumber, HEAVY_LOSS, Meter, cx } from './parts';

type ScoreMapProps = {
  criteria: CorrectionCriterion[];
  maxLevel: number;
  onShowCriterion: (position: number) => void;
};

/** "Onde a nota foi ganha e perdida": uma linha por critério, com os números que vieram da API. */
export function ScoreMap({ criteria, maxLevel, onShowCriterion }: ScoreMapProps) {
  return (
    <div className={styles.map}>
      <span className={cx('muted', styles.label, styles.mapLabel)}>Onde a nota foi ganha e perdida</span>
      {criteria.map((criterion) => (
        <a
          key={criterion.position}
          className={styles.mapRow}
          href={`#criterio-${criterion.position}`}
          onClick={(event) => {
            event.preventDefault();
            onShowCriterion(criterion.position);
          }}
        >
          <CriterionNumber position={criterion.position} bad={criterion.pointsLost >= HEAVY_LOSS} />
          <span className={styles.mapName}>{criterion.shortName}</span>
          <Meter level={criterion.level} max={maxLevel} />
          <span className={styles.mapPoints}>
            {criterion.points}
            <span className="muted"> / {criterion.maxPoints}</span>
          </span>
          {criterion.pointsLost > 0 ? (
            <span className={cx(styles.lost, styles.mapLost)}>−{criterion.pointsLost}</span>
          ) : (
            <span className={cx(styles.full, styles.mapLost)}>máx.</span>
          )}
        </a>
      ))}
    </div>
  );
}

function deltaLabel({ scoreDelta, previousVersion }: Pick<Correction, 'scoreDelta' | 'previousVersion'>) {
  if (scoreDelta === null || previousVersion === null) {
    return null;
  }
  const sign = scoreDelta > 0 ? '+' : scoreDelta < 0 ? '−' : '';
  return `${sign}${Math.abs(scoreDelta)} desde a ${previousVersion}ª versão`;
}

type ResultSummaryProps = {
  correction: Correction;
  onShowCriterion: (position: number) => void;
  /** "Ver no texto": rola até a redação e seleciona o apontamento por onde começar. */
  onShowInText: () => void;
};

/** Bloco de resultado: nota, mapa de pontos por critério e um único "Comece por aqui". */
export function ResultSummary({ correction, onShowCriterion, onShowInText }: ResultSummaryProps) {
  const { mainIssue, scoreDelta } = correction;
  const delta = deltaLabel(correction);
  const criterion = correction.criteria.find((item) => item.position === mainIssue.criterion);

  return (
    <section className={cx(styles.wrap, styles.result)} aria-label="Resultado">
      <div className={styles.resultCard}>
        <div className={styles.score}>
          <span className={cx('muted', styles.label)}>Nota da grade</span>
          <span>
            <span className={cx('serif', styles.scoreValue)}>{correction.score}</span>
            <span className={cx('muted', styles.scoreMax)}> / {correction.maxScore}</span>
          </span>
          {delta && <Chip tone={scoreDelta! > 0 ? 'ok' : scoreDelta! < 0 ? 'error' : 'queued'}>{delta}</Chip>}
        </div>

        <ScoreMap criteria={correction.criteria} maxLevel={correction.rubric.maxLevel} onShowCriterion={onShowCriterion} />

        <div className={styles.start}>
          <span className={styles.eyebrow}>Comece por aqui</span>
          <p className={styles.startText}>{mainIssue.text}</p>
          {criterion && (
            <span className={styles.startCriterion}>
              <CriterionNumber position={criterion.position} bad />
              <span>
                {criterion.shortName}
                {mainIssue.potentialGain !== null && mainIssue.potentialGain > 0 && ` · vale até +${mainIssue.potentialGain} pontos`}
              </span>
            </span>
          )}
          {correction.annotations.length > 0 && (
            <Button className={styles.startButton} onClick={onShowInText}>
              Ver no texto
            </Button>
          )}
          <p className={styles.keep}>
            <strong>✓ Mantenha:</strong> {correction.strengths}
          </p>
        </div>
      </div>
    </section>
  );
}
