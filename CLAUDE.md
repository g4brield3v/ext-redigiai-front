# RedigiAI · front-end

Aplicação web do RedigiAI, o SaaS que corrige redações manuscritas da Fuvest com IA. Este repositório tem só o front-end; a API, o worker e a especificação do produto ficam no repositório do back-end (`ext-redigiai-api`).

## Documentos (leia antes de qualquer tarefa)

| Onde | Conteúdo |
|---|---|
| `docs/02-frontend.md` | Design system, rotas e o comportamento de cada tela |
| `docs/04-construir-front.md` | Como construir as telas idênticas às aprovadas |
| `docs/06-tela-correcao.md` | Tela da correção, versão 2: substitui a seção 9 do `02-frontend.md` |
| `docs/07-propostas-de-redacao.md` | Propostas de redação: blocos ordenados, um tipo por proposta, área de administração e mudanças no fluxo do aluno (cópia do repositório do back-end) |
| `docs/telas/html/` e `docs/telas/png/` | Telas aprovadas: HTML e imagem de cada tela (computador e celular). **O front-end tem que ficar idêntico a elas.** |
| Repositório do back-end, `docs/01-especificacao-tecnica.md` | **Fonte da verdade** das regras de negócio, da API e dos erros |
| Repositório do back-end, `docs/decisoes.md` | Decisões tomadas durante a implementação, inclusive as do front |

Se algo na tarefa contradiz a especificação, **pare e pergunte**. Não invente regra de negócio.

## Stack

React + Vite + TypeScript (strict), React Router, TanStack Query, CSS Modules, cliente tipado gerado do `openapi.json` do back-end, Clerk (login). Testes com Vitest + Testing Library e Playwright. Produção: imagem Docker com Caddy, no Railway.

## Estrutura

```
openapi.json     cópia do contrato da API (vem do repositório do back-end)
src/api/         schema.d.ts (gerado, não editar à mão) e provisional-types.ts (endpoints ainda sem backend)
src/components/  componentes do design system
src/features/    uma pasta por área (home, propostas, proposta, admin, envio, revisao, correcao, painel, perfil, checkout, auth)
src/routes/      rotas e provedores
e2e/             Playwright (telas públicas e a correção, com a sessão de teste de e2e/session.ts)
docs/            especificação do front e telas aprovadas
Caddyfile        servidor de produção: rotas do React e cabeçalhos de segurança
Dockerfile
```

## Comandos

```bash
npm ci && npm run dev        # http://localhost:5173 (precisa da API em VITE_API_URL)
# Não existe acesso sem login, nem na sua máquina: VITE_CLERK_PUBLISHABLE_KEY (Clerk de desenvolvimento) no
# .env.development.local. Sem login, só a página inicial e o login; o resto leva ao login e volta depois.
npm run sync:api             # copia o openapi.json do repositório do back-end (pasta ao lado)
npm run gen:api              # regenera src/api/schema.d.ts a partir do openapi.json
npm test && npm run typecheck && npm run lint
npx playwright test          # em 1440 px e 360 px, sobre um build próprio (dist-e2e, --mode e2e, com sessão de teste)
CAPTURE_DIR=pasta npx playwright test e2e/captures.spec.ts   # capturas da redação na correção, nos dois modos
npm run build                # build de produção em dist/
```

A configuração local vem do arquivo `.env` (copie de `.env.example`). Atualize esta seção sempre que um comando mudar.

## Regras inegociáveis

1. **O backend decide, a tela mostra.** Nota, saldo, prazos, status, preços e idade vêm da API. O front nunca calcula nota nem decide se há saldo.
2. Título sempre "Vestibular – Tipo – Tema", vindo da API: `title` da redação e `essayTitle` da proposta. O front nunca monta o título.
3. Ordem fixa da escolha: vestibular → proposta → foto. O tipo de redação vem da proposta; o aluno não escolhe tipo nem opção. Depois de confirmar o envio, não há troca de foto nem cancelamento.
4. Siga `docs/02-frontend.md` e `docs/telas/`. Copie os textos das telas; não reescreva.
5. Nunca escreva tipos da API à mão: atualize o `openapi.json` e regenere o cliente.
6. Sem bibliotecas de componentes prontas (MUI, Chakra etc.). Sem emojis, gradientes ou ícones de "IA".
7. Erros pelo `code`, texto pelo `message` da API.
8. Nenhum segredo no front: toda variável `VITE_` é pública. Nunca use `dangerouslySetInnerHTML` com conteúdo da API ou do aluno.
9. Nada de dados simulados dentro da aplicação. Em teste, a API e a sessão são substituídas dentro do próprio teste.
10. Acessibilidade: contraste AA, foco visível, toda ação por teclado, rótulo em todo campo. Nenhuma tela rola para os lados em 360 px.

## Como trabalhar

- Antes de codificar, apresente um plano curto e espere aprovação.
- Commits pequenos e descritivos, em português, no imperativo. Uma branch por funcionalidade; nunca faça commit direto na `master`.
- Toda funcionalidade vem com testes.
- Antes de dar uma tarefa por concluída: `npm test`, `npm run typecheck`, `npm run lint` e `npx playwright test`. Relate o resultado real; não diga que passou sem rodar.
- Use só chaves de teste (Clerk de desenvolvimento, Mercado Pago sandbox). Nunca faça deploy em produção.
- Não adicione dependência nova sem dizer por quê.
- Código e identificadores em inglês; textos para o aluno em português do Brasil.
