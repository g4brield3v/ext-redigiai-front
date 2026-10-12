import type { IllegibleWord, TranscriptionLine } from '../../api/provisional-types';
import type { SheetLine, SheetSegment } from '../../components/EssaySheet';

function split(text: string, words: IllegibleWord[]): SheetSegment[] {
  const segments: SheetSegment[] = [];
  let cursor = 0;
  for (const word of [...words].sort((a, b) => a.start - b.start)) {
    const start = Math.max(cursor, Math.min(word.start, text.length));
    const end = Math.max(start, Math.min(word.end, text.length));
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start) });
    }
    if (end > start) {
      segments.push({ text: text.slice(start, end), mark: 'illegible' });
    }
    cursor = end;
  }
  if (cursor < text.length || segments.length === 0) {
    segments.push({ text: text.slice(cursor) });
  }
  return segments;
}

/** Monta as linhas da folha da revisão: a transcrição com as palavras ilegíveis destacadas. */
export function toSheetLines(lines: TranscriptionLine[], { illegible = [] }: { illegible?: IllegibleWord[] } = {}): SheetLine[] {
  return lines.map((line) => ({
    number: line.number,
    indent: line.indent,
    segments: split(
      line.text,
      illegible.filter((word) => word.lineNumber === line.number),
    ),
  }));
}
