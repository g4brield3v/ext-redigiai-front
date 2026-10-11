// Traz o contrato da API (openapi.json) do repositório do back-end para este repositório.
// Uso: npm run sync:api [caminho do openapi.json]   (padrão: ../ext-redigiai-api/api/openapi.json)
// Depois, `npm run gen:api` regenera o cliente em src/api/schema.d.ts.
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const source = path.resolve(process.argv[2] ?? '../ext-redigiai-api/api/openapi.json');
if (!existsSync(source)) {
  console.error(`Não encontrei ${source}. Passe o caminho do openapi.json do back-end como argumento.`);
  process.exit(1);
}

copyFileSync(source, path.resolve('openapi.json'));
console.log(`openapi.json atualizado a partir de ${source}`);
