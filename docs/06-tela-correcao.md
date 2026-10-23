# Tela 9 · Correção (versão 2)

Substitui a seção "9 · Correção" do `02-frontend.md`. Referências visuais:
- `docs/telas/html/09-correcao.html` (correção normal, **interativa**: abra no navegador e clique);
- `docs/telas/html/09z-correcao-nota-zero.html` (nota zero);
- `docs/telas/png/09-correcao-*.png` e `09z-correcao-nota-zero-*.png`.

O script no fim dos dois HTML mostra o comportamento esperado. Reimplemente em React; não copie o script.

## 1. Objetivo da tela

O aluno precisa sair da tela sabendo **uma coisa a corrigir primeiro**, **onde** ela está no texto e **como** chegar ao próximo nível. Tudo na tela serve a isso, nesta ordem: resultado → onde no texto → por que (critérios) → o que fazer (plano).

## 2. Problemas da versão 1 que esta versão corrige

| Problema visto | Correção |
|---|---|
| Linhas da redação cortadas no fim (`white-space: nowrap; overflow: hidden`) | Texto corrido em parágrafos, com o número de cada linha da folha no ponto em que ela começa, sempre sobre a pauta (fundo com `repeating-linear-gradient` de 40 px). **Nenhum texto do aluno pode ser cortado.** |
| Comentários da margem cortados ("A tese trata do imaginár…") | A margem sai da folha. Os comentários viram cartões no painel lateral, ligados ao texto por números. |
| Aspas aparecendo como `\"A vida é bela\"` | Bug de dupla serialização JSON no backend (o texto da IA foi gravado já com escape). Corrigir na origem e adicionar teste: nenhum campo de texto da correção pode conter `\"`. |
| Três cartões do mesmo peso no topo, sem dizer por onde começar | Bloco de resultado com nota, mapa de pontos por critério e **um único "Comece por aqui"**. |
| Na nota zero, "O que funcionou" aparece como destaque principal | Na nota zero, o destaque é o motivo; o que funcionou vira uma linha "Aproveite". |
| O aluno não vê o que falta para o próximo nível | Cada critério mostra o descritor do nível atual ao lado do descritor do próximo nível. |

## 3. Estrutura

1. **Cabeçalho:** "← Minhas correções"; título (36 px, uma linha no computador); "Enviada em dd/mm · Nª versão · grade Fuvest 2027 (vN)"; botões "Ver foto original" (secundário) e "Reescrever esta redação" (principal).
2. **Bloco de resultado** (cartão em 3 colunas no computador; empilhado no celular):
   - **Nota da grade:** número grande, "/ máximo" e chip da variação desde a versão anterior (só se houver versão anterior).
   - **"Onde a nota foi ganha e perdida":** uma linha por critério, com número, nome curto, medidor de níveis (N segmentos), "pontos / máximo" e pontos perdidos em vermelho (`−6`) ou "máx." em verde. A linha é um link para o critério. Número do critério em vermelho quando perdeu 6 pontos ou mais.
   - **"Comece por aqui":** o `main_issue` da correção em 18 px; critério e "vale até +X pontos"; botão "Ver no texto", que rola até o texto e seleciona o primeiro apontamento desse critério. Abaixo, separado por linha: "✓ Mantenha:" + `strengths`.
3. **Navegação de seções**, fixa no topo ao rolar: "Texto comentado (N)", "Critérios", "Plano de reescrita", "Avaliar a correção". A seção visível fica destacada.
4. **Texto comentado** (duas colunas: folha + painel de 400 px fixo ao rolar):
   - **Folha em texto corrido** (decisão de 22/10/2026): a redação em parágrafos. Uma linha com `indent` abre um parágrafo novo (a primeira linha sempre abre o primeiro); as linhas se juntam com um espaço, e uma linha terminada em "-" se junta à seguinte sem espaço, com o hífen visível. O texto do aluno nunca muda. Grid `52px minmax(0,1fr)`: cada parágrafo é uma fileira, com a margem à esquerda e um `<p>` à direita. Na margem (`aria-hidden`), "§N" (12 px, peso 700) e, abaixo, o intervalo de linhas ("1–7", 11 px, números tabulares), alinhados à direita, com a borda rosa da margem; cada item tem 40 px. No texto (Caveat 23 px, `line-height` 40 px, `text-indent` 30 px, justificado como no Word, com a última linha do parágrafo à esquerda), cada linha da folha é um `<span data-line title="Linha N">` que começa pelo número da linha, dentro do texto, no ponto em que ela começa (Schibsted Grotesk 11 px, peso 600, #9AA6BC, `line-height: 0` para não mexer na pauta, `aria-hidden`). As linhas do apontamento selecionado ganham fundo #EEF3FF (`box-decoration-break: clone`), e o número delas fica azul. Até 620 px: grid `40px minmax(0,1fr)`, texto de 21 px com `text-indent` de 20 px.
   - **Trechos marcados:** "tirou pontos" = fundo vermelho claro + sublinhado ondulado vermelho; "funcionou" = fundo verde claro + traço verde embaixo. Um trecho pode atravessar várias linhas.
   - **Número (pino):** círculo de 20 px com o número do apontamento logo depois do trecho, vermelho ou verde. O trecho e o pino são clicáveis.
   - **Painel de apontamentos:**
     - barra "← Anterior · X de N apontamentos · Próximo →";
     - filtros por tipo ("Todos", "Tiraram pontos", "Funcionaram");
     - filtros por critério (botões 1 a 4 com nome curto; clicar de novo desliga);
     - lista de cartões em ordem de linha. Cada cartão traz pino, tipo ("↓ Tirou pontos" / "✓ Funcionou"), linhas, número do critério, o trecho entre aspas em Caveat (riscado quando há forma correta), "Regra: …" (critério 4), a nota explicativa e o quadro "ESCREVA: forma correta" quando existir.
   - **Seleção sincronizada:** clicar num pino, trecho ou cartão seleciona o mesmo apontamento nos dois lados: o trecho ganha contorno, o pino ganha anel, a linha da folha ganha fundo azul claro, o cartão ganha borda azul, e o outro lado rola até ele. Anterior/Próximo percorrem só os apontamentos visíveis pelos filtros. Teclas `j` e `k` fazem o mesmo (fora de campos de texto).
   - Ao abrir a tela, o primeiro apontamento "tirou pontos" do critério do "Comece por aqui" já vem selecionado.
5. **Critérios** (grade 2 × 2 no computador, 1 coluna no celular). Cada cartão:
   - número, nome curto (título), nome completo e peso (linha secundária);
   - pontos "/ máximo" e "−X pontos" ou "Nota máxima";
   - medidor grande de níveis e "Nível X de N";
   - **escada:** "Seu nível" com o descritor do nível atual e, ao lado, "Para chegar ao nível X+1" com o descritor do próximo nível (borda tracejada azul). Sem a segunda caixa quando o nível é o máximo;
   - justificativa;
   - "O que corrigir". No critério 4: lista dos desvios por regra, cada um com pino, nome da regra, linha e "Escreva 'certo' no lugar de 'errado'";
   - link "Ver N apontamentos no texto →", que aplica o filtro desse critério e rola até o texto.
6. **Plano de reescrita** (bloco azul-marinho): título "Três passos, na ordem que mais aumenta a nota"; até 3 passos com caixa de marcar, "Passo N" e "até +X pontos"; ao lado, cartão "Reescreva com o plano ao lado" e o botão "Reescrever esta redação". As caixas marcadas ficam salvas no navegador por correção (try/catch; sem salvar, a tela funciona igual).
7. **Avaliar a correção:** pergunta na mesma linha das 3 opções (botões de rádio estilizados); comentário opcional; "Enviar avaliação" fica desabilitado até escolher uma opção. Depois de enviada, troca pelo agradecimento.
8. **Rodapé:** "Correção feita por IA com base nos critérios públicos da Fuvest (grade 2027, vN). Não substitui a banca."

## 4. Nota zero (`09z`)

- Bloco de resultado com fundo e borda avermelhados: "0 / 40" em vermelho e chip "Nota zero"; coluna central "Por que a nota foi zero" com o motivo como título (texto da hipótese da grade), a explicação da IA citando linhas e, em letra menor, a regra da Fuvest e a diferença entre fuga e tangenciamento (para fuga ao tema); coluna "Comece por aqui" com a orientação e o botão **"Reler a proposta"** (→ página da proposta), mais "✓ Aproveite:" com `strengths`.
- A navegação não tem "Critérios"; a seção de critérios não aparece. O painel do texto explica: "Com nota zero, os critérios não recebem nível…".
- O plano de reescrita leva o título "Como fazer a nova redação" e não mostra "até +X pontos".

## 5. Celular (390 px)

- Tudo em uma coluna; nada de rolagem horizontal; o texto da redação quebra linha (21 px).
- O mapa de pontos esconde os medidores e mantém números e perdas.
- A navegação de seções rola na horizontal dentro da própria barra.
- **Apontamentos:** o painel lateral não aparece abaixo da folha. Tocar num pino ou trecho abre uma **folha inferior** (bottom sheet) com o cartão do apontamento e "← Anterior / Próximo →". Ela fecha arrastando para baixo, no "×" ou tocando fora. Um botão flutuante "Apontamentos (N)" abre a lista completa com os filtros na mesma folha.

## 6. Dados que a API precisa devolver (`GET /v1/essays/{id}/correction`)

Acrescentar ao que já existe:
- `rubric.maxLevel`, `rubric.maxScore`, `rubric.versionLabel` ("Fuvest 2027 (v1)").
- Por critério: `shortName` (novo campo em `rubric_criteria`: "Tema e autoria", "Tipo e gênero", "Coesão e progressão", "Escrita e vocabulário"), `fullName`, `weight`, `level`, `points`, `maxPoints`, `pointsLost`, `currentDescriptor`, `nextDescriptor` (nulo no nível máximo), `justification`, `guidance`, `annotationIds`.
- Por apontamento (`correction_marks`): `id` sequencial por correção (1, 2, 3…, em ordem de linha), `kind` (`good`/`issue`), `criterion`, `lineStart`, `lineEnd`, `charStart`, `charEnd`, `quote` (o trecho exato, recortado pelo backend a partir das posições), `note`, `ruleName` e `fix` (só no critério 4).
- `mainIssue`: `{ text, criterion, potentialGain }`, onde `potentialGain` = (`maxLevel` − nível) × peso, calculado pelo backend.
- `nextSteps`: `[{ text, criterion, potentialGain }]`, ordenados por `potentialGain`.
- `strengths`, `zero` (`{ applies, ruleCode, ruleLabel, explanation }`), `previousVersionScore` (nulo na 1ª versão).

O front não calcula pontos, perdas nem ganhos: só exibe.

## 7. Acessibilidade

- Pinos são `<button>` com `aria-label="Apontamento N: tirou pontos, critério 3"`.
- A seleção não depende só de cor: contorno, anel e borda.
- Filtros com `aria-pressed`; avaliação com `role="radiogroup"`.
- Folha inferior do celular com foco preso e `Esc` para fechar.
- O texto em Caveat tem o mesmo conteúdo acessível como texto normal (não usar imagem).

## 8. Testes

- Unitários dos componentes: `ResultSummary`, `ScoreMap`, `EssayFlow` (parágrafos pelo recuo, junção das linhas e do hífen, trecho atravessando linhas, números fora do nome acessível), `AnnotationPanel` (filtros, Anterior/Próximo circular), `CriterionCard` (com e sem próximo nível, critério 4), `RewritePlan`, `ZeroResult`.
- Playwright: clicar num pino seleciona o cartão e vice-versa; filtro "Tiraram pontos" + critério 4 mostra só os desvios de escrita; nota zero não mostra critérios; nenhuma linha da redação cortada (comparar `scrollWidth` e `clientWidth` de cada linha).
- Comparação visual com os PNG em 1440 px e 390 px.

## 9. Versão 3 · aprendizado

Detalhe completo em `docs/09-aprendizado-correcao.md` (parte B). Prevalece sobre as seções acima onde elas divergem. A redação continua em texto corrido (`EssayFlow`); a versão 3 muda só o painel de apontamentos e os cartões dos critérios.

**Tentar antes de ver (`AnnotationCard`)**
- O cartão é `<article tabIndex={0} data-annotation-card>`, com `aria-current` quando selecionado. Clique, Enter ou Espaço fora do campo selecionam.
- Fechado, um desvio mostra pino, "↓ Tirou pontos", linhas, a etiqueta "C{n} · {shortName}", o trecho sem risco, a regra, a `note` e "Tente corrigir →".
- Aberto, mostra também "Por quê" (`why`), o campo (`askLabel ?? "Como você escreveria?"`), "Ver resposta" e "Tente antes de ver. Ninguém corrige a sua tentativa.". Enter no campo faz o mesmo que o botão.
- Depois de "Ver resposta": "Você escreveu" (só com texto), "Forma correta" (`exact`) ou "Uma forma possível" (`example`) com o `answer`, e "✓ Igual à forma correta" só em `exact`. Região `aria-live="polite"`.
- A resposta só entra no DOM depois do clique. Respondido e fechado, o cartão mostra só a tentativa e a resposta.
- Correção antiga (sem `answer`): sem campo; mostra o `fix` como na versão 2.
- Tentativas e respostas abertas ficam no `localStorage` por correção (`redigiai.tentativas.{id}`, com `try/catch`). Nada vai para a API.
- Na folha do celular, o cartão já vem aberto.
- `why`, `answer`, `askLabel` e os pedaços do exemplo são sempre texto, nunca HTML.

**Critérios (`CriterionCard`)**
- "Em palavras simples" (`plainExplanation`) logo abaixo da escada.
- "Como ficaria no seu texto" (`example`): `lineLabel` + " · um exemplo, não a única forma"; `remove` riscado em vermelho, `add` com fundo e traço verdes. Aberto no critério do `mainIssue`; nos outros, atrás de "Ver como ficaria no seu texto ▾".
- Critério 4: "Escreva … no lugar de …" só depois de "Mostrar as formas corretas" (`aria-pressed`).

**Ordem por importância (`AnnotationPanel` + `annotations.ts`)**
- Seletor "Ordem": "Por importância" (padrão) | "Por linha", com `aria-pressed`. Sem `annotationGroups` (correção antiga ou nota zero), só "Por linha" e o seletor some.
- "Por importância" segue `annotationGroups`, com cabeçalho por grupo ("Corrija primeiro", "Depois", "Ajustes de escrita" no critério 4, e o selo "até +N"). Grupo sem cartão visível não mostra cabeçalho.
- Os que funcionaram ficam recolhidos em "✓ N trechos que funcionaram" (`aria-expanded`); abrem com o filtro "Funcionaram" ou ao clicar num pino verde.
- Contador, Anterior/Próximo e j/k seguem a ordem atual e contam só os cartões visíveis (sem os recolhidos). A tela abre no primeiro cartão de "Por importância".

**Testes:** `correction.test.tsx` (cartão fechado e aberto, resposta antes e depois do clique, `exact` × `example`, correção antiga, as duas ordens, recolhimento, critérios) e `e2e/correction.spec.ts` em 1440 e 360 px (Enter revela a resposta, pino verde abre os recolhidos, troca de ordem no Anterior/Próximo, sem rolagem lateral com o cartão aberto).
