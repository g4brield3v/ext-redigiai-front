import { useState } from 'react';
import { Chip } from '../../components/primitives';
import { PromptBlocks } from '../proposta/ProposalPage';
import styles from './Admin.module.css';
import { useEssayTypes } from './adminApi';
import { toPreviewBlocks } from './editorState';
import type { EditorPrompt } from './editorState';

/** Largura em que a página do aluno é desenhada dentro da prévia, em cada modo. */
const WIDTH = { desktop: 752, mobile: 340 } as const;
/** Espaço útil do painel da prévia (420 px menos as margens). */
const PANEL = 376;

/**
 * A proposta como o aluno vê, com os mesmos componentes da página dele, atualizada a cada tecla. No modo
 * "Computador" a página é desenhada na largura de leitura e reduzida para caber no painel; no modo "Celular",
 * em tamanho real.
 */
export function PromptPreview({ prompt, examName }: { prompt: EditorPrompt; examName: string }) {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const collection = prompt.blocks.filter((block) => block.kind === 'collection_item').length;
  // O tipo de redação é o nome da categoria escolhida.
  const genre = useEssayTypes(prompt.exam).data?.find((type) => type.slug === prompt.essayType)?.name ?? '';
  const zoom = Math.min(1, PANEL / WIDTH[mode]);

  return (
    <aside className={styles.preview} aria-label="Prévia da proposta">
      <div className={styles.previewHead}>
        Prévia · como o aluno vê
        <span>
          <button type="button" className={styles.modeButton} aria-pressed={mode === 'desktop'} onClick={() => setMode('desktop')}>
            Computador
          </button>
          <button type="button" className={styles.modeButton} aria-pressed={mode === 'mobile'} onClick={() => setMode('mobile')}>
            Celular
          </button>
        </span>
      </div>
      <div className={styles.previewBody}>
        <div className={mode === 'mobile' ? `${styles.previewPage} ${styles.previewMobile}` : styles.previewPage} style={{ width: WIDTH[mode], zoom }}>
          <span className="eyebrow">Proposta de redação · {examName}</span>
          <h3 className="serif">{prompt.title || 'Título da proposta'}</h3>
          <div className={styles.previewChips}>
            {genre && <Chip>{genre}</Chip>}
            <Chip>
              Coletânea com {collection} {collection === 1 ? 'texto' : 'textos'}
            </Chip>
          </div>
          <PromptBlocks blocks={toPreviewBlocks(prompt)} genre={genre || 'tipo de redação'} />
          <span className={styles.previewSend}>Enviar minha redação</span>
        </div>
      </div>
    </aside>
  );
}
