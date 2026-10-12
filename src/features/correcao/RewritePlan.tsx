import { useState } from 'react';
import type { CorrectionPoint } from '../../api/provisional-types';
import { Button } from '../../components/Button';
import styles from './CorrectionPage.module.css';
import { cx } from './parts';

const storageKey = (correctionId: string) => `redigiai.plano.${correctionId}`;

/** Os passos marcados ficam no navegador, por correção. Sem armazenamento, a tela funciona igual. */
function readChecked(correctionId: string): number[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(storageKey(correctionId)) ?? '[]');
    return Array.isArray(saved) ? saved.filter((item): item is number => typeof item === 'number') : [];
  } catch {
    return [];
  }
}

function saveChecked(correctionId: string, checked: number[]) {
  try {
    window.localStorage.setItem(storageKey(correctionId), JSON.stringify(checked));
  } catch {
    // Navegação privada ou armazenamento cheio: os passos só não ficam guardados.
  }
}

const titles = ['Um passo para aumentar a nota', 'Dois passos, na ordem que mais aumenta a nota', 'Três passos, na ordem que mais aumenta a nota'];

type RewritePlanProps = {
  correctionId: string;
  /** Já na ordem do maior ganho para o menor, como a API devolve. */
  steps: CorrectionPoint[];
  /** Nota zero: outro título e nenhum "até +X pontos". */
  zero?: boolean;
  rewriteTo: string;
  rewriteLabel: string;
};

/** Plano de reescrita: até 3 passos para marcar, com os pontos que cada um pode render. */
export function RewritePlan({ correctionId, steps, zero = false, rewriteTo, rewriteLabel }: RewritePlanProps) {
  const [checked, setChecked] = useState(() => readChecked(correctionId));

  function toggle(index: number) {
    const next = checked.includes(index) ? checked.filter((item) => item !== index) : [...checked, index];
    setChecked(next);
    saveChecked(correctionId, next);
  }

  return (
    <div className={styles.plan}>
      <div className={styles.planSteps}>
        <div className={styles.planHead}>
          <span className={cx(styles.eyebrow, styles.planEyebrow)}>Plano de reescrita</span>
          <h2 className={cx('serif', styles.h2, styles.planTitle)}>
            {zero ? 'Como fazer a nova redação' : (titles[steps.length - 1] ?? titles[2])}
          </h2>
        </div>
        {steps.map((step, index) => (
          <label key={index} className={styles.todo}>
            <input type="checkbox" checked={checked.includes(index)} onChange={() => toggle(index)} />
            <span className={styles.todoBody}>
              <span className={styles.todoTop}>
                <span className={styles.stepNumber}>Passo {index + 1}</span>
                {!zero && step.potentialGain !== null && step.potentialGain > 0 && (
                  <span className={styles.gain}>até +{step.potentialGain} {step.potentialGain === 1 ? 'ponto' : 'pontos'}</span>
                )}
              </span>
              <span className={styles.todoText}>{step.text}</span>
            </span>
          </label>
        ))}
      </div>
      <div className={styles.planAside}>
        <span className={styles.planAsideTitle}>Reescreva com o plano ao lado</span>
        <span className={styles.planAsideText}>
          A reescrita é corrigida como uma nova versão, e você vê a evolução da nota entre as duas.
        </span>
        <Button to={rewriteTo} variant="inverse">
          {rewriteLabel}
        </Button>
        <span className={styles.planHint}>Marque os passos para lembrar o que já resolveu.</span>
      </div>
    </div>
  );
}
