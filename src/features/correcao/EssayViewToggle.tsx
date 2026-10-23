import { useState } from 'react';
import styles from './CorrectionPage.module.css';

export type EssayView = 'flow' | 'sheet';

const storageKey = 'redigiai:essay-view';

const labels: Record<EssayView, string> = { flow: 'Texto corrido', sheet: 'Como na folha' };

function readView(): EssayView {
  try {
    return window.localStorage.getItem(storageKey) === 'sheet' ? 'sheet' : 'flow';
  } catch {
    return 'flow';
  }
}

function saveView(view: EssayView) {
  try {
    window.localStorage.setItem(storageKey, view);
  } catch {
    // Navegação privada ou armazenamento cheio: a escolha só não fica guardada.
  }
}

/** Como mostrar a redação na correção. Padrão: texto corrido; a escolha fica guardada neste navegador. */
export function useEssayView() {
  const [view, setView] = useState<EssayView>(readView);
  const choose = (next: EssayView) => {
    setView(next);
    saveView(next);
  };
  return [view, choose] as const;
}

/** Controle segmentado com os dois modos. */
export function EssayViewToggle({ view, onChange }: { view: EssayView; onChange: (view: EssayView) => void }) {
  return (
    <div className={styles.viewToggle} role="group" aria-label="Como mostrar a redação">
      {(Object.keys(labels) as EssayView[]).map((option) => (
        <button key={option} type="button" aria-pressed={view === option} onClick={() => onChange(option)}>
          {labels[option]}
        </button>
      ))}
    </div>
  );
}
