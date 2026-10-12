import type { ReactNode } from 'react';
import styles from './CriterionCard.module.css';
import { CheckIcon, Dots } from './primitives';

export type CriterionCardData = {
  position: number;
  name: string;
  weight: number;
  level: number;
  /** Nível mais alto da grade usada na correção. */
  maxLevel: number;
  points: number;
  maxPoints: number;
  descriptor: string;
  justification: string;
  linesLabel: string;
  guidance: string | null;
  deviations: { rule: string; line: number; correction: string }[];
};

type CriterionCardProps = {
  criterion: CriterionCardData;
  /** Selo avermelhado: o critério tem trechos marcados como problema na folha. */
  flagged?: boolean;
  /** Clicar em "Linhas A a B" destaca essas linhas na folha. */
  onShowLines?: () => void;
};

/** Um critério da correção: nível, pontos (nível × peso, calculados pelo backend), justificativa e o que corrigir. */
export function CriterionCard({ criterion, flagged = false, onShowLines }: CriterionCardProps) {
  const badgeClass = flagged ? styles.badge + " " + styles.badgeLost : styles.badge;

  return (
    <section className={styles.card} id={`criterio-${criterion.position}`} tabIndex={-1}>
      <div className={styles.header}>
        <span className={badgeClass}>{criterion.position}</span>
        <h3 className={styles.name}>{criterion.name}</h3>
        <span className={styles.points}>
          {criterion.points} <span className="muted">/ {criterion.maxPoints}</span>
        </span>
      </div>
      <div className={styles.level}>
        <Dots level={criterion.level} max={criterion.maxLevel} />
        <span className="muted">
          Nível {criterion.level} de {criterion.maxLevel} · peso {criterion.weight}
        </span>
      </div>
      <p className={`muted ${styles.descriptor}`}>“{criterion.descriptor}”</p>
      <p className={styles.justification}>{criterion.justification}</p>

      {criterion.deviations.length > 0 && (
        <ul className={styles.deviations}>
          {criterion.deviations.map((deviation) => (
            <li key={`${deviation.rule}-${deviation.line}`}>
              <span className={styles.rule}>
                {deviation.rule} · linha {deviation.line}
              </span>
              <span>{deviation.correction}</span>
            </li>
          ))}
        </ul>
      )}

      {onShowLines ? (
        <button type="button" className={`muted ${styles.lines}`} onClick={onShowLines}>
          {criterion.linesLabel}
        </button>
      ) : (
        <span className={`muted ${styles.lines}`}>{criterion.linesLabel}</span>
      )}

      {criterion.guidance && (
        <div className={styles.guidance}>
          <span>O que corrigir</span>
          <span>{criterion.guidance}</span>
        </div>
      )}
    </section>
  );
}

type ScoreSummaryProps = {
  score: number;
  maxScore: number;
  /** "+2 desde a 1ª versão" */
  delta?: string | null;
  strengths: string;
  mainIssue: string;
};

function SummaryCard({ tone, title, icon, children }: { tone: 'good' | 'issue'; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.summaryCard}>
      <span className={tone === 'good' ? styles.goodTitle : styles.issueTitle}>
        {icon}
        {title}
      </span>
      <p>{children}</p>
    </section>
  );
}

/** Resumo da correção: a nota da grade e os cartões "O que funcionou" e "O que mais tirou pontos". */
export function ScoreSummary({ score, maxScore, delta, strengths, mainIssue }: ScoreSummaryProps) {
  return (
    <div className={styles.summary}>
      <section className={`${styles.summaryCard} ${styles.scoreCard}`}>
        <span className={`muted ${styles.scoreLabel}`}>Nota da grade</span>
        <div>
          <span className={`serif ${styles.score}`}>{score}</span>
          <span className={`muted ${styles.maxScore}`}> / {maxScore}</span>
        </div>
        {delta && <span className={styles.delta}>{delta}</span>}
      </section>
      <SummaryCard tone="good" title="O que funcionou" icon={<CheckIcon color="#17603B" />}>
        {strengths}
      </SummaryCard>
      <SummaryCard
        tone="issue"
        title="O que mais tirou pontos"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3271E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        }
      >
        {mainIssue}
      </SummaryCard>
    </div>
  );
}
