import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Schemas } from '../../lib/api';
import { PromptBlocks } from './ProposalPage';

type Block = Schemas['PromptBlockPublicDto'];

const text = (position: number, label: string, body: string, extra: Partial<Block['data']> = {}): Block => ({
  position,
  kind: 'collection_item',
  data: { label, format: 'prose', source: 'Texto elaborado pela equipe RedigiAI.', body, ...extra },
});

const sectionOf = (content: string) => screen.getByText(content).closest('section')!;

describe('Textos da coletânea', () => {
  it('dois textos seguidos com metade da largura ficam na mesma linha; um de metade sem par ocupa a linha inteira', () => {
    const { container } = render(
      <PromptBlocks
        genre="Dissertação em prosa"
        blocks={[
          text(10, 'Texto 1', 'Primeiro.', { width: 'half' }),
          text(20, 'Texto 2', 'Segundo.', { width: 'half' }),
          text(30, 'Texto 3', 'Terceiro.'),
          text(40, 'Texto 4', 'Quarto.', { width: 'half' }),
        ]}
      />,
    );
    const root = container.firstElementChild!;

    const pair = sectionOf('Primeiro.').parentElement!;
    expect(pair).not.toBe(root);
    expect(sectionOf('Segundo.').parentElement).toBe(pair);
    expect(pair.parentElement).toBe(root);
    expect(sectionOf('Terceiro.').parentElement).toBe(root);
    expect(sectionOf('Quarto.').parentElement).toBe(root);
  });

  it('o rótulo escondido não aparece, e as notas ficam entre o texto e a fonte', () => {
    render(
      <PromptBlocks
        genre="Dissertação em prosa"
        blocks={[
          text(10, 'Texto 1', 'Sem número na prova.', { hideLabel: true, notes: ['* *Sapere aude*: ousa saber.'] }),
          text(20, 'Texto 2', 'Com número.'),
        ]}
      />,
    );

    expect(screen.queryByText('Texto 1:')).not.toBeInTheDocument();
    expect(screen.getByText('Texto 2:')).toBeInTheDocument();
    const section = sectionOf('Sem número na prova.');
    const note = screen.getByText(/ousa saber/).closest('li')!;
    expect(section).toContainElement(note);
    const order = [...section.querySelectorAll('p, ul')].map((element) => element.tagName);
    expect(order).toEqual(['P', 'UL', 'P']);
  });
});
