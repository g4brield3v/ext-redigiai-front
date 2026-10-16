/**
 * O tipo de redação (o nome da categoria de correção) dentro de uma frase: "dissertação em prosa.", como a prova
 * escreve nas instruções.
 */
export function genreInSentence(genre: string) {
  const text = genre.charAt(0).toLocaleLowerCase('pt-BR') + genre.slice(1);
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
