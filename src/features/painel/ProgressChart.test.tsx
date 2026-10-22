import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressChart, chartTicks, visibleDates } from './ProgressChart';

const point = (index: number, score: number) => ({ essayId: `e${index}`, date: `2026-09-${String(index + 1).padStart(2, '0')}T15:00:00Z`, score, maxScore: 40 });

describe('Escala do gráfico de evolução', () => {
  it('vai de zero ao máximo da grade em passos redondos', () => {
    expect(chartTicks(40)).toEqual([0, 10, 20, 30, 40]);
    expect(chartTicks(30)).toEqual([0, 10, 20, 30]);
    expect(chartTicks(12)).toEqual([0, 5, 10, 15]);
    expect(chartTicks(100)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('mostra todas as datas quando cabem e, quando não, uma a cada tantas, sempre com a última', () => {
    expect(visibleDates(4, 500)).toEqual([true, true, true, true]);
    // 9 pontos em 250 px cabem 4 datas: uma a cada 3, contando da última.
    expect(visibleDates(9, 250)).toEqual([false, false, true, false, false, true, false, false, true]);
    expect(visibleDates(1, 50)).toEqual([true]);
  });
});

describe('Gráfico de evolução', () => {
  it('desenha cada nota acima do ponto, a nota zero em vermelho e explica a escala', () => {
    const { container } = render(<ProgressChart points={[point(0, 21), point(1, 0), point(2, 23)]} />);

    expect(screen.getByRole('img', { name: 'Notas das últimas 3 correções: 21, 0, 23 de 40' })).toBeInTheDocument();
    expect([...container.querySelectorAll('text[text-anchor="end"]')].map((text) => text.textContent)).toEqual(['0', '10', '20', '30', '40']);
    const zero = [...container.querySelectorAll('circle')][1]!;
    expect(zero).toHaveAttribute('stroke', '#C2452D');
    expect(container.querySelector('title')).toHaveTextContent('01/09: 21 de 40');
    expect(screen.getByText(/Nota de 0 a 40 em cada correção/)).toHaveTextContent('Em vermelho, nota zero.');
  });

  it('nenhum ponto sai da área do desenho, nem a nota zero', () => {
    const { container } = render(<ProgressChart points={[point(0, 40), point(1, 0)]} />);
    const svg = container.querySelector('svg')!;
    const height = Number(svg.getAttribute('height'));

    for (const circle of container.querySelectorAll('circle')) {
      const cy = Number(circle.getAttribute('cy'));
      expect(cy).toBeGreaterThan(20);
      // A faixa das datas fica abaixo do ponto mais baixo.
      expect(cy).toBeLessThan(height - 30);
    }
    expect(screen.queryByText(/Em vermelho/)).toBeInTheDocument();
  });

  it('sem nota zero, não fala em vermelho', () => {
    render(<ProgressChart points={[point(0, 21)]} />);

    expect(screen.getByRole('img', { name: 'Nota da sua correção: 21 de 40' })).toBeInTheDocument();
    expect(screen.queryByText(/Em vermelho/)).not.toBeInTheDocument();
  });
});
