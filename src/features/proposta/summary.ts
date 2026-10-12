import type { Schemas } from '../../lib/api';

type Sheet = Pick<Schemas['PromptDetailDto'], 'minLines' | 'maxLines' | 'titleRequired'>;

/** "20 a 30 linhas · com título", como nos chips da página da proposta e no resumo do envio. */
export function sheetSummary({ minLines, maxLines, titleRequired }: Sheet) {
  const lines =
    minLines !== null && maxLines !== null
      ? `${minLines} a ${maxLines} linhas`
      : maxLines !== null
        ? `até ${maxLines} linhas`
        : null;
  return [lines, titleRequired ? 'com título' : null].filter(Boolean).join(' · ');
}

/** O tipo dentro de uma frase: "dissertação em prosa.", como a prova escreve nas instruções. */
export function genreInSentence(genreLabel: string) {
  const text = genreLabel.charAt(0).toLocaleLowerCase('pt-BR') + genreLabel.slice(1);
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
