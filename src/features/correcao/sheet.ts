import type { CorrectionMark, IllegibleWord, TranscriptionLine } from '../../api/provisional-types';
import type { SheetLine, SheetMark, SheetSegment } from '../../components/EssaySheet';

type Range = { start: number; end: number; mark: SheetMark; criterion?: number };

/** Trecho curto com problema (uma palavra, um sinal) leva círculo; trecho longo, sublinhado ondulado. */
const CIRCLE_MAX_LENGTH = 10;

function split(text: string, ranges: Range[]): SheetSegment[] {
  const segments: SheetSegment[] = [];
  let cursor = 0;
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    const start = Math.max(cursor, Math.min(range.start, text.length));
    const end = Math.max(start, Math.min(range.end, text.length));
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start) });
    }
    if (end > start) {
      segments.push({ text: text.slice(start, end), mark: range.mark, criterion: range.criterion });
    }
    cursor = end;
  }
  if (cursor < text.length || segments.length === 0) {
    segments.push({ text: text.slice(cursor) });
  }
  return segments;
}

/** Monta as linhas da folha a partir da transcrição e das marcas da correção ou das palavras ilegíveis. */
export function toSheetLines(
  lines: TranscriptionLine[],
  { marks = [], illegible = [] }: { marks?: CorrectionMark[]; illegible?: IllegibleWord[] } = {},
): SheetLine[] {
  return lines.map((line) => {
    const lineMarks = marks.filter((mark) => mark.line === line.number);
    const ranges: Range[] = [
      ...lineMarks.map((mark): Range => ({
        start: mark.start,
        end: mark.end,
        criterion: mark.criterion,
        mark: mark.kind === 'good' ? 'good' : mark.end - mark.start <= CIRCLE_MAX_LENGTH ? 'circle' : 'wavy',
      })),
      ...illegible
        .filter((word) => word.lineNumber === line.number)
        .map((word): Range => ({ start: word.start, end: word.end, mark: 'illegible' })),
    ];
    const noted = lineMarks.find((mark) => mark.note);

    return {
      number: line.number,
      indent: line.indent,
      segments: split(line.text, ranges),
      note: noted?.note
        ? { text: noted.note, kind: noted.kind, criterion: noted.tagged ? noted.criterion : undefined }
        : undefined,
    };
  });
}

/** Linhas em branco até o fim da folha ("Mostrar linhas 17 a 30"). */
export function blankLines(from: number, to: number): SheetLine[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => ({
    number: from + index,
    segments: [{ text: '' }],
  }));
}
