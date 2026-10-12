import type { Annotation, Correction, TranscriptionLine } from '../../api/provisional-types';

export type KindFilter = 'all' | Annotation['kind'];

export type Filters = { kind: KindFilter; criterion: number | null };

export const noFilters: Filters = { kind: 'all', criterion: null };

/** Pedaço de uma linha da folha: texto solto ou trecho de um apontamento. */
export type LinePiece = {
  text: string;
  annotation?: Annotation;
  /** O número do apontamento vem logo depois do último pedaço do trecho. */
  pin?: boolean;
};

/** Divide o texto de uma linha nos trechos dos apontamentos. Um apontamento pode atravessar várias linhas. */
export function linePieces(line: TranscriptionLine, annotations: Annotation[]): LinePiece[] {
  const ranges = annotations
    .filter((annotation) => annotation.lineStart <= line.number && line.number <= annotation.lineEnd)
    .map((annotation) => ({
      annotation,
      start: line.number === annotation.lineStart ? annotation.charStart : 0,
      end: line.number === annotation.lineEnd ? annotation.charEnd : line.text.length,
    }))
    .sort((a, b) => a.start - b.start);

  const pieces: LinePiece[] = [];
  let cursor = 0;
  for (const range of ranges) {
    const start = Math.max(cursor, Math.min(range.start, line.text.length));
    const end = Math.max(start, Math.min(range.end, line.text.length));
    if (start > cursor) {
      pieces.push({ text: line.text.slice(cursor, start) });
    }
    if (end > start) {
      pieces.push({
        text: line.text.slice(start, end),
        annotation: range.annotation,
        pin: line.number === range.annotation.lineEnd,
      });
    }
    cursor = end;
  }
  if (cursor < line.text.length || pieces.length === 0) {
    pieces.push({ text: line.text.slice(cursor) });
  }
  return pieces;
}

/** "Linha 4", "Linhas 3 e 4" ou "Linhas 14 a 16". */
export function linesLabel({ lineStart, lineEnd }: Pick<Annotation, 'lineStart' | 'lineEnd'>) {
  if (lineEnd <= lineStart) {
    return `Linha ${lineStart}`;
  }
  return lineEnd === lineStart + 1 ? `Linhas ${lineStart} e ${lineEnd}` : `Linhas ${lineStart} a ${lineEnd}`;
}

export function kindLabel(kind: Annotation['kind']) {
  return kind === 'issue' ? 'tirou pontos' : 'funcionou';
}

const QUOTE_MAX_LENGTH = 64;

/** No cartão, um trecho longo aparece só pelo começo, cortado no fim de uma palavra. */
export function shortQuote(quote: string) {
  if (quote.length <= QUOTE_MAX_LENGTH) {
    return quote;
  }
  const cut = quote.slice(0, QUOTE_MAX_LENGTH);
  // Se o corte caiu no meio de uma palavra, volta ao fim da anterior.
  const lastSpace = quote[QUOTE_MAX_LENGTH] === ' ' ? -1 : cut.lastIndexOf(' ');
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, '')}…`;
}

export function visibleAnnotations(annotations: Annotation[], { kind, criterion }: Filters) {
  return annotations.filter(
    (annotation) => (kind === 'all' || annotation.kind === kind) && (criterion === null || annotation.criterion === criterion),
  );
}

/** Anterior e Próximo dão a volta: depois do último vem o primeiro. */
export function stepAnnotation(visible: Annotation[], currentId: number | null, delta: 1 | -1) {
  if (visible.length === 0) {
    return null;
  }
  const index = visible.findIndex((annotation) => annotation.id === currentId);
  if (index === -1) {
    return visible[delta === 1 ? 0 : visible.length - 1]!.id;
  }
  return visible[(index + delta + visible.length) % visible.length]!.id;
}

/**
 * Por onde começar no texto: o primeiro apontamento "tirou pontos" do critério do problema principal; se não
 * houver, o primeiro "tirou pontos" de qualquer critério; se não houver, o primeiro apontamento.
 */
export function startingAnnotation(correction: Pick<Correction, 'annotations' | 'mainIssue'>) {
  const issues = correction.annotations.filter((annotation) => annotation.kind === 'issue');
  const ofMainIssue = issues.find((annotation) => annotation.criterion === correction.mainIssue.criterion);
  return (ofMainIssue ?? issues[0] ?? correction.annotations[0])?.id ?? null;
}
