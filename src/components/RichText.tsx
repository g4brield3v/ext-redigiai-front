import { Fragment } from 'react';
import type { ReactNode } from 'react';

const MARKS = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;

function marks(line: string, key: string): ReactNode[] {
  return line.split(MARKS).map((part, index) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${key}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${key}-${index}`}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={`${key}-${index}`}>{part}</Fragment>;
  });
}

/**
 * Texto das propostas, com o markdown mínimo que o cadastro aceita: `**negrito**`, `*itálico*` e quebra de linha.
 * Tudo o mais aparece como texto: nada do que vem da API vira HTML.
 */
export function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 && <br />}
          {marks(line, String(index))}
        </Fragment>
      ))}
    </>
  );
}
