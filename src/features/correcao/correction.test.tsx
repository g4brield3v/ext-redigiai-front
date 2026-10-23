import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Correction } from '../../api/provisional-types';
import { renderApp } from '../../test/helpers';
import { AnnotationPanel } from './AnnotationPanel';
import { CorrectionView } from './CorrectionPage';
import { CriterionCard } from './CriterionCard';
import { ResultSummary, ScoreMap } from './ResultSummary';
import { RewritePlan } from './RewritePlan';
import { ZeroResult } from './ZeroResult';
import {
  linePieces,
  linesLabel,
  noFilters,
  orderedAnnotations,
  sameAnswer,
  shortQuote,
  startingAnnotation,
  stepAnnotation,
  steppableAnnotations,
  visibleAnnotations,
} from './annotations';
import type { Filters, Order } from './annotations';
import { exampleCorrection as correction, exampleZeroCorrection as zeroCorrection } from './example';
import { LearningProvider } from './learning';

const card = (id: number) => document.querySelector<HTMLElement>(`[data-annotation-card="${id}"]`)!;
const pin = (id: number) => screen.getByRole('button', { name: new RegExp(`^Apontamento ${id}:`) });
const shownCards = () => [...document.querySelectorAll('[data-annotation-card]')].map((element) => Number(element.getAttribute('data-annotation-card')));
const isSelected = (id: number) => card(id).getAttribute('aria-current') === 'true';
const ids = (list: { id: number }[]) => list.map((annotation) => annotation.id);
/** Uma correção de antes da ordem por importância e dos campos de aprendizado. */
const oldCorrection: Correction = {
  ...correction,
  annotationGroups: [],
  annotations: correction.annotations.map((annotation) => ({ ...annotation, why: null, answer: null, answerKind: null, askLabel: null })),
};

beforeEach(() => {
  window.localStorage.clear();
});

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

  it('começa pelo primeiro cartão da ordem por importância; sem ela, pelo critério do problema principal', () => {
    expect(startingAnnotation(correction)).toBe(4);
    // A ordem vem da API: o primeiro grupo manda, mesmo que o problema principal aponte outro critério.
    expect(startingAnnotation({ ...correction, mainIssue: { ...correction.mainIssue, criterion: 1 } })).toBe(4);
    expect(startingAnnotation({ ...oldCorrection, mainIssue: { ...correction.mainIssue, criterion: 1 } })).toBe(2);
    expect(startingAnnotation(zeroCorrection)).toBe(1);
    expect(startingAnnotation({ ...correction, annotations: [], annotationGroups: [] })).toBeNull();
  });

  it('por importância segue os grupos e põe os que funcionaram no fim; por linha, o número', () => {
    expect(ids(orderedAnnotations(correction, 'importance', noFilters))).toEqual([4, 8, 2, 5, 6, 1, 3, 7]);
    expect(ids(orderedAnnotations(correction, 'line', noFilters))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(ids(orderedAnnotations(correction, 'importance', { kind: 'all', criterion: 4 }))).toEqual([2, 5, 6]);
    // Sem grupos, só existe a ordem de linha.
    expect(ids(orderedAnnotations(oldCorrection, 'importance', noFilters))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('o passo a passo não conta os que funcionaram enquanto estão recolhidos', () => {
    expect(ids(steppableAnnotations(correction, 'importance', noFilters, false))).toEqual([4, 8, 2, 5, 6]);
    expect(ids(steppableAnnotations(correction, 'importance', noFilters, true))).toEqual([4, 8, 2, 5, 6, 1, 3, 7]);
    expect(ids(steppableAnnotations(correction, 'importance', { kind: 'good', criterion: null }, false))).toEqual([1, 3, 7]);
    expect(ids(steppableAnnotations(correction, 'line', noFilters, false))).toHaveLength(8);
  });

  it('compara a tentativa sem maiúsculas, espaços repetidos, aspas e pontuação final', () => {
    expect(sameAnswer('  “a  PARTIR.” ', 'A partir')).toBe(true);
    expect(sameAnswer('à partir', 'A partir')).toBe(false);
    expect(sameAnswer('', '')).toBe(false);
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

function Panel({ data = correction }: { data?: Correction }) {
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [order, setOrder] = useState<Order>(data.annotationGroups.length > 0 ? 'importance' : 'line');
  const [goodOpen, setGoodOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(4);
  return (
    <LearningProvider correctionId={data.id}>
      <AnnotationPanel
        annotations={data.annotations}
        criteria={data.criteria}
        annotationGroups={data.annotationGroups}
        filters={filters}
        onFilters={setFilters}
        order={order}
        onOrder={setOrder}
        goodOpen={goodOpen}
        onGoodOpen={setGoodOpen}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onStep={(delta) => setSelectedId(stepAnnotation(steppableAnnotations(data, order, filters, goodOpen), selectedId, delta))}
      />
    </LearningProvider>
  );
}

describe('AnnotationPanel', () => {
  it('por importância, agrupa os desvios por critério, com o ganho, e recolhe os que funcionaram', async () => {
    render(<Panel />);

    expect(shownCards()).toEqual([4, 8, 2, 5, 6]);
    expect(screen.getByRole('button', { name: 'Por importância' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Corrija primeiro').parentElement).toHaveTextContent('Corrija primeiro · Coesão e progressão');
    expect(screen.getByText('Depois').parentElement).toHaveTextContent('Depois · Tipo e gênero');
    expect(screen.getByText('Ajustes de escrita').parentElement).toHaveTextContent('Ajustes de escrita · Escrita e vocabulário');
    expect(screen.getAllByText(/^até \+\d+$/).map((gain) => gain.textContent)).toEqual(['até +6', 'até +2', 'até +2']);

    const fold = screen.getByRole('button', { name: /3 trechos que funcionaram/ });
    expect(fold).toHaveAttribute('aria-expanded', 'false');
    expect(fold).toHaveTextContent('Mostrar');
    await userEvent.click(fold);
    expect(shownCards()).toEqual([4, 8, 2, 5, 6, 1, 3, 7]);
    expect(fold).toHaveAttribute('aria-expanded', 'true');
    expect(fold).toHaveTextContent('Esconder');
  });

  it('por linha, sem cabeçalhos nem recolhidos', async () => {
    render(<Panel />);

    await userEvent.click(screen.getByRole('button', { name: 'Por linha' }));
    expect(shownCards()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(screen.queryByText('Corrija primeiro')).toBeNull();
    expect(screen.queryByRole('button', { name: /trechos que funcionaram/ })).toBeNull();
    expect(screen.getByText('de 8 apontamentos')).toBeInTheDocument();
  });

  it('o cartão fechado mostra o critério, o trecho sem risco, a regra, o comentário e "Tente corrigir"', () => {
    render(<Panel />);

    expect(isSelected(4)).toBe(true);
    expect(card(6)).toHaveTextContent('↓ Tirou pontos');
    expect(card(6)).toHaveTextContent('Linha 13');
    expect(card(6)).toHaveTextContent('C4 · Escrita e vocabulário');
    expect(within(card(6)).getByText(/À partir/).tagName).not.toBe('S');
    expect(card(6)).toHaveTextContent('Regra: Crase antes de verbo');
    expect(card(6)).toHaveTextContent('“A” antes de verbo nunca leva crase.');
    expect(card(6)).toHaveTextContent('Tente corrigir →');
    expect(within(card(6)).queryByText('Por quê')).toBeNull();
    expect(within(card(6)).queryByRole('textbox')).toBeNull();
  });

  it('aberto, mostra o porquê e o campo; a resposta só entra na página depois de "Ver resposta"', async () => {
    render(<Panel />);

    await userEvent.click(card(6));
    expect(isSelected(6)).toBe(true);
    expect(within(card(6)).getByText('Por quê').parentElement).toHaveTextContent(/Verbo não aceita artigo/);
    expect(within(card(6)).getByText('Tente antes de ver. Ninguém corrige a sua tentativa.')).toBeInTheDocument();
    expect(within(card(6)).queryByText('Forma correta')).toBeNull();
    expect(card(6)).not.toHaveTextContent('Tente corrigir');

    // Sem tentativa: só a resposta.
    await userEvent.click(within(card(6)).getByRole('button', { name: 'Ver resposta' }));
    expect(within(card(6)).getByText('Forma correta').parentElement).toHaveTextContent('Forma corretaA partir');
    expect(within(card(6)).queryByText('Você escreveu')).toBeNull();
    expect(within(card(6)).queryByRole('button', { name: 'Ver resposta' })).toBeNull();
    // Clicar no campo não troca a seleção.
    await userEvent.click(within(card(6)).getByRole('textbox', { name: 'Como você escreveria?' }));
    expect(isSelected(6)).toBe(true);
  });

  it('com a tentativa igual à forma correta, Enter mostra "Você escreveu" e o sinal de igual', async () => {
    render(<Panel />);

    await userEvent.click(card(6));
    await userEvent.type(within(card(6)).getByRole('textbox', { name: 'Como você escreveria?' }), '“a partir.”{Enter}');
    expect(within(card(6)).getByText('Você escreveu').parentElement).toHaveTextContent('“a partir.”');
    expect(within(card(6)).getByText('✓ Igual à forma correta')).toBeInTheDocument();

    // Diferente: mostra as duas, sem o sinal.
    await userEvent.click(card(2));
    await userEvent.type(within(card(2)).getByRole('textbox'), 'Esse dado, revela');
    await userEvent.click(within(card(2)).getByRole('button', { name: 'Ver resposta' }));
    expect(within(card(2)).getByText('Você escreveu')).toBeInTheDocument();
    expect(within(card(2)).queryByText('✓ Igual à forma correta')).toBeNull();
  });

  it('uma reescrita é "uma forma possível" e nunca é comparada', async () => {
    render(<Panel />);
    const answer = correction.annotations.find((annotation) => annotation.id === 4)!.answer!;

    await userEvent.type(within(card(4)).getByRole('textbox', { name: 'Escreva a primeira frase de um parágrafo novo' }), answer);
    await userEvent.click(within(card(4)).getByRole('button', { name: 'Ver resposta' }));
    expect(within(card(4)).getByText('Uma forma possível')).toBeInTheDocument();
    expect(within(card(4)).queryByText('Forma correta')).toBeNull();
    expect(within(card(4)).queryByText('✓ Igual à forma correta')).toBeNull();
  });

  it('respondido e fechado, mostra só a tentativa e a resposta; e lembra delas ao voltar', async () => {
    const { unmount } = render(<Panel />);

    await userEvent.click(card(6));
    await userEvent.type(within(card(6)).getByRole('textbox'), 'A partir{Enter}');
    await userEvent.click(card(2));
    expect(within(card(6)).queryByRole('textbox')).toBeNull();
    expect(within(card(6)).queryByText('Por quê')).toBeNull();
    expect(card(6)).not.toHaveTextContent('Tente corrigir');
    expect(within(card(6)).getByText('Você escreveu')).toBeInTheDocument();
    expect(within(card(6)).getByText('Forma correta')).toBeInTheDocument();

    unmount();
    render(<Panel />);
    expect(within(card(6)).getByText('✓ Igual à forma correta')).toBeInTheDocument();
  });

  it('sem armazenamento no navegador, tentar e ver a resposta funcionam igual', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<Panel />);

    await userEvent.click(within(card(4)).getByRole('button', { name: 'Ver resposta' }));
    expect(within(card(4)).getByText('Uma forma possível')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('correção antiga: ordem de linha sem seletor, e a forma correta como antes, sem campo', () => {
    render(<Panel data={oldCorrection} />);

    expect(screen.queryByRole('group', { name: 'Ordem dos apontamentos' })).toBeNull();
    expect(shownCards()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(within(card(6)).getByText('À partir').tagName).toBe('S');
    expect(within(card(6)).getByText('Escreva').parentElement).toHaveTextContent('A partir');
    expect(within(card(6)).queryByRole('textbox')).toBeNull();
    expect(card(6)).not.toHaveTextContent('Tente corrigir');
  });

  it('filtra por tipo e por critério; o filtro "Funcionaram" abre os recolhidos', async () => {
    render(<Panel />);
    const kinds = within(screen.getByRole('group', { name: 'Filtrar apontamentos' }));
    const criteria = within(screen.getByRole('group', { name: 'Filtrar por critério' }));

    await userEvent.click(kinds.getByRole('button', { name: /Tiraram pontos/ }));
    expect(shownCards()).toEqual([4, 8, 2, 5, 6]);
    expect(kinds.getByRole('button', { name: /Tiraram pontos/ })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(criteria.getByRole('button', { name: /Escrita e vocabulário/ }));
    expect(shownCards()).toEqual([2, 5, 6]);
    expect(screen.getByText('de 3 apontamentos')).toBeInTheDocument();
    // Grupo sem cartão visível não mostra cabeçalho.
    expect(screen.queryByText('Corrija primeiro')).toBeNull();
    expect(screen.getByText('Ajustes de escrita')).toBeInTheDocument();

    await userEvent.click(criteria.getByRole('button', { name: /Escrita e vocabulário/ }));
    expect(shownCards()).toEqual([4, 8, 2, 5, 6]);

    await userEvent.click(kinds.getByRole('button', { name: /Funcionaram/ }));
    expect(shownCards()).toEqual([1, 3, 7]);
    expect(screen.queryByRole('button', { name: /trechos que funcionaram/ })).toBeNull();

    await userEvent.click(criteria.getByRole('button', { name: /Tipo e gênero/ }));
    expect(screen.getByText('Nenhum apontamento com esses filtros.')).toBeInTheDocument();
  });

  it('Próximo segue a ordem atual e, depois do último, volta ao primeiro', async () => {
    render(<Panel />);

    for (let clicks = 0; clicks < 4; clicks++) {
      await userEvent.click(screen.getByRole('button', { name: 'Próximo →' }));
    }
    expect(isSelected(6)).toBe(true);
    expect(screen.getByText('de 5 apontamentos').parentElement).toHaveTextContent('5 de 5 apontamentos');

    await userEvent.click(screen.getByRole('button', { name: 'Próximo →' }));
    expect(isSelected(4)).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: '← Anterior' }));
    expect(isSelected(6)).toBe(true);
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

  it('explica em palavras simples e, no critério do "Comece por aqui", mostra o exemplo aberto', () => {
    render(<CriterionCard {...props} criterion={correction.criteria[2]!} mainIssue />);

    expect(screen.getByText('Em palavras simples').parentElement).toHaveTextContent('cada parágrafo precisa trazer uma ideia nova');
    expect(screen.getByText('Como ficaria no seu texto')).toBeInTheDocument();
    expect(screen.getByText('Começo do parágrafo, linha 10 · um exemplo, não a única forma')).toBeInTheDocument();
    expect(screen.getByText('os algoritmos também escolhem o que as pessoas').tagName).toBe('S');
    expect(screen.getByText(/as bolhas de opinião afetam o voto/).tagName).toBe('INS');
    expect(screen.queryByRole('button', { name: /Ver como ficaria/ })).toBeNull();
  });

  it('nos outros critérios, o exemplo fica atrás de um botão', async () => {
    render(<CriterionCard {...props} criterion={correction.criteria[1]!} />);

    expect(screen.queryByText('Como ficaria no seu texto')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Ver como ficaria no seu texto ▾' }));
    expect(screen.getByText('Como ficaria no seu texto')).toBeInTheDocument();
    expect(screen.getByText('discutir esse tema com seriedade').tagName).toBe('S');
  });

  it('no nível máximo não há próximo nível, palavras simples, exemplo nem o que corrigir', () => {
    const top = {
      ...correction.criteria[1]!,
      level: 4,
      points: 8,
      pointsLost: 0,
      nextDescriptor: null,
      guidance: null,
      annotationIds: [],
      plainExplanation: null,
      example: null,
    };
    render(<CriterionCard {...props} criterion={top} />);

    expect(screen.getByText('Nota máxima')).toBeInTheDocument();
    expect(screen.getByText('Nível 4 de 4')).toBeInTheDocument();
    expect(screen.queryByText(/Para chegar ao nível/)).toBeNull();
    expect(screen.queryByText('Em palavras simples')).toBeNull();
    expect(screen.queryByText('O que corrigir')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('no critério de escrita, lista os desvios por regra e só mostra as formas corretas quando o aluno pede', async () => {
    render(<CriterionCard {...props} criterion={correction.criteria[3]!} />);

    const deviations = screen.getAllByRole('listitem');
    expect(deviations).toHaveLength(3);
    expect(deviations[0]).toHaveTextContent('Vírgula entre sujeito e verbo · linha 4 · “Esse dado, revela”');
    expect(deviations[2]).toHaveTextContent('Crase antes de verbo · linha 13 · “À partir”');
    expect(screen.queryByText(/Escreva/)).toBeNull();
    expect(screen.getByText('O que corrigir · desvios por regra')).toBeInTheDocument();
    // O critério 4 não tem exemplo de reescrita.
    expect(screen.queryByRole('button', { name: /Ver como ficaria/ })).toBeNull();

    const show = screen.getByRole('button', { name: 'Mostrar as formas corretas' });
    expect(show).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(show);
    expect(deviations[0]).toHaveTextContent('Escreva “Esse dado revela” no lugar de “Esse dado, revela”.');
    expect(deviations[2]).toHaveTextContent('Escreva “A partir” no lugar de “À partir”.');
    expect(screen.getByRole('button', { name: 'Esconder as formas corretas' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Esconder as formas corretas' }));
    expect(screen.queryByText(/Escreva/)).toBeNull();
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
    expect(
      screen.getByText('Os apontamentos vêm na ordem do que mais aumenta a nota: comece pelo primeiro e tente corrigir antes de ver a resposta.'),
    ).toBeInTheDocument();
    expect(isSelected(4)).toBe(true);
    expect(pin(4)).toHaveAttribute('aria-pressed', 'true');

    // Do texto para o painel…
    await userEvent.click(pin(6));
    expect(isSelected(6)).toBe(true);
    expect(isSelected(4)).toBe(false);
    expect(panel().getByText('de 5 apontamentos').parentElement).toHaveTextContent('5 de 5 apontamentos');

    // …e do painel para o texto.
    await userEvent.click(card(2));
    expect(pin(2)).toHaveAttribute('aria-pressed', 'true');
    expect(pin(6)).toHaveAttribute('aria-pressed', 'false');
  });

  it('as teclas j e k seguem a ordem por importância, menos dentro de um campo de texto', async () => {
    renderApp(<CorrectionView correction={correction} back={back} />);

    await userEvent.keyboard('j');
    expect(isSelected(8)).toBe(true);
    await userEvent.keyboard('kk');
    expect(isSelected(6)).toBe(true);

    await userEvent.type(screen.getByLabelText('Comentário (opcional)'), 'jjk');
    expect(isSelected(6)).toBe(true);
    // Nem dentro do campo de tentativa do cartão.
    await userEvent.type(within(card(6)).getByRole('textbox'), 'jk');
    expect(isSelected(6)).toBe(true);
  });

  it('"Por linha" muda a ordem e o Próximo; um pino verde abre os recolhidos e seleciona o cartão', async () => {
    renderApp(<CorrectionView correction={correction} back={back} />);

    await userEvent.click(panel().getByRole('button', { name: 'Por linha' }));
    expect(shownCards()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    await userEvent.click(panel().getByRole('button', { name: 'Próximo →' }));
    expect(isSelected(5)).toBe(true);

    await userEvent.click(panel().getByRole('button', { name: 'Por importância' }));
    expect(shownCards()).toEqual([4, 8, 2, 5, 6]);
    await userEvent.click(panel().getByRole('button', { name: 'Próximo →' }));
    expect(isSelected(6)).toBe(true);

    await userEvent.click(pin(3));
    expect(shownCards()).toEqual([4, 8, 2, 5, 6, 1, 3, 7]);
    expect(isSelected(3)).toBe(true);
    expect(panel().getByRole('button', { name: /3 trechos que funcionaram/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('o filtro tira os outros apontamentos da folha, e "Ver no texto" volta ao começo', async () => {
    renderApp(<CorrectionView correction={correction} back={back} />);

    await userEvent.click(panel().getByRole('button', { name: /Tiraram pontos/ }));
    await userEvent.click(panel().getByRole('button', { name: /Escrita e vocabulário/ }));
    expect(shownCards()).toEqual([2, 5, 6]);
    expect(screen.queryByRole('button', { name: /^Apontamento 4:/ })).toBeNull();
    expect(isSelected(2)).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Ver no texto' }));
    expect(shownCards()).toEqual([4, 8, 2, 5, 6]);
    expect(isSelected(4)).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Ver 1 apontamento no texto →' }));
    expect(shownCards()).toEqual([8]);
    expect(pin(8)).toHaveAttribute('aria-pressed', 'true');
  });

  it('nos critérios, o exemplo do critério do "Comece por aqui" vem aberto, e o texto de apoio é o novo', () => {
    renderApp(<CorrectionView correction={correction} back={back} />);

    expect(
      screen.getByText('Cada critério mostra o seu nível, o que a grade pede para o próximo, o que isso quer dizer e como ficaria no seu texto.'),
    ).toBeInTheDocument();
    expect(within(document.getElementById('criterio-3')!).getByText('Como ficaria no seu texto')).toBeInTheDocument();
    expect(within(document.getElementById('criterio-1')!).getByRole('button', { name: 'Ver como ficaria no seu texto ▾' })).toBeInTheDocument();
  });

  it('correção antiga: sem seletor de ordem, em ordem de linha e com o texto de apoio de antes', () => {
    renderApp(<CorrectionView correction={{ ...oldCorrection, mainIssue: { ...correction.mainIssue, criterion: 1 } }} back={back} />);

    expect(screen.queryByRole('group', { name: 'Ordem dos apontamentos' })).toBeNull();
    expect(shownCards()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // Sem apontamento no critério do problema principal, começa pelo primeiro "tirou pontos".
    expect(isSelected(2)).toBe(true);
    expect(screen.getByText(/Clique num número para ver o apontamento\./)).toBeInTheDocument();
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
