import type { Annotation } from '../../api/provisional-types';
import styles from './CorrectionPage.module.css';

export function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(' ');
}

/** Medidor de níveis: um segmento por nível da grade, preenchidos até o nível atingido. */
export function Meter({ level, max, large = false }: { level: number; max: number; large?: boolean }) {
  return (
    <span className={cx(styles.meter, large && styles.meterLarge)} aria-hidden="true">
      {Array.from({ length: max }, (_, index) => (
        <i key={index} className={index < level ? styles.filled : undefined} />
      ))}
    </span>
  );
}

type CriterionNumberProps = {
  position: number;
  bad?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
};

/** Número do critério num quadrado; avermelhado quando o critério pesou contra a nota. */
export function CriterionNumber({ position, bad = false, size = 'medium', className }: CriterionNumberProps) {
  return (
    <span
      className={cx(
        styles.number,
        bad && styles.numberBad,
        size === 'small' && styles.numberSmall,
        size === 'large' && styles.numberLarge,
        className,
      )}
      title={`Critério ${position}`}
    >
      {position}
    </span>
  );
}

/** Número do apontamento, só como desenho: vermelho tirou pontos, verde funcionou. */
export function PinMark({ id, kind }: Pick<Annotation, 'id' | 'kind'>) {
  return (
    <span className={cx(styles.pin, kind === 'good' && styles.pinGood)} aria-hidden="true">
      {id}
    </span>
  );
}

/** A grade pinta o número do critério de vermelho a partir desta perda (docs/06-tela-correcao.md, seção 3). */
export const HEAVY_LOSS = 6;
