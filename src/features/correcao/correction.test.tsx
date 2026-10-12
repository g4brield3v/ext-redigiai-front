import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/helpers';
import { AnnotationPanel } from './AnnotationPanel';
import { CorrectionView } from './CorrectionPage';
import { CriterionCard } from './CriterionCard';
import { EssayLines } from './EssayLines';
import { ResultSummary, ScoreMap } from './ResultSummary';
import { RewritePlan } from './RewritePlan';
import { ZeroResult } from './ZeroResult';
import { linePieces, linesLabel, noFilters, shortQuote, startingAnnotation, stepAnnotation, visibleAnnotations } from './annotations';
import type { Filters } from './annotations';
import { exampleCorrection as correction, exampleZeroCorrection as zeroCorrection } from './example';

const card = (id: number) => document.querySelector<HTMLElement>(`[data-annotation-card="${id}"]`)!;
const pin = (id: number) => screen.getByRole('button', { name: new RegExp(`^Apontamento ${id}:`) });
const shownCards = () => [...document.querySelectorAll('[data-annotation-card]')].map((element) => Number(element.getAttribute('data-annotation-card')));

describe('Apontamentos', () => {
  it('um trecho que atravessa linhas vira um pedaço em cada linha, com o número só no fim', () => {
    const [first, second] = [correction.lines[9]!, correction.lines[10]!];

    const onFirst = linePieces(first, correction.annotations);
    expect(onFirst).toHaveLength(1);
    expect(onFirst[0]).toMatchObject({ text: first.text, pin: false });
    expect(onFirst[0]!.annotation?.id).toBe(4);

    const onSecond = linePieces(second, correction.annotations);
    expect(onSecond.map((piece) => piece.text)).toEqual(['veem, e cada uma recebe só aquilo que gera mais engajamento.', ' Assim,']);
    expect(onSecond[0]).toMatchObject({ pin: true });
    expect(onSecond[1]!.annotation).toBeUndefined();
  });

  it('o texto da linha nunca se perde ao dividir', () => {
    for (const line of correction.lines) {
      expect(linePieces(line, correction.annotations).map((piece) => piece.text).join('')).toBe(line.text);
    }
  });

  it('descreve as linhas e encurta o trecho longo no fim de uma palavra', () => {
    expect(linesLabel({ lineStart: 4, lineEnd: 4 })).toBe('Linha 4');
    expect(linesLabel({ lineStart: 3, lineEnd: 4 })).toBe('Linhas 3 e 4');
    expect(linesLabel({ lineStart: 14, lineEnd: 16 })).toBe('Linhas 14 a 16');
    expect(shortQuote('À partir')).toBe('À partir');
    expect(shortQuote(correction.annotations[3]!.quote)).toBe('Além disso, os algoritmos também escolhem o que as pessoas veem…');
  });

  it('Anterior e Próximo dão a volta nos apontamentos visíveis', () => {
    const writing = visibleAnnotations(correction.annotations, { kind: 'issue', criterion: 4 });
    expect(writing.map((annotation) => annotation.id)).toEqual([2, 5, 6]);
    expect(stepAnnotation(writing, 6, 1)).toBe(2);
    expect(stepAnnotation(writing, 2, -1)).toBe(6);
    expect(stepAnnotation(writing, 4, 1)).toBe(2);
    expect(stepAnnotation([], 4, 1)).toBeNull();
  });

  it('começa pelo primeiro "tirou pontos" do critério do problema principal, ou de qualquer critério', () => {
    expect(startingAnnotation(correction)).toBe(4);
    expect(startingAnnotation({ ...correction, mainIssue: { ...correction.mainIssue, criterion: 1 } })).toBe(2);
    expect(startingAnnotation(zeroCorrection)).toBe(1);
    expect(startingAnnotation({ ...correction, annotations: [] })).toBeNull();
  });
});

describe('ResultSummary', () => {
  it('mostra a nota, a variação e um único "Comece por aqui", com os números que vieram da API', async () => {
    const onShowInText = vi.fn();
    render(<ResultSummary correction={{ ...correction, score: 17 }} onShowCriterion={vi.fn()} onShowInText={onShowInText} />);

    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('+4 desde a 1ª versão')).toBeInTheDocument();
    expect(screen.getByText(correction.mainIssue.text)).toBeInTheDocument();
    expect(screen.getByText('Coesão e progressão · vale até +6 pontos')).toBeInTheDocument();
    expect(screen.getByText('✓ Mantenha:').parentElement).toHaveTextContent(correction.strengths);

    await userEvent.click(screen.getByRole('button', { name: 'Ver no texto' }));
    expect(onShowInText).toHaveBeenCalledOnce();
  });

  it('na primeira versão não há variação; correção antiga não tem critério nem ganho', () => {
    render(
      <ResultSummary
        correction={{ ...correction, scoreDelta: null, previousVersion: null, mainIssue: { text: 'Reveja a tese.', criterion: null, potentialGain: null } }}
        onShowCriterion={vi.fn()}
        onShowInText={vi.fn()}
      />,
    );

    expect(screen.queryByText(/desde a/)).toBeNull();
    expect(screen.queryByText(/vale até/)).toBeNull();
    expect(screen.getByText('Reveja a tese.')).toBeInTheDocument();
  });
});

describe('ScoreMap', () => {
  it('lista cada critério com pontos e perda, sem recalcular, e leva ao critério', async () => {
    const onShowCriterion = vi.fn();
    // Pontos de propósito diferentes de nível × peso: a tela exibe o que o backend mandou.
    const criteria = correction.criteria.map((criterion, index) =>
      index === 0 ? { ...criterion, points: 2, pointsLost: 0 } : criterion,
    );
    render(<ScoreMap criteria={criteria} maxLevel={4} onShowCriterion={onShowCriterion} />);

    const rows = screen.getAllByRole('link');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('Tema e autoria');
    expect(rows[0]).toHaveTextContent('2 / 12');
    expect(rows[0]).toHaveTextContent('máx.');
    expect(rows[2]).toHaveTextContent('6 / 12');
    expect(rows[2]).toHaveTextContent('−6');

    await userEvent.click(rows[2]!);
    expect(onShowCriterion).toHaveBeenCalledWith(3);
  });
});

describe('EssayLines', () => {
  it('marca o trecho em todas as linhas que ele atravessa e põe um botão numerado no fim', async () => {
    const onSelect = vi.fn();
    const { container } = render(<EssayLines lines={correction.lines} annotations={correction.annotations} selectedId={4} onSelect={onSelect} />);

    const spans = container.querySelectorAll('[data-annotation="4"]');
    expect([...spans].map((span) => span.closest('[data-line]')?.getAttribute('data-line'))).toEqual(['10', '11']);
    expect(screen.getAllByRole('button', { name: 'Apontamento 4: tirou pontos, critério 3' })).toHaveLength(1);
    expect(pin(4)).toHaveAttribute('aria-pressed', 'true');
    expect(pin(1)).toHaveAccessibleName('Apontamento 1: funcionou, critério 1');
    // A seleção não depende só da cor: as duas linhas do trecho ficam destacadas.
    expect(container.querySelectorAll('.lineSelected')).toHaveLength(2);

    await userEvent.click(pin(6));
    await userEvent.click(spans[0]!);
    expect(onSelect.mock.calls).toEqual([[6], [4]]);
  });

  it('mantém o recuo de parágrafo e o texto inteiro de uma linha longa', () => {
    const long = 'palavra '.repeat(40).trim();
    const { container } = render(
      <EssayLines lines={[{ number: 1, text: long, indent: true }, { number: 2, text: 'fim', indent: false }]} annotations={[]} selectedId={null} onSelect={vi.fn()} />,
    );

    const first = container.querySelector('[data-line="1"]')!;
    expect(first).toHaveClass('lineText', 'paragraph');
    expect(first.textContent).toBe(long);
    expect(container.querySelector('[data-line="2"]')).not.toHaveClass('paragraph');
  });

  it('apontamento escondido pelo filtro vira texto comum', () => {
    const visible = visibleAnnotations(correction.annotations, { kind: 'good', criterion: null });
    const { container } = render(<EssayLines lines={correction.lines} annotations={visible} selectedId={null} onSelect={vi.fn()} />);

    expect(container.querySelector('[data-annotation="4"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Apontamento 4:/ })).toBeNull();
    expect(container.querySelector('[data-line="10"]')!.textContent).toBe(correction.lines[9]!.text);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});

function Panel() {
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [selectedId, setSelectedId] = useState<number | null>(4);
  return (
    <AnnotationPanel
      annotations={correction.annotations}
      criteria={correction.criteria}
      filters={filters}
      onFilters={setFilters}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onStep={(delta) => setSelectedId(stepAnnotation(visibleAnnotations(correction.annotations, filters), selectedId, delta))}
    />
  );
}

describe('AnnotationPanel', () => {
  it('lista os cartões em ordem de linha, com trecho, regra, explicação e a forma correta', () => {
    render(<Panel />);

    expect(shownCards()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(card(4)).toHaveAttribute('aria-pressed', 'true');
    expect(card(4)).toHaveTextContent('↓ Tirou pontos');
    expect(card(4)).toHaveTextContent('Linhas 10 e 11');
    expect(card(6)).toHaveTextContent('Regra: Crase antes de verbo');
    expect(within(card(6)).getByText('À partir').tagName).toBe('S');
    expect(within(card(6)).getByText('Escreva').parentElement).toHaveTextContent('A partir');
    expect(card(1)).toHaveTextContent('✓ Funcionou');
    expect(within(card(1)).queryByText('Escreva')).toBeNull();
  });

  it('filtra por tipo e por critério, e clicar de novo no critério desliga o filtro', async () => {
    render(<Panel />);
    const kinds = within(screen.getByRole('group', { name: 'Filtrar apontamentos' }));
    const criteria = within(screen.getByRole('group', { name: 'Filtrar por critério' }));

    await userEvent.click(kinds.getByRole('button', { name: /Tiraram pontos/ }));
    expect(shownCards()).toEqual([2, 4, 5, 6, 8]);
    expect(kinds.getByRole('button', { name: /Tiraram pontos/ })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(criteria.getByRole('button', { name: /Escrita e vocabulário/ }));
    expect(shownCards()).toEqual([2, 5, 6]);
    expect(screen.getByText('de 3 apontamentos')).toBeInTheDocument();

    await userEvent.click(criteria.getByRole('button', { name: /Escrita e vocabulário/ }));
    expect(shownCards()).toEqual([2, 4, 5, 6, 8]);

    await userEvent.click(kinds.getByRole('button', { name: /Funcionaram/ }));
    await userEvent.click(criteria.getByRole('button', { name: /Tipo e gênero/ }));
    expect(screen.getByText('Nenhum apontamento com esses filtros.')).toBeInTheDocument();
  });

  it('Próximo depois do último volta ao primeiro', async () => {
    render(<Panel />);

    for (let clicks = 0; clicks < 4; clicks++) {
      await userEvent.click(screen.getByRole('button', { name: 'Próximo →' }));
    }
    expect(card(8)).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Próximo →' }));
    expect(card(1)).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: '← Anterior' }));
    expect(card(8)).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('CriterionCard', () => {
  const props = { maxLevel: 4, annotations: correction.annotations, onShowInText: vi.fn() };

  it('mostra o nível atual ao lado do que a grade pede para o próximo', async () => {
    const onShowInText = vi.fn();
    render(<CriterionCard {...props} criterion={correction.criteria[2]!} onShowInText={onShowInText} />);

    expect(screen.getByRole('heading', { name: 'Coesão e progressão' })).toBeInTheDocument();
    expect(screen.getByText('Recursos linguísticos (coesão e coerência) e progressão textual · peso 3')).toBeInTheDocument();
    expect(screen.getByText('−6 pontos')).toBeInTheDocument();
    expect(screen.getByText('Nível 2 de 4')).toBeInTheDocument();
    expect(screen.getByText('Seu nível').parentElement).toHaveTextContent('Articulação satisfatória');
    expect(screen.getByText('Para chegar ao nível 3').parentElement).toHaveTextContent('Boa articulação');
    expect(screen.getByText('O que corrigir').parentElement).toHaveTextContent('Troque o parágrafo das linhas 10 a 12');

    await userEvent.click(screen.getByRole('button', { name: 'Ver 2 apontamentos no texto →' }));
    expect(onShowInText).toHaveBeenCalledWith(3);
  });

  it('no nível máximo não há próximo nível nem o que corrigir', () => {
    const top = { ...correction.criteria[1]!, level: 4, points: 8, pointsLost: 0, nextDescriptor: null, guidance: null, annotationIds: [] };
    render(<CriterionCard {...props} criterion={top} />);

    expect(screen.getByText('Nota máxima')).toBeInTheDocument();
    expect(screen.getByText('Nível 4 de 4')).toBeInTheDocument();
    expect(screen.queryByText(/Para chegar ao nível/)).toBeNull();
    expect(screen.queryByText('O que corrigir')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('no critério de escrita, lista os desvios por regra com a forma correta', () => {
    render(<CriterionCard {...props} criterion={correction.criteria[3]!} />);

    const deviations = screen.getAllByRole('listitem');
    expect(deviations).toHaveLength(3);
    expect(deviations[0]).toHaveTextContent('Vírgula entre sujeito e verbo · linha 4');
    expect(deviations[0]).toHaveTextContent('Escreva “Esse dado revela” no lugar de “Esse dado, revela”.');
    expect(deviations[2]).toHaveTextContent('Crase antes de verbo · linha 13');
    expect(deviations[2]).toHaveTextContent('Escreva “A partir” no lugar de “À partir”.');
    expect(screen.getByText('O que corrigir · desvios por regra')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver 3 apontamentos no texto →' })).toBeInTheDocument();
  });
});

describe('RewritePlan', () => {
  const props = { correctionId: 'plano-teste', steps: correction.nextSteps, rewriteTo: '/propostas/t/enviar', rewriteLabel: 'Reescrever esta redação' };

  it('mostra os passos com o ganho de cada um e guarda os marcados no navegador', async () => {
    window.localStorage.clear();
    const { unmount } = renderApp(<RewritePlan {...props} />);

    expect(screen.getByRole('heading', { name: 'Três passos, na ordem que mais aumenta a nota' })).toBeInTheDocument();
    expect(screen.getAllByText(/^até \+\d+ pontos$/).map((gain) => gain.textContent)).toEqual(['até +6 pontos', 'até +3 pontos', 'até +2 pontos']);
    expect(screen.getByRole('link', { name: 'Reescrever esta redação' })).toHaveAttribute('href', '/propostas/t/enviar');

    await userEvent.click(screen.getByRole('checkbox', { name: /Passo 2/ }));
    unmount();

    renderApp(<RewritePlan {...props} />);
    expect(screen.getByRole('checkbox', { name: /Passo 2/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Passo 1/ })).not.toBeChecked();
    // Outra correção tem a sua própria lista.
    renderApp(<RewritePlan {...props} correctionId="outra" steps={correction.nextSteps.slice(0, 1)} />);
    expect(screen.getAllByRole('checkbox', { name: /Passo 1/ }).at(-1)).not.toBeChecked();
  });

  it('sem armazenamento no navegador, funciona igual', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderApp(<RewritePlan {...props} />);

    await userEvent.click(screen.getByRole('checkbox', { name: /Passo 1/ }));
    expect(screen.getByRole('checkbox', { name: /Passo 1/ })).toBeChecked();
    vi.restoreAllMocks();
  });

  it('na nota zero, muda o título e não mostra pontos', () => {
    renderApp(<RewritePlan {...props} steps={zeroCorrection.nextSteps} zero />);

    expect(screen.getByRole('heading', { name: 'Como fazer a nova redação' })).toBeInTheDocument();
    expect(screen.queryByText(/até \+/)).toBeNull();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });
});

describe('ZeroResult', () => {
  it('destaca o motivo e a regra, e o que funcionou vira "Aproveite"', () => {
    renderApp(<ZeroResult correction={zeroCorrection} proposalTo="/propostas/algoritmos-e-o-debate-publico?versao=1" />);

    expect(screen.getByText('Nota zero')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Não abordagem (compreensão e desenvolvimento) do tema proposto.' })).toBeInTheDocument();
    expect(screen.getByText(zeroCorrection.zero.explanation!)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Regra da Fuvest: texto que não aborda o tema recebe nota zero, e os quatro critérios não são pontuados. Isso é diferente de tangenciar o tema, que só reduz o nível do critério 1.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reler a proposta' })).toHaveAttribute('href', '/propostas/algoritmos-e-o-debate-publico?versao=1');
    expect(screen.getByText('✓ Aproveite:').parentElement).toHaveTextContent(zeroCorrection.strengths);
    expect(screen.queryByText('✓ Mantenha:')).toBeNull();
  });
});

describe('Tela da correção', () => {
  const back = { to: '/painel', label: 'Minhas correções' };
  const panel = () => within(screen.getByRole('complementary', { name: 'Apontamentos' }));

  it('abre com o apontamento do "Comece por aqui" selecionado, e folha e painel selecionam juntos', async () => {
    renderApp(<CorrectionView correction={correction} back={back} />);

    expect(screen.getByText('Enviada em 12/10 · 2ª versão · grade Fuvest 2027 (v1)')).toBeInTheDocument();
    expect(card(4)).toHaveAttribute('aria-pressed', 'true');
    expect(pin(4)).toHaveAttribute('aria-pressed', 'true');

    // Do texto para o painel…
    await userEvent.click(pin(6));
    expect(card(6)).toHaveAttribute('aria-pressed', 'true');
    expect(card(4)).toHaveAttribute('aria-pressed', 'false');
    expect(panel().getByText('de 8 apontamentos').parentElement).toHaveTextContent('6 de 8 apontamentos');

    // …e do painel para o texto.
    await userEvent.click(card(2));
    expect(pin(2)).toHaveAttribute('aria-pressed', 'true');
    expect(pin(6)).toHaveAttribute('aria-pressed', 'false');
  });

  it('as teclas j e k percorrem os apontamentos, menos dentro de um campo de texto', async () => {
    renderApp(<CorrectionView correction={correction} back={back} />);

    await userEvent.keyboard('j');
    expect(card(5)).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('kk');
    expect(card(3)).toHaveAttribute('aria-pressed', 'true');

    await userEvent.type(screen.getByLabelText('Comentário (opcional)'), 'jjk');
    expect(card(3)).toHaveAttribute('aria-pressed', 'true');
  });

  it('o filtro tira os outros apontamentos da folha, e "Ver no texto" volta ao começo', async () => {
    renderApp(<CorrectionView correction={correction} back={back} />);

    await userEvent.click(panel().getByRole('button', { name: /Tiraram pontos/ }));
    await userEvent.click(panel().getByRole('button', { name: /Escrita e vocabulário/ }));
    expect(shownCards()).toEqual([2, 5, 6]);
    expect(screen.queryByRole('button', { name: /^Apontamento 4:/ })).toBeNull();
    expect(card(2)).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Ver no texto' }));
    expect(shownCards()).toHaveLength(8);
    expect(card(4)).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Ver 1 apontamento no texto →' }));
    expect(shownCards()).toEqual([8]);
    expect(pin(8)).toHaveAttribute('aria-pressed', 'true');
  });

  it('sem apontamento no critério do problema principal, começa pelo primeiro "tirou pontos"', () => {
    renderApp(<CorrectionView correction={{ ...correction, mainIssue: { ...correction.mainIssue, criterion: 1 } }} back={back} />);

    expect(card(2)).toHaveAttribute('aria-pressed', 'true');
  });

  it('nota zero não mostra critérios, pontos a ganhar nem filtros', () => {
    renderApp(<CorrectionView correction={zeroCorrection} back={back} />);
    const sections = within(screen.getByRole('navigation', { name: 'Seções da correção' }));

    expect(sections.getAllByRole('link').map((link) => link.textContent)).toEqual(['Texto comentado2', 'Plano de reescrita', 'Avaliar a correção']);
    expect(screen.queryByRole('heading', { name: 'Critérios' })).toBeNull();
    expect(document.getElementById('criterio-1')).toBeNull();
    expect(screen.queryByText(/até \+/)).toBeNull();
    expect(screen.queryByRole('group', { name: 'Filtrar por critério' })).toBeNull();
    expect(screen.getByText('Mostrando 10 de 30 linhas')).toBeInTheDocument();
    expect(panel().getByText(/Com nota zero, os critérios não recebem nível\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reler a proposta' })).toHaveAttribute('href', '/propostas/algoritmos-e-o-debate-publico?versao=1');
    expect(shownCards()).toEqual([1, 2]);
  });

  it('a correção de exemplo não oferece foto nem avaliação', () => {
    renderApp(<CorrectionView correction={correction} back={{ to: '/', label: 'Início' }} example />);

    expect(screen.queryByRole('button', { name: 'Ver foto original' })).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByText(/Correção feita por IA com base nos critérios públicos da Fuvest, grade Fuvest 2027 \(v1\)\./)).toBeInTheDocument();
  });
});
