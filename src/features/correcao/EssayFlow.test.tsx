import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TranscriptionLine } from '../../api/provisional-types';
import { EssayFlow } from './EssayFlow';
import { visibleAnnotations } from './annotations';
import { exampleCorrection as correction } from './example';

const pin = (id: number) => screen.getByRole('button', { name: new RegExp(`^Apontamento ${id}:`) });

/** O texto como o aluno lê, sem os números das linhas (que são só marcação visual, escondidos do leitor de tela). */
function readableText(element: Element) {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
  return copy.textContent;
}

/** 14 linhas em dois parágrafos: o recuo está nas linhas 1 e 8. */
function twoParagraphs(): TranscriptionLine[] {
  return Array.from({ length: 14 }, (_, index) => ({ number: index + 1, text: `linha ${index + 1}`, indent: index === 0 || index === 7 }));
}

describe('EssayFlow (redação em texto corrido)', () => {
  it('monta os parágrafos pelo recuo, com o parágrafo e o intervalo de linhas na margem', () => {
    const { container } = render(<EssayFlow lines={twoParagraphs()} annotations={[]} selectedId={null} onSelect={vi.fn()} />);

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect([...paragraphs[0]!.querySelectorAll('[data-line]')].map((line) => line.getAttribute('data-line'))).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect([...paragraphs[1]!.querySelectorAll('[data-line]')].map((line) => line.getAttribute('data-line'))).toEqual(['8', '9', '10', '11', '12', '13', '14']);
    const margins = [...container.querySelectorAll('.flowMargin')].map((margin) => [...margin.children].map((item) => item.textContent));
    expect(margins).toEqual([['§1', '1–7'], ['§2', '8–14']]);
    // A margem é só visual.
    expect(container.querySelector('.flowMargin')).toHaveAttribute('aria-hidden', 'true');
  });

  it('a primeira linha abre o primeiro parágrafo mesmo sem recuo', () => {
    const lines = twoParagraphs().map((line) => ({ ...line, indent: line.number === 8 }));
    const { container } = render(<EssayFlow lines={lines} annotations={[]} selectedId={null} onSelect={vi.fn()} />);

    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('cada linha aparece uma vez, com o texto completo, e o parágrafo é a junção das linhas com espaço', () => {
    const long = 'A tecnologia digital mudou a forma como as pessoas se informam e participam do debate público hoje.';
    expect(long.length).toBeGreaterThanOrEqual(95);
    const lines = [
      { number: 1, text: long, indent: true },
      { number: 2, text: 'Segunda linha do parágrafo.', indent: false },
      { number: 3, text: 'Terceira.', indent: false },
    ];
    const { container } = render(<EssayFlow lines={lines} annotations={[]} selectedId={null} onSelect={vi.fn()} />);

    for (const line of lines) {
      const spans = container.querySelectorAll(`[data-line="${line.number}"]`);
      expect(spans).toHaveLength(1);
      expect(readableText(spans[0]!)).toBe(line.text);
      expect(spans[0]).toHaveAttribute('title', `Linha ${line.number}`);
    }
    expect(readableText(container.querySelector('p')!)).toBe(lines.map((line) => line.text).join(' '));
  });

  it('linha terminada em hífen se junta à seguinte sem espaço, e o hífen continua no texto', () => {
    const lines = [
      { number: 1, text: 'O debate sobre a demo-', indent: true },
      { number: 2, text: 'cracia digital continua.', indent: false },
    ];
    const { container } = render(<EssayFlow lines={lines} annotations={[]} selectedId={null} onSelect={vi.fn()} />);

    expect(readableText(container.querySelector('p')!)).toBe('O debate sobre a demo-cracia digital continua.');
  });

  it('o trecho que atravessa linhas é marcado nas duas, com um único número no fim, e as linhas ficam destacadas', async () => {
    const onSelect = vi.fn();
    const { container } = render(<EssayFlow lines={correction.lines} annotations={correction.annotations} selectedId={4} onSelect={onSelect} />);

    const spans = container.querySelectorAll('[data-annotation="4"]');
    expect([...spans].map((span) => span.closest('[data-line]')?.getAttribute('data-line'))).toEqual(['10', '11']);
    expect(screen.getAllByRole('button', { name: 'Apontamento 4: tirou pontos, critério 3' })).toHaveLength(1);
    expect(pin(4)).toHaveAttribute('aria-pressed', 'true');
    expect([...container.querySelectorAll('.flowLineSelected')].map((line) => line.getAttribute('data-line'))).toEqual(['10', '11']);
    expect(container.querySelectorAll('.flowLineNumberSelected')).toHaveLength(2);

    await userEvent.click(pin(6));
    await userEvent.click(spans[0]!);
    expect(onSelect.mock.calls).toEqual([[6], [4]]);
  });

  it('apontamento escondido pelo filtro vira texto comum', () => {
    const visible = visibleAnnotations(correction.annotations, { kind: 'good', criterion: null });
    const { container } = render(<EssayFlow lines={correction.lines} annotations={visible} selectedId={null} onSelect={vi.fn()} />);

    expect(container.querySelector('[data-annotation="4"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Apontamento 4:/ })).toBeNull();
    expect(readableText(container.querySelector('[data-line="10"]')!)).toBe(correction.lines[9]!.text);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('os números das linhas ficam fora do nome acessível dos números dos apontamentos', () => {
    const { container } = render(<EssayFlow lines={correction.lines} annotations={correction.annotations} selectedId={null} onSelect={vi.fn()} />);

    const numbers = container.querySelectorAll('.flowLineNumber');
    expect(numbers).toHaveLength(correction.lines.length);
    numbers.forEach((number) => expect(number).toHaveAttribute('aria-hidden', 'true'));
    expect(pin(4)).toHaveAccessibleName('Apontamento 4: tirou pontos, critério 3');
    expect(pin(1)).toHaveAccessibleName('Apontamento 1: funcionou, critério 1');
  });
});
