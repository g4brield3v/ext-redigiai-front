import type { TranscriptionLine } from '../../api/provisional-types';

/** Um parágrafo da redação: as linhas da folha, na ordem, do recuo até o próximo recuo. */
export type EssayParagraph = {
  /** 1, 2, 3… na ordem do texto. */
  number: number;
  lines: TranscriptionLine[];
  first: number;
  last: number;
};

/**
 * Parágrafos pelo recuo: uma linha com `indent` abre um parágrafo novo. A primeira linha sempre abre o primeiro,
 * mesmo sem recuo. O texto das linhas não muda.
 */
export function essayParagraphs(lines: TranscriptionLine[]): EssayParagraph[] {
  const groups: TranscriptionLine[][] = [];
  for (const line of lines) {
    const current = groups.at(-1);
    if (!current || line.indent) {
      groups.push([line]);
    } else {
      current.push(line);
    }
  }
  return groups.map((group, index) => ({ number: index + 1, lines: group, first: group[0]!.number, last: group.at(-1)!.number }));
}

/**
 * O que vai entre uma linha e a seguinte no texto corrido: um espaço; nada depois de uma linha terminada em hífen
 * (a palavra continua na linha seguinte, e o hífen fica visível).
 */
export function lineJoiner(line: TranscriptionLine) {
  return line.text.endsWith('-') ? '' : ' ';
}
