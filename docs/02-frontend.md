# RedigiAI — Especificação do front-end

Complementa `01-especificacao-tecnica.md`. As telas foram desenhadas e aprovadas; os arquivos de referência estão em `docs/telas/html/` (HTML estático que abre no navegador; copie markup, medidas, cores e textos) e `docs/telas/png/` (imagem de cada tela em 1440 px e 390 px). Os textos das telas são definitivos: copie-os, não reescreva.

## 1. Princípios de interface

1. **Confiança e ensino.** Visual sóbrio, azul, muito espaço em branco, tipografia editorial. Nada de gradientes chamativos, emojis, ícones de "IA", brilhos ou cartões coloridos em excesso.
2. **O backend decide, a tela mostra.** Nota, saldo, prazos, status e regras vêm da API. O front nunca calcula nota, nunca decide se há saldo e nunca muda status sozinho.
3. **Título sempre no formato "Vestibular – Tipo – Tema"**, sem ano (ex.: "Fuvest – Dissertação – Algoritmos e o debate público"). Usar o campo `title` da API.
4. **Ordem fixa da escolha:** vestibular → proposta → foto. O tipo de redação é o da proposta, definido no cadastro; o aluno não escolhe tipo nem opção. Não existe atalho que pule etapas.
5. **Orientações são afirmações.** O front não gera textos de feedback; só exibe o que vem da API.
6. **Fricção mínima.** O aluno só cria conta na hora de enviar. Nenhum formulário pede o que não é usado.
7. **Erros pelo `code`, texto pelo `message`.** Ver seção 12 da especificação.
8. **Acessibilidade:** contraste AA, foco visível (`outline: 3px solid #2346C9`), toda ação por teclado, rótulos em todos os campos, `aria-live` nos status que mudam sozinhos.
9. **Responsivo:** funciona de 360 px a 1440 px. Abaixo de 980 px as colunas viram uma só; abaixo de 620 px a margem de comentários da folha some e os comentários aparecem abaixo de cada linha marcada.

## 2. Design system

### Cores

| Token | Valor | Uso |
|---|---|---|
| `--blue` | `#2346C9` | Ação principal, links, destaques, foco |
| `--blue-hover` | `#1A37A6` | Hover do botão principal |
| `--link-hover` | `#16308F` | Hover de link |
| `--navy` | `#0E1B33` | Texto principal, títulos |
| `--muted` | `#56627A` | Texto secundário |
| `--muted-2` | `#46536B` | Links da navegação |
| `--bg` | `#F6F8FC` | Fundo da página |
| `--surface` | `#FFFFFF` | Cartões, navegação |
| `--border` | `#E1E6F0` | Bordas de cartão |
| `--border-input` | `#D3DBEA` | Bordas de campo e botão secundário |
| `--line` | `#D5DEEC` | Pautas da folha |
| `--margin-red` | `#F0C9C4` | Linha vertical da margem da folha |
| `--ink` | `#1C2F6E` | Texto manuscrito do aluno |
| `--correction` | `#C8372D` | Marcas e comentários de correção (caneta vermelha) |
| `--good` | `#1F7A4C` | Marca "funcionou" |
| `--good-bg` | `#E4F4EC` | Fundo do trecho que funcionou |
| `--illegible-bg` | `#FFF3C4` | Palavra ilegível |

Chips de status:

| Status | Fundo | Texto |
|---|---|---|
| Corrigida (`completed`) | `#E5F5EC` | `#17603B` |
| Precisa de você (`awaiting_review`) | `#FFF1D6` | `#6B4300` |
| Em correção / Lendo (`processing`, `uploaded`) | `#E8EEFF` | `#1A37A6` |
| Na fila (`queued`) | `#EEF1F6` | `#3B4559` |
| Não corrigida / Cancelada (`failed`, `cancelled`) | `#FDECEA` | `#9A2A20` |

### Tipografia

Fontes hospedadas no próprio site com `@fontsource/newsreader`, `@fontsource/schibsted-grotesk` e `@fontsource/caveat` (não carregar do Google Fonts: evita enviar o IP do aluno a terceiros). Os HTML de `docs/telas/html/` usam o Google Fonts só para pré-visualização.


- **Schibsted Grotesk** (400, 500, 600, 700): interface e texto. Base 16 px, `line-height: 1.55`.
- **Newsreader** (500, 600, itálico 500): títulos. `letter-spacing: -0.015em`. H1 44 px (34 px no celular), H2 28 px.
- **Caveat** (500, 600): texto manuscrito na folha (22 px) e comentários de correção na margem (19 px).
- Rótulo de seção ("eyebrow"): 13 px, 600, maiúsculas, `letter-spacing: .09em`, cor `--blue`.

### Componentes

- **Botão principal:** pílula (`border-radius: 999px`), altura mínima 48 px, padding 0 22 px, 600, 15,5 px, fundo `--blue`. Desabilitado: fundo `#C5CEDF`, texto `#4A5670`.
- **Botão secundário (ghost):** fundo branco, borda `--border-input`; hover com borda `--navy`.
- **Cartão:** fundo branco, borda `--border`, raio 18 px.
- **Janela/destaque:** como cartão, com sombra `0 1px 0 #E9EEF6, 0 24px 48px -28px rgba(14,27,51,.25)`.
- **Campo:** altura 48 px, raio 12 px, borda `--border-input`, foco com borda `--blue`.
- **Navegação:** branca, altura 68 px, borda inferior. Logo à esquerda; links ao centro (deslogado: Como funciona, A correção, Como é a nota, Preços, Dúvidas; logado: Temas, Minhas correções); à direita "Entrar" + "Corrigir redação" ou o avatar com a inicial. Link da página atual sublinhado em azul.
- **Logo:** quadrado azul de 30 px com raio 8, três linhas brancas (pautas) e um traço curvo `#FFB4A8` (caneta), seguido de "RedigiAI" em 700. SVG em `docs/telas/html/01-inicio.html`.
- **Folha (componente `EssaySheet`)**, o elemento mais importante do produto:
  - Grade: coluna de número da linha (36 px, números 11 px `#9AA6BC`, borda direita `--margin-red`), coluna do texto, coluna opcional de comentários (170 px, borda esquerda tracejada).
  - Cada linha tem 36 px de altura e borda inferior `--line`. **O texto fica sentado na pauta** (alinhado embaixo).
  - Texto do aluno em Caveat, cor `--ink`, exatamente como transcrito, linha por linha, sem quebra automática.
  - Marcas: problema = sublinhado ondulado vermelho ou círculo vermelho; acerto = fundo `--good-bg`. Ao lado, um selo redondo com o número do critério (vermelho para problema, verde para acerto).
  - Comentário da margem na mesma linha da marca, em Caveat vermelho. **O comentário precisa corresponder exatamente ao trecho marcado.**
  - Palavra ilegível (tela de revisão): fundo `--illegible-bg` com desfoque leve.
  - Mostra as linhas com texto; as restantes até 30 ficam atrás de "Mostrar linhas X a 30".

## 3. Stack do front-end

- React + Vite + TypeScript estrito; React Router.
- TanStack Query para dados do servidor (cache, polling, revalidação).
- Cliente HTTP **gerado do `openapi.json` do backend** (orval ou openapi-typescript + openapi-fetch). Proibido escrever tipos da API à mão.
- Clerk React SDK (`@clerk/clerk-react`) para login; o token vai em `Authorization: Bearer`.
- SDK JS do Mercado Pago para tokenizar o cartão; Pix mostra QR code e copia-e-cola vindos da API.
- CSS: CSS Modules ou Tailwind configurado com os tokens acima (escolher um e manter). Sem bibliotecas de componentes visuais prontas (MUI, Chakra etc.), para não ficar com cara genérica.
- Testes: Vitest + Testing Library; Playwright para ponta a ponta.
- Sentry para erros.

## 4. Rotas

| Rota | Tela (arquivo de design) | Acesso |
|---|---|---|
| `/` | 1 · Início (`01-inicio.html`) | Público |
| `/propostas` (antes `/temas`) | 2 · Vestibular e proposta (`02-temas.html`) | Público |
| `/propostas/:slug` | 2b · Proposta e coletânea (`02b-proposta-coletanea.html`) | Público |
| `/propostas/:slug/enviar` | 3 · Envio (`03-tipo-envio.html`), modal 3b (`03b-modal-confirmar-envio.html`) | Público até enviar |
| `/admin/propostas` | 11 · Admin: propostas (`11-admin-propostas.html`) | Só administrador (ver `07-propostas-de-redacao.md`, A5) |
| `/admin/propostas/:id` | 11b · Admin: editar proposta (`11b-admin-editar-proposta.html`) | Só administrador |
| `/entrar` | 4 · Login (`04-login.html`) | Público |
| `/enviar/foto` | 5 · Câmera no celular (`05-camera-celular.html`) | Público |
| `/painel` | 8 · Minhas correções (`08-painel.html`) | Logado |
| `/redacoes/:id/revisao` | 6 · Palavras ilegíveis (`06-revisao-ilegiveis.html`), modal 6b (`06b-modal-confirmar-palavras.html`) | Logado |
| `/redacoes/:id` | 9 · Correção (`09-correcao.html`) | Logado |
| `/perfil` | 10 · Meu perfil (`10-perfil.html`) | Logado |
| `/comprar` | Checkout (sem design; seguir o design system) | Logado |
| `/termos`, `/privacidade` | Textos legais (conteúdo virá do jurídico) | Público |
| — | 7 · E-mail (`07-email-correcao-pronta.html`), modelo para o SendGrid | — |

Rota logada sem sessão → `/entrar?next=<rota>`. Depois do login, `POST /v1/me` se o usuário ainda não existir localmente (data de nascimento) e volta para `next`.

## 5. Telas

### 1 · Início (`/`)

Seções, nesta ordem:
1. **Hero:** eyebrow "Correção de redação para vestibular"; H1 "Uma correção que mostra onde e como melhorar."; texto de apoio; botões "Ver os temas" (→ `/temas`) e "Como a nota é calculada" (âncora); nota "Você só cria conta na hora de enviar." À direita, uma folha de exemplo corrigida (componente `EssaySheet` com dados fixos) e o resumo de critérios com nota 23/30.
2. **Como funciona:** 4 passos (vestibular, tema, tipo, envio), cada um com ilustração da escolha. Unicamp e Enem aparecem como "em breve".
3. **A correção:** três pontos (nível de 1 a `maxLevel` da grade por critério; orientação direta com linhas; erros agrupados pela regra) e um cartão de critério de exemplo.
4. **Como a nota é calculada** (`id="nota"`): tabela critério × nível × peso × pontos, nota da grade, "Quando a nota é zero" e "Se a grade mudar". Os dados vêm de `GET /v1/rubrics/{versionId}`.
5. **Preços:** três cartões (Teste grátis R$ 0, Plano semanal R$ 39,90/mês em destaque, Correção avulsa R$ 16).
6. **Perguntas frequentes:** acordeão (`<details>`).
7. **CTA final:** "Escolha um tema e escreva a sua próxima redação." + "Ver os temas".
8. **Rodapé:** "Correções feitas por IA com base nos critérios públicos da Fuvest. Não é afiliado à Fuvest." + Termos, Privacidade, Contato + identificação da empresa.

### 2 · Vestibular e proposta (`/propostas`)

Modelo, API e regras em `docs/07-propostas-de-redacao.md`. O endereço antigo `/temas` leva para cá.

- Barra de etapas: 1 · Vestibular, 2 · Proposta, 3 · Escrever, 4 · Envio.
- Clicar numa proposta abre a página dela (`/propostas/:slug`), não o envio.
- Vestibulares de `GET /v1/exams`; os que estão "em breve" aparecem desabilitados.
- Grade de cartões de `GET /v1/exams/{slug}/prompts?q=`: título, resumo (quando houver), o tipo de redação como chip (`genreLabel`, um só) e "Coletânea com N textos". Se o aluno logado já enviou redação da proposta, em qualquer versão dela, chip com o status.
- Busca por título com atraso de 300 ms.

### 2b · Proposta e coletânea (`/propostas/:slug`)

Página só de leitura, separada do envio: o aluno lê a proposta, escreve à mão e depois vai enviar. Referência: `02b-proposta-coletanea`.

- Trilha "Fuvest / Propostas / [título]"; eyebrow "Proposta de redação · Fuvest"; H1 com o título; chips: o tipo (`genreLabel`), "Coletânea com N textos" e "20 a 30 linhas · com título".
- Coluna principal: os blocos na ordem de `position`, a mesma que a correção recebe. Cada texto da coletânea tem o rótulo em negrito, o conteúdo e a fonte em itálico à direita. Verso (`format: verse`): colunas lado a lado no computador e em sequência no celular. Imagem: `imageUrl` com o `alt` da API. Depois vêm o comando e as instruções, que começam por "**Tipo de redação:** [gênero]." montado com `genreLabel`. Título de seção, parágrafo e separador aparecem onde foram cadastrados.
- Os textos aceitam só `**negrito**`, `*itálico*` e quebra de linha; nada do que vem da API vira HTML.
- No fim da coluna: "Já escreveu? Envie a foto da folha para correção." com o botão "Enviar minha redação". Na coluna lateral: "Como na prova", com 4 passos (ler; imprimir a folha pautada, com o link "Baixar a folha (PDF)"; escrever sem nome nem assinatura; fotografar e enviar) e o mesmo botão (→ `/propostas/:slug/enviar`). O aluno não escolhe tipo nem opção em lugar nenhum.
- Dados de `GET /v1/prompts/{slug}`. Proposta inexistente, em rascunho ou arquivada → erro `PROMPT_NOT_AVAILABLE` com link para `/propostas`.
- `?versao=N` abre a versão que uma redação antiga usou (`GET /v1/prompts/{slug}?version=N`). Versão arquivada mostra o aviso de que foi substituída, com link para a atual, e não tem botão de envio.

### 11 · Administração das propostas (`/admin/propostas` e `/admin/propostas/:id`)

Regras, API e campos em `docs/07-propostas-de-redacao.md`, seção A5. Referências: `11-admin-propostas` e `11b-admin-editar-proposta`. O código fica em `src/features/admin` e é carregado à parte: quem não é administrador não o baixa.

- `/admin/*` só existe para quem tem `role: admin` em `GET /v1/me`. Para aluno logado e para quem não entrou, é a página de "não encontrado", sem nenhuma chamada a `/v1/admin`. O link "Admin" aparece ao lado do avatar só para administradores.
- Sessão sem o segundo fator, quando a API o exige (`ADMIN_2FA_REQUIRED`): a tela pede a ativação da verificação em duas etapas.
- **Lista:** abas por situação com as contagens que vêm da API, busca com atraso de 300 ms, tabela (proposta, versão, status, atualizada, ação), "Importar JSON" e "Nova proposta".
- **Editor:** barra fixa (voltar, status e versão, "Salvo às hh:mm", "Exportar JSON", "Validar", "Publicar" com confirmação); pendências clicáveis, que levam ao campo; título e dados gerais; um cartão por bloco, com posição editável, alça para arrastar, ↑ ↓, duplicar e remover; cartão fixo de Instruções, com o tipo de redação (gênero como na prova e categoria de correção), linhas, título obrigatório e itens; "Abordagens esperadas do tema"; prévia à direita com os mesmos componentes da página do aluno, em "Computador" e "Celular".
- Mudar a ordem renumera os blocos de 10 em 10. O editor manda sempre a proposta inteira (`PUT`), com `expectedUpdatedAt`.
- **Salvamento automático:** 2 segundos depois da última alteração. Se falhar, o que foi digitado fica no navegador (`localStorage`) e volta ao reabrir; com `PROMPT_CHANGED`, o editor para de salvar e pede para recarregar.
- Proposta publicada ou arquivada abre só para leitura, com "Criar nova versão"; a publicada tem também "Arquivar". O rascunho tem "Apagar este rascunho" no fim do formulário.

### 3 · Envio (`/propostas/:slug/enviar`)

Referência: `03-tipo-envio`. A página **não pergunta o tipo**.

- Trilha "Fuvest / Propostas / [título] / Envio"; H1 "Envie sua redação"; linha "Proposta: [título] · Ver coletânea" (→ `/propostas/:slug`). A coletânea **não** aparece nesta página.
- Cartão principal: "Sua redação", com o quadro só para leitura "Tipo de redação, definido pela proposta" (`genreLabel` e "20 a 30 linhas · com título"), e "Foto da folha".
- Upload: arrastar ou escolher arquivo; no celular, botão que abre `/enviar/foto`. Aceita só JPG; o front converte e comprime para JPG ≤ 10 MB (canvas) antes de enviar e mostra nome, tamanho e "Trocar foto".
- Dicas: "Folha inteira, reta e com boa luz", "Uma face da folha por envio", "Não escreva seu nome na folha: na Fuvest, identificação zera a redação."
- Coluna lateral fixa: "Você vai enviar [título]" (o `essayTitle` da API, já visível antes da foto), "Custo: N correções", botão "Enviar para correção" (habilitado com a foto escolhida) e a nota "Você confere tudo antes de confirmar. Se ainda não entrou, pedimos o login nesse momento."
- Envio em lote: "Adicionar outra foto" cria mais uma redação da mesma proposta (ver seção 15 da especificação).
- Ao clicar: sem sessão → guarda rascunho e vai para `/entrar`; com sessão → `POST /v1/uploads/sign`, upload direto ao Cloudinary, depois abre o modal 3b. O envio manda `{ promptId, assetId, parentEssayId? }`, sem tipo.
- "Reescrever esta redação" leva a esta página com `?versao=N&reescrita=id`: a reescrita responde à versão da proposta da redação original. "Reenviar" (redação que falhou) leva à versão publicada.

### 3b · Modal de confirmação

- Título "Confirme o envio"; lista de redações (título + nome do arquivo); "Custo: N correções"; "Saldo depois do envio: X correções" (saldo de `GET /v1/me`).
- Aviso: "Depois de confirmar, a leitura da redação começa na hora. Não é possível trocar a foto nem cancelar o envio."
- Botões "Voltar e revisar" e "Confirmar envio". Confirmar → `POST /v1/essays/batch` com `Idempotency-Key` (UUID gerado ao abrir o modal) → `/painel`.
- Saldo insuficiente → botão desabilitado e link "Comprar correções" (→ `/comprar`, voltando depois).
- Primeiro envio da conta: o modal inclui o aviso sobre IA com caixa de aceite obrigatória.

### 4 · Login (`/entrar`)

- Cartão central "Entre para enviar sua redação"; se houver rascunho, mostra o título e "A foto está guardada. O envio continua depois de entrar."
- "Continuar com Google"; separador "ou"; "Seu e-mail" + "Receber link de acesso" (link mágico do Clerk, "Sem senha. O link vale por 15 minutos.").
- **Data de nascimento** (dd/mm/aaaa) no primeiro acesso, com a nota "A plataforma é para quem tem 16 anos ou mais." Menor de 16 → mensagem do erro `AGE_BELOW_MINIMUM` e nada é criado.
- Texto de aceite: "Ao continuar, você aceita os Termos de uso e a Política de privacidade, inclusive o envio do texto a um serviço de IA para correção."
- Usar componentes "headless" do Clerk ou a API dele com o nosso visual, não o widget padrão.

### 5 · Câmera no celular (`/enviar/foto`)

- Tela cheia escura, câmera traseira (`getUserMedia`, `facingMode: environment`), moldura da folha sobreposta.
- Topo: "Fotografar redação" e o título. Chips de dica: "Luz boa", "Sem sombra", "Sem nome na folha". Botões: obturador grande no centro e "Galeria".
- Sem permissão de câmera → cair para `<input type="file" accept="image/jpeg" capture="environment">`.
- A detecção automática de enquadramento ("Folha enquadrada. Pode fotografar.") é desejável, mas pode ficar para depois do MVP.

### 6 · Palavras ilegíveis (`/redacoes/:id/revisao`)

- Volta "← Minhas correções"; título; H1 "Não conseguimos ler N palavras".
- Texto: "Digite exatamente o que está na folha, mesmo que tenha erro. Nesta etapa nada é corrigido."
- Prazo em destaque: "Preencha até [dia, hh:mm]. Depois desse prazo, a redação é cancelada e a correção volta para o seu saldo." (de `review_deadline_at`, em horário de Brasília).
- Contador "X de N preenchidas".
- Esquerda: a transcrição na folha, só leitura, com as palavras ilegíveis em amarelo. Direita: um campo por palavra com "Linha N", o trecho de contexto e o rótulo "O que está escrito"; ao preencher, o chip vira "Preenchida".
- **Não existe** opção de trocar a foto nem de cancelar.
- "Enviar para correção" só habilita com todas preenchidas (texto de ajuda: "O botão é liberado quando todas as palavras estiverem preenchidas.") e abre o modal 6b.
- Rascunho dos campos guardado no navegador até enviar.

### 6b · Modal "Confira as palavras"

- Lista "Linha N → palavra". Aviso: "Essas palavras entram na redação exatamente como estão e não podem ser alteradas depois do envio."
- "Voltar e revisar" / "Confirmar e enviar" → `PUT /v1/essays/{id}/illegible` → `/painel`.
- `REVIEW_EXPIRED` → mostra a mensagem e leva ao painel.

### 7 · E-mail (modelo para o SendGrid)

- Só aviso e botão; **nunca** nota ou conteúdo da correção.
- Assunto "Sua correção está pronta"; pré-visualização com o título; "[Nome], sua redação foi corrigida"; quadro com título e data de envio; texto "A nota de cada critério, as linhas que tiraram pontos e o que corrigir primeiro estão na plataforma."; botão "Ver minha correção"; link alternativo; rodapé com "Ajustar avisos por e-mail" e identificação da empresa.
- HTML de e-mail com tabelas e estilos inline, largura 600 px. Os demais templates (seção 10 da especificação) seguem o mesmo layout, mudando título, texto e botão.

### 8 · Minhas correções (`/painel`)

- "Olá, [nome]"; "N correções disponíveis"; botões "Comprar correções" e "Nova redação".
- Alerta amarelo quando há redação em `awaiting_review`: "Uma redação precisa de você", com título e prazo, e o botão "Preencher palavras".
- "Sua evolução": gráfico de linha simples das notas (`GET /v1/me/progress`) e a variação da última.
- "Seu foco agora": o critério que mais tirou pontos nas últimas 3 correções, com a orientação e "Ver na última correção →".
- Tabela "Correções": Redação (título + "· Nª versão" quando houver reescrita), Enviada, Status (chip), Nota, Ação ("Preencher palavras", "Ver correção" ou "Reenviar" para `failed`, que leva a `/propostas/:slug/enviar` com o tipo pré-selecionado).
- Redações em `uploaded`, `queued` e `processing`: polling a cada 5 s enquanto a aba estiver visível; parar quando nenhuma estiver em andamento.

### 9 · Correção (`/redacoes/:id`)
> **Substituída por `docs/06-tela-correcao.md` (versão 2).** O que está abaixo descreve a versão 1 e fica só como histórico; as referências visuais são `09-correcao.html` e `09z-correcao-nota-zero.html`.

Dados de `GET /v1/essays/{id}/correction`.
1. Cabeçalho: "← Minhas correções", título, "Enviada em dd/mm · Nª versão · grade Fuvest vN", botões "Ver foto original" (abre a URL assinada de `GET /v1/essays/{id}/photo` num modal) e "Reescrever esta redação" (→ `/temas/:themeId/enviar?tipo=…&reescrita=<id>`).
2. Resumo: "Nota da grade" grande (ex.: 23 / 30) e variação desde a versão anterior; cartões "O que funcionou" e "O que mais tirou pontos".
3. "Sua redação": `EssaySheet` com marcas e comentários de margem; legenda "funcionou" / "tirou pontos". Clicar numa marca rola até o critério.
4. Os 4 critérios: número, nome, pontos (nível × peso), "Nível X de 3 · peso Y", descritor oficial do nível entre aspas, justificativa, "Linhas A a B" (clicável, destaca as linhas na folha) e, se não estiver no nível máximo, o quadro "O que corrigir". No critério 4, desvios agrupados por regra: nome da regra · linha, e a forma correta.
5. Nota zero: no lugar dos critérios, um quadro com o motivo (`zero_reason`) e a explicação; nota 0 / 30.
6. "O que corrigir na reescrita": até 3 itens numerados + "Reescrever esta redação".
7. "Avalie esta correção": "A correção ajudou você a entender o que melhorar?" com três opções (Ajudou muito, Ajudou em parte, Não ajudou), comentário opcional e "Enviar avaliação". Depois de enviada, mostra um agradecimento no lugar.
8. Rodapé: "Correção feita por IA com base nos critérios públicos da Fuvest (grade vN). Não substitui a banca."

### 10 · Meu perfil (`/perfil`)

Menu lateral com âncoras: Dados, Correções e compras, Avisos por e-mail, Privacidade.
- **Dados:** Nome (editável), E-mail (só leitura, "Você entra com Google."), Vestibular que você vai prestar; "Salvar alterações".
- **Correções e compras:** saldo e "Comprar correções"; assinatura ("Plano semanal · ativo", regra de vencimento no dia 1º, próxima cobrança, "Gerenciar assinatura"); histórico de compras com data, descrição, valor e "Recibo"; "Desistir da compra" nas compras com menos de 7 dias.
- **Avisos por e-mail:** interruptores para Correção pronta, Palavras ilegíveis pendentes ("Um lembrete 12 horas depois do aviso, se você ainda não tiver preenchido.") e Novos temas (desligado por padrão).
- **Privacidade:** "Baixar meus dados" ("Solicitar arquivo"); "Excluir minha conta", com o texto sobre anonimização, perda de créditos e exclusão por inatividade, e uma confirmação digitando "EXCLUIR".
- "Sair".

### Checkout (`/comprar`), sem design ainda

- Duas opções: Plano semanal (R$ 39,90/mês, cartão) e Correção avulsa (R$ 16, quantidade de 1 a 10, Pix ou cartão).
- Usuário de 16 ou 17 anos: caixa obrigatória "Meu responsável autorizou esta compra."
- Texto antes de pagar: "Você pode desistir em até 7 dias e receber o valor das correções não usadas. Correções já entregues não são reembolsadas."
- Pix: QR code, copia-e-cola com botão "Copiar", validade de 30 min e polling a cada 3 s até aprovar. Cartão: formulário do SDK do Mercado Pago (o número do cartão nunca passa pelo nosso código).
- Aprovado → "Pagamento aprovado" e volta para onde o aluno estava (ex.: o modal de envio).

## 6. Estados obrigatórios em toda tela com dados

- **Carregando:** esqueleto com o formato do conteúdo, sem spinner de tela cheia.
- **Vazio:** ex.: painel sem redações → "Você ainda não enviou nenhuma redação." + "Ver os temas".
- **Erro:** `message` da API + ação coerente com o `code` (tentar de novo se `retryable`).
- **Sem conexão:** aviso discreto no topo.

## 7. Textos de status para o aluno

| Status | Texto | Chip |
|---|---|---|
| `uploaded` | Lendo sua redação | azul |
| `awaiting_review` | Precisa de você | amarelo |
| `queued` | Na fila | cinza |
| `processing` | Em correção | azul |
| `completed` | Corrigida | verde |
| `failed` | Não corrigida · crédito devolvido | vermelho |
| `cancelled` | Cancelada · crédito devolvido | vermelho |
