import { useLayoutEffect, useRef, useState } from 'react';
import type { Progress } from '../../api/provisional-types';
import { formatDay } from '../../lib/format';
import styles from './DashboardPage.module.css';

type Point = Progress['points'][number];

/** Largura usada antes de medir o cartão (e nos testes, que não medem nada). */
const FALLBACK_WIDTH = 560;
const HEIGHT = 220;
/** Espaço da área de desenho: em cima para a nota do ponto mais alto, à esquerda para a escala, embaixo para as datas. */
const PAD = { top: 30, right: 16, bottom: 34, left: 36 };
/** Largura mínima reservada para cada data no eixo; abaixo disso, algumas datas somem. */
const DATE_SLOT = 52;

const BLUE = '#2346C9';
const RED = '#C2452D';
const INK = '#0E1B33';
const MUTED = '#56627A';

/**
 * Marcas da escala, de zero até o topo, em passos redondos (1, 2, 5 ou 10 vezes uma potência de 10) que dão de 3 a
 * 5 intervalos: 40 → 0, 10, 20, 30, 40. O topo é o primeiro múltiplo do passo que alcança o máximo.
 */
export function chartTicks(max: number): number[] {
  const safeMax = Math.max(1, max);
  const magnitude = 10 ** Math.floor(Math.log10(safeMax / 4));
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => safeMax / candidate <= 5) ?? 10 * magnitude;
  const top = Math.ceil(safeMax / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
}

/**
 * Quais datas aparecem no eixo: todas, se cabem; senão, uma a cada tantas, contando a partir da última, que sempre
 * aparece (é a correção mais recente).
 */
export function visibleDates(count: number, plotWidth: number): boolean[] {
  const fits = Math.max(1, Math.floor(plotWidth / DATE_SLOT));
  const every = Math.ceil(count / fits);
  return Array.from({ length: count }, (_, index) => (count - 1 - index) % every === 0);
}

/** Largura do elemento, acompanhando o redimensionamento; sem medição (testes), a largura padrão. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    const update = () => element.clientWidth > 0 && setWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * "Sua evolução": a nota de cada correção, da mais antiga para a mais recente, numa escala de zero à nota máxima da
 * grade. A última correção fica em destaque; nota zero aparece em vermelho. O desenho usa a largura real do cartão,
 * então o texto tem sempre o mesmo tamanho, no computador e no celular.
 */
export function ProgressChart({ points }: { points: Point[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const max = points.at(-1)?.maxScore ?? 40;
  const ticks = chartTicks(max);
  const top = ticks.at(-1)!;
  const plotWidth = width - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) => PAD.left + ((index + 0.5) * plotWidth) / points.length;
  const y = (score: number) => PAD.top + plotHeight - (Math.min(score, top) / top) * plotHeight;
  const dates = visibleDates(points.length, plotWidth);
  const last = points.length - 1;
  const hasZero = points.some((point) => point.score === 0);
  const label =
    points.length === 1
      ? `Nota da sua correção: ${points[0]!.score} de ${max}`
      : `Notas das últimas ${points.length} correções: ${points.map((point) => point.score).join(', ')} de ${max}`;

  return (
    <div ref={ref} className={styles.chartBox}>
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT} role="img" aria-label={label} className={styles.chart}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} y1={y(tick)} x2={width - PAD.right} y2={y(tick)} stroke={tick === 0 ? '#C9D2E3' : '#EDF1F7'} />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="12" fill={MUTED}>
              {tick}
            </text>
          </g>
        ))}

        {points.length > 1 && (
          <polyline
            points={points.map((point, index) => `${x(index)},${y(point.score)}`).join(' ')}
            fill="none"
            stroke={BLUE}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {points.map((point, index) => {
          const isLast = index === last;
          const isZero = point.score === 0;
          const color = isZero ? RED : BLUE;
          return (
            <g key={point.essayId}>
              <title>{`${formatDay(point.date)}: ${isZero ? 'nota zero' : `${point.score} de ${point.maxScore}`}`}</title>
              <circle
                cx={x(index)}
                cy={y(point.score)}
                r={isLast ? 6 : 4.5}
                fill={isLast ? color : '#FFFFFF'}
                stroke={color}
                strokeWidth="2.5"
              />
              <text
                x={x(index)}
                y={y(point.score) - (isLast ? 13 : 11)}
                textAnchor="middle"
                fontSize={isLast ? 15 : 12.5}
                fontWeight={isLast ? 700 : 600}
                fill={isZero ? RED : INK}
                stroke="#FFFFFF"
                strokeWidth="4"
                paintOrder="stroke"
              >
                {point.score}
              </text>
              {dates[index] && (
                <text x={x(index)} y={HEIGHT - 10} textAnchor="middle" fontSize="12" fontWeight={isLast ? 600 : 400} fill={isLast ? INK : MUTED}>
                  {formatDay(point.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className={styles.chartNote}>
        Nota de 0 a {max} em cada correção, da mais antiga para a mais recente.
        {hasZero && (
          <>
            {' '}
            <span className={styles.zeroKey}>Em vermelho, nota zero.</span>
          </>
        )}
      </p>
    </div>
  );
}
