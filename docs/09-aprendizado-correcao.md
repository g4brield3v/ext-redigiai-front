# Tela de correção · versão 3 (aprendizado)

Melhorias para o aluno aprender com a correção. Escritas sobre o front-end atual (`ext-redigiai-front`, commit `7e1edb8`, "Junta a redação da correção em texto corrido…") e sobre o contrato atual da API (`CorrectionDto`, `CorrectionAnnotationDto`, `CorrectionCriterionDto`).

Referência visual: `docs/telas/html/09-correcao.html` e `docs/telas/png/09-correcao-*.png` (versão nova, entregue junto com este arquivo).
- **Use a referência só para o painel de apontamentos e os cartões dos critérios.**
- Ela mostra a redação linha a linha. **Ignore essa parte:** a redação continua como está hoje no código (`EssayFlow`, texto corrido, decisão de 22/10/2026 registrada no `docs/06-tela-correcao.md`). Esta tarefa não mexe em `EssayFlow`, `LinePieces` nem `essayParagraphs`.

Também não mudam: `ResultSummary`, `RewritePlan`, a avaliação, o rodapé e o `ZeroResult`. Na nota zero, os cartões de apontamento seguem as regras do item 1.

São duas partes, uma para cada repositório. **Faça a parte A primeiro**: o front só usa os campos novos depois que eles estiverem no `openapi.json`.

---

## Parte A · Back-end (`ext-redigiai-api`)

### A1. Campos novos no apontamento (`CorrectionAnnotationDto`)

Só para `kind = issue`. Em `good`, os quatro vêm nulos.

| Campo | Tipo | Regra |
|---|---|---|
| `why` | string | Regra geral em 1 a 3 frases, que valha para outros textos. Ex.: "“Respeito” pede a preposição “a”, e “norma” é feminina e pede o artigo “a”. Preposição + artigo = crase. Teste: troque por uma palavra masculina…" |
| `answer` | string | Critério 4: a forma correta exata. Critérios 1 a 3: uma reescrita possível do trecho. |
| `answerKind` | `exact` \| `example` | `exact` no critério 4; `example` nos critérios 1 a 3. |
| `askLabel` | string \| null | Opcional, até 60 caracteres, sem "?". Ex.: "Escreva a frase que fecha o parágrafo". |

- `fix` continua no contrato, com o mesmo valor de `answer` quando `answerKind = exact`, para não quebrar o front atual. Marque como obsoleto no OpenAPI.
- Validações, com nova tentativa da IA igual às regras que já existem:
  - `note` ou `why` contendo o `answer` (comparação sem maiúsculas, acentos de aspas e pontuação final) → `AI_ANSWER_LEAKED`. A `note` diz qual é o problema; nunca dá a resposta.
  - `why` ou `answer` ausente num `issue` → `AI_MISSING_FIELD`.
  - "?" em `why`, `answer` ou `askLabel` → rejeitar (regra 7 do CLAUDE.md).

### A2. Campos novos no critério (`CorrectionCriterionDto`)

Só quando `level < maxLevel`. No nível máximo, os dois vêm nulos.

| Campo | Tipo | Regra |
|---|---|---|
| `plainExplanation` | string | 1 a 2 frases simples sobre o que muda do nível atual para o próximo **neste texto**, citando linhas. |
| `example` | objeto \| null | Só nos critérios 1 a 3 e opcional: `{ lineLabel: string, segments: [{ text: string, kind: "keep" \| "remove" \| "add" }] }`. Ex.: `lineLabel` "Fim do parágrafo, linha 29". |

- Validação: a junção dos `segments` com `keep` + `remove`, nessa ordem, tem de existir na transcrição, normalizando espaços e quebras de linha. Se não existir → `AI_EXAMPLE_MISMATCH` e nova tentativa.

### A3. Ordem por importância (`CorrectionDto.annotationGroups`)

`annotationGroups: [{ criterion: int, potentialGain: int, markIds: int[] }]`, só com apontamentos `issue`.
- O critério do `mainIssue` vem primeiro. Depois, por `potentialGain` decrescente; em empate, o menor número de critério. O critério 4 vem sempre por último, salvo se for o do `mainIssue`.
- Dentro de cada grupo, ordem de linha. No critério 4, os apontamentos da mesma `ruleName` ficam juntos (em ordem de linha da primeira ocorrência).
- `potentialGain` = pontos perdidos no critério, calculado pelo backend (mesma regra do `mainIssue`).

### A4. Prompt, dados e custo

- **Nova versão** do prompt de correção (versões publicadas não se editam), pedindo os campos de A1 e A2 com as regras acima. Atualize o JSON Schema da resposta e o seed.
- Migração com colunas anuláveis em `correction_marks` (`why`, `answer`, `answer_kind`, `ask_label`) e na tabela dos critérios da correção (`plain_explanation`, `example` em jsonb). Correções antigas continuam válidas, com os campos nulos.
- Estime o aumento de tokens de saída com uma redação de exemplo já gravada, **sem chamar a API real**, e confirme que o limite de US$ 0,33 continua respeitado. Para medir com chamada real, pergunte antes.
- Testes de integração:
  - os três códigos novos com nova tentativa;
  - a ordem de `annotationGroups` (mainIssue primeiro, empate, critério 4 por último, mesma regra junta);
  - correção antiga sem os campos.
- Atualize `docs/01-especificacao-tecnica.md` (seção da IA e do endpoint `GET /v1/essays/{id}/correction`) e registre as decisões em `docs/decisoes.md`.

---

## Parte B · Front-end (`ext-redigiai-front`)

Antes: `npm run sync:api` e `npm run gen:api`. Os tipos novos vêm do `schema.d.ts`; não escreva tipos à mão.

### B1. Tentar antes de ver a resposta (`AnnotationCard`, em `AnnotationPanel.tsx`)

- O cartão hoje é `<button aria-pressed>`. Ele vira `<article tabIndex={0} data-annotation-card>`, porque vai conter um campo de texto. Clique, Enter ou Espaço no cartão (fora do campo) chamam `onSelect`.
- **Fechado (não selecionado)**, um `issue` mostra:
  - pino, "↓ Tirou pontos", linhas e a etiqueta "C{n} · {shortName}" (no lugar do `CriterionNumber` solto do canto);
  - o trecho entre aspas, **sem risco**;
  - "Regra: …", a `note` e o link "Tente corrigir →".
- **Aberto (selecionado)**, mostra também:
  - o bloco **"Por quê"** com `why`;
  - o campo com o rótulo `askLabel ?? "Como você escreveria?"` e o placeholder "Escreva a sua versão";
  - o botão "Ver resposta" e a frase "Tente antes de ver. Ninguém corrige a sua tentativa.". Enter no campo faz o mesmo que o botão.
- **Depois de "Ver resposta":**
  - "Você escreveu" aparece só se o campo tiver texto;
  - "Forma correta" (quando `exact`) ou "Uma forma possível" (quando `example`), com o `answer`;
  - em `exact`, se a tentativa for igual ao `answer` (sem maiúsculas, espaços repetidos, aspas e pontuação final), mostre "✓ Igual à forma correta". Em `example`, nunca compare;
  - região `aria-live="polite"`.
- **Respondido e fechado:** o cartão mostra só o bloco "Você escreveu / Forma correta".
- O quadro "Escreva" sai do cartão. **A resposta não fica no DOM antes do clique**: renderize condicionalmente, não com `hidden`.
- Sem `why`, não mostre o bloco. Sem `answer` (correções antigas), não mostre o campo; nesse caso, mostre `fix` como hoje.
- Tentativas e respostas abertas ficam no `localStorage` por correção, como no `RewritePlan` (try/catch; sem salvar, a tela funciona igual). Nada vai para a API.
- O `AnnotationSheet` do celular usa o mesmo cartão, já aberto.

### B2. "Em palavras simples" e "Como ficaria no seu texto" (`CriterionCard.tsx`)

- Logo abaixo da escada, quando houver `plainExplanation`: bloco "Em palavras simples".
- Depois do "O que corrigir", quando houver `example`, o bloco "Como ficaria no seu texto":
  - `lineLabel` + " · um exemplo, não a única forma";
  - os `segments` em Newsreader, com `remove` riscado em vermelho e `add` com fundo verde e traço verde embaixo. Monte com elementos React, nunca com `dangerouslySetInnerHTML`;
  - no critério do `mainIssue`, o bloco vem aberto. Nos outros, fica atrás do botão "Ver como ficaria no seu texto ▾".
- Lista "O que corrigir · desvios por regra" (critério 4):
  - cada item mostra pino, regra, linha e o trecho em Caveat;
  - "Escreva … no lugar de …" só aparece depois do botão "Mostrar as formas corretas", que alterna para "Esconder as formas corretas" (`aria-pressed`).
- Texto de apoio da seção: "Cada critério mostra o seu nível, o que a grade pede para o próximo, o que isso quer dizer e como ficaria no seu texto."

### B3. Ordem por importância (`AnnotationPanel` + `annotations.ts`)

- Em `annotations.ts`, crie `orderedAnnotations(correction, order, filters)`:
  - devolve os cartões visíveis na ordem atual;
  - em `importance`, segue `annotationGroups` e põe os `good` no fim;
  - em `line`, segue a ordem de `id`, como hoje.
  - `stepAnnotation` e `startingAnnotation` passam a usar essa ordem: a tela abre no primeiro cartão de `importance`.
- Seletor "Ordem" acima dos filtros: "Por importância" (padrão) | "Por linha", com `aria-pressed`.
- Em "Por importância", cada grupo tem um cabeçalho:
  - número do critério + título + " · {shortName}" + selo "até +{potentialGain}";
  - títulos: 1º grupo "Corrija primeiro"; grupo do critério 4 "Ajustes de escrita"; os demais "Depois";
  - um grupo sem cartões visíveis pelos filtros não mostra cabeçalho.
- Os `good` ficam recolhidos no botão "✓ N trechos que funcionaram · Mostrar/Esconder" (`aria-expanded`). Eles abrem sozinhos com o filtro "Funcionaram" ou quando o aluno clica num pino verde no texto.
- Em "Por linha", não há cabeçalhos nem recolhimento.
- O contador "X de N", Anterior/Próximo e as teclas j/k seguem a ordem atual e contam só os cartões visíveis (sem os recolhidos).
- Sem `annotationGroups` (correção antiga), use "Por linha" e esconda o seletor.
- Texto de apoio da seção "Texto comentado" (fora da nota zero): "Os apontamentos vêm na ordem do que mais aumenta a nota: comece pelo primeiro e tente corrigir antes de ver a resposta."

### B4. Dados de exemplo e documentação

- `example.ts`: preencha `why`, `answer`, `answerKind` (e `askLabel` quando fizer sentido) em todo `issue`; `plainExplanation` e `example` nos critérios abaixo do máximo; e `annotationGroups`. A `note` não pode conter a resposta. Use os textos da referência como modelo de tom e tamanho.
- Acrescente ao `docs/06-tela-correcao.md` a seção "Versão 3 · aprendizado" com estas regras. Copie este arquivo para `docs/09-aprendizado-correcao.md` e liste-o na tabela do `CLAUDE.md`.

### B5. Testes

- `correction.test.tsx`:
  - cartão fechado/aberto;
  - "Ver resposta" com e sem tentativa, igual/diferente, `exact` × `example`;
  - resposta ausente do DOM antes do clique;
  - correção antiga (`fix` sem `answer`);
  - as duas ordens, cabeçalhos, recolhimento, filtro "Funcionaram" abrindo os recolhidos, contador;
  - `CriterionCard` com palavras simples, exemplo aberto ou fechado, nível máximo, formas corretas escondidas no critério 4.
- `e2e/correction.spec.ts`, em 1440 px e 360 px:
  - Enter revela a resposta;
  - clicar num pino verde abre os recolhidos e seleciona o cartão;
  - "Por linha" ↔ "Por importância" muda a ordem e o Anterior/Próximo;
  - a página não rola para os lados com um cartão aberto.

---

## Como trabalhar (nos dois repositórios)

- Plano curto antes de codificar; espere aprovação.
- Branch nova; commits pequenos em português.
- Rode todos os testes e relate o resultado real.
- No back-end, rode o `security-reviewer` no fim.
- Sem deploy, sem ler `.env` e sem chamada real à API do Claude sem perguntar.
