# TRILHA DE AGENTES — Ciey / Breck Imports

Versão 1.0 · 2026-11-04 · mantido pelo Orchestrator. Mudança neste arquivo = mudança de pipeline (registrar no changelog no fim).

## Missão e dor do dono (Murilo)

- A Breck Imports (https://breckimports.com.br) é o **piloto que o dono vai revender para outras lojas**. Precisa ser "fora da curva": design atual (animação, modernidade), conversão, pagamento e frete impecáveis.
- Partes vieram de um template remodelado; ainda há trechos "crus, com cara de IA" (ex.: checkout). Caçar e eliminar isso é prioridade de design.
- Quer os agentes conversando numa esteira correta, o máximo automatizado, e o orquestrador acionando o agente certo em cada passo.
- Quer login no site (dúvida: Google ou não). O yellow é o especialista em pagamento/gateways e fluxo de compra: melhor para o cliente e para a margem do dono.
- **Limite de uso:** se a sessão chegar perto de ~97% do limite, parar o que estiver fazendo e atualizar `PROGRESSO.md` (feito / em andamento / falta). Nada fica pela metade sem registro.

## Produto piloto revendável (o que precisa virar parâmetro)

Tudo que é "da Breck" deve sair do código e ir para dado/config, para clonar a loja trocando só isso:
- **Marca:** `DESIGN.md` + tokens CSS por loja (cores, fontes, logo); nada de cor/texto da marca hardcoded em componente.
- **Catálogo por dados:** produtos, categorias, banners e links (pelo modelo) em arquivo/fonte de dados, não em JSX. Robô de catálogo (importação/atualização) como ferramenta reutilizável.
- **Chaves por variável de ambiente:** Mercado Pago, SuperFrete, Upstash, WhatsApp, domínio, CEP de origem. Um `.env.example` documentado; segredo nunca no repo.
- **Regras comerciais configuráveis:** desconto Pix, parcelamento, frete grátis, textos legais (CDC, trocas, privacidade/LGPD).
- **Esteira replicável:** CI + e2e smoke + checklist de deploy valem para qualquer loja clonada.
- Dívida que impede revenda (algo específico da Breck preso no código) entra no backlog como item de "templatização".

## Fluxo de conversa entre agentes (quem chama quem)

O orquestrador abre o briefing (G0), passa o contrato de handoff de um agente ao próximo e fecha com o dono. Agente não chama agente direto fora dessa ordem.

| Pedido | Esteira |
|---|---|
| **Tela nova / redesenho** | design (tela + `check.cjs`) → yellow (se precisa back/dados) → qa (G2) → dono (deploy) |
| **Pagamento / frete** | growth (se muda oferta/preço) → yellow (impl., gateway, cálculo no servidor) → automation (idempotência, webhook, teste) → **security (G4)** → qa → dono |
| **Login / auth** | yellow (decisão + ADR: provedor, sessão, LGPD) → design (telas de auth) → yellow (integração) → **security (G4)** → qa → dono |
| **Catálogo** | yellow/automation (dados, robô) → design (se muda card/vitrine) → qa (inclui regra do dono: link pelo modelo) → dono |
| **Deploy** | automation (CI verde: build + e2e smoke) → security se o diff toca pagamento/auth/dados → dono aprova (G5) → automation observa pós-deploy |

Regra geral: **design → yellow → security (quando toca pagamento, auth ou dado pessoal) → qa → dono para produção.**

## Regras do dono (valem para todo o time)

1. **Produto se liga pelo MODELO, nunca pela cor.** Quando um banner, bolinha, foto ou texto cita um modelo (ex.: "Vapor 15", "Phantom GX"), o link vai para um produto daquele modelo (ou da linha mais próxima, ex.: Vapor 15 → qualquer Mercurial Vapor). A cor da foto não importa. Só troque de modelo se o modelo não existir no catálogo, e diga qual usou. (Correção do dono em 04/11/2026: a bolinha "Phantom GX" foi ligada a uma Mercurial verde por causa da cor — errado.)

## 1. Roster

| # | Agente | Papel | Quando chamar | Poder de veto | Fronteira (não faz) |
|---|---|---|---|---|---|
| 01 | **yellow** | Engenharia e arquitetura full-stack, IA | Construir/alterar feature, decisão de arquitetura, análise de sistema antes de mexer | Sobre decisões técnicas de arquitetura (com ADR) | Não aceita a própria entrega (QA aceita), não faz pentest |
| 02 | **qa** | Aceitação com Playwright, desktop + celular | Depois de toda entrega visível ao cliente | **Sim**: REPROVADO/BLOQUEADO barra promoção | Só altera `e2e/` e `playwright.config.ts`; não conserta produção |
| 03 | **automation** | Automação e confiabilidade (suíte, CI, idempotência, jobs, webhooks) | Algo precisa rodar sozinho e repetido; flakiness; efeito colateral (etiqueta, webhook) | Sobre efeito colateral não idempotente em fluxo automatizado (sinaliza bloqueio) | Não decide arquitetura de app (Yellow) |
| 06 | **design** | Telas, UI, conversão visual, DESIGN.md, 5 skills de design | Toda tela nova/alterada; caçar "cara de template/IA" | Não (qa aceita) | Não faz back/deploy (yellow) |
| 07* | **security** | Pentest autorizado e dev seguro | Antes de produção em fluxo de pagamento/dados; revisão adversarial; incidente de segredo | **Sim**: crítico aberto e validado bloqueia produção | Nada ofensivo sem escopo e autorização escrita do dono; não decide arquitetura |
| 04 | **growth** | Vendas, oferta, copy, funil orgânico | Oferta, preço promocional, copy, conversão | Não (recomenda; dono decide) | Especifica requisito de negócio; técnica vai para Yellow/Automation |
| 05 | **orchestrator** | Maestro-auditor: decompõe, roteia, gateia, costura | Objetivo que envolve mais de um agente ou precisa de auditoria | **Sim**: barra entrega que não passa nos gates | Não executa domínio; não aprova irreversível |

\* Número 07 proposto, pendente de ok do dono (o arquivo `security.md` ainda diz "Agente 03"). Ver seções 7 e 9.

## 2. Contrato de handoff (obrigatório em toda entrega)

Entrada (briefing do Orchestrator): `objetivo` · `restrições` · `critério de aceite` · `já decidido` · `fora de escopo` · `teto (passos/custo)`.

Saída (do agente):
1. `feito` — o que mudou (arquivos, commits locais).
2. `decisões` — cada uma com o porquê.
3. `suposições` — marcadas como hipótese.
4. `riscos abertos` — com severidade.
5. `aceite` — quais critérios foram atendidos e como verificar.
6. `evidência` — build/teste/trace/screenshot.
7. `próximo` — quem pega e o que precisa.
8. `irreversível pendente` — o que exige aprovação humana.

Contrato incompleto = entrega devolvida sem análise de mérito.

## 3. Gates da esteira

1. **G0 Intake** — critério de aceite escrito antes de começar.
2. **G1 Determinístico** — `npm run build` e `npm run build:api` verdes, lint/types ok, nenhum segredo no diff/output, contrato completo.
3. **G2 QA** — APROVADO no desktop e no celular para a feature. REPROVADO volta ao Yellow.
4. **G3 Regressão** — suíte `e2e/` existente segue verde (o que funcionava continua funcionando).
5. **G4 Security** — obrigatório para mudanças em checkout, pagamento, webhook, frete/etiqueta, auth, dados pessoais. Crítico aberto bloqueia.
6. **G5 Humano** — irreversível só com aprovação explícita do Murilo.

**Nada vai a produção sem G1+G2+G3, e sem G4 quando aplicável.**

**Irreversível (sempre G5):** deploy em produção, commit/push em `main`, compra real, geração de etiqueta paga, mudança de preço/oferta pública, rotação/alteração de segredo, mudança de plano/cobrança Vercel, qualquer ação em dado real de cliente, teste ofensivo contra produção.

Agentes nunca leem nem imprimem segredos; segredos só na Vercel, operados pelo dono.

## 4. Tetos

- Por tarefa: até **40 passos** de ferramenta por agente; estourou, para e reporta.
- Handoffs: até **4** por objetivo antes de voltar ao dono.
- Retrabalho: a mesma entrega reprovada **2 vezes** no mesmo gate escala ao dono.
- Custo: sem gasto externo (API paga, plano, etiqueta, compra) sem G5. Teto de tokens por rodada definido pelo dono (padrão: 1 rodada = 1 objetivo).
- Loop detectado (mesma ação repetida sem progresso) = corte imediato.

## 5. Como o dono aciona o time

- Objetivo com mais de um agente: "Orchestrator, objetivo: <X>. Critério de sucesso: <Y>." O Orchestrator devolve plano + quem faz o quê antes de executar.
- Tarefa de um domínio só: chamar o agente direto (`yellow`, `qa`, etc.). O Orchestrator não é obrigatório para o simples.
- Decisão humana: o Orchestrator entrega opção A/B com recomendação; o dono responde "aprovo A".
- Status: "Orchestrator, status" — estado honesto do backlog e dos gates.

## 6. Backlog Breck (priorizado)

Legenda esforço: P (< 2h) · M (meio dia) · G (1+ dia). Status de todos: aberto.

| Pri | Item | Dono | Gate | Humano? | Esforço |
|---|---|---|---|---|---|
| 1 | **(a) Preço Pix anunciado ≠ cobrado** (R$295 / 5% off vs. preço cheio no MP) — risco CDC art. 30/35 vivo em produção. Opção A: remover promessa (rápido, estanca). Opção B: desconto real no valor do pedido Pix via API de Orders, calculado no servidor | Growth (oferta) → Yellow (impl.) | G1, G2, G3, G4 (mexe em valor de pagamento), G5 deploy | **Sim — decisão A/B** | A: P · B: M |
| 2 | **(f) Rotacionar token SuperFrete** exposto no chat | Dono executa; Security orienta e confirma revogação | G5 | **Sim — ação do dono** | P |
| 3 | **(c) Webhook MP x-signature** — confirmar validação da assinatura em produção (simulação + revisão do código em `server/`) | Security (revisão) + Automation (teste) | G1, G4 | Sim — dono dispara a simulação no painel MP | P–M |
| 4 | **(g) Etiqueta duplicada se resposta SuperFrete se perder** — chave de idempotência/reconciliação antes de nova emissão | Automation (desenho) → Yellow (impl.) | G1, G3, G4 | Não (até deploy) | M |
| 5 | **(b) Compra real ponta a ponta** (pagamento + webhook + etiqueta) — só depois de 1, 3 e 4 | QA (roteiro/evidência) + Automation (observação) | G5 | **Sim — dono paga e autoriza etiqueta**; reembolso/cancelamento planejado | P (execução) |
| 6 | **(e) Proteção de Deployment no Preview** — verificar e ligar | Security (recomenda) | G5 | Sim — dono altera na Vercel | P |
| 7 | **(h) Vercel Hobby → Pro** (Hobby veda uso comercial) | Orchestrator registra; dono decide | G5 | **Sim — decisão de custo (~US$20/mês)** | P |
| 8 | **(d) 3 reprovações de QA**: selo MP fora do checkout; arrasto de banner com mouse no desktop; WhatsApp sem "+55" | Yellow → QA reteste | G1, G2, G3 | Não (até deploy) | P–M |
| 9 | **(i) API de Preferences não usada** — confirmar ausência de código morto/credencial associada; sem ação se limpo | Yellow | G1 | Não | P |

Ordem de execução proposta: decisão (a) + rotação (f) já → (c) e (g) em paralelo → (d) em paralelo, independente → (b) como prova final → (e)/(h) administrativos.

## 7. Proposta: correção da numeração

Conflito: `automation` e `security` se declaram "Agente 03"; o `qa` (02) também conflita com o número original do automation ("Agente 02" no documento de origem).

Proposta (não aplicada; aguarda aprovação do dono):
- 01 yellow · 02 qa · 03 automation · 04 growth · 05 orchestrator · **06 security**.
- Motivo: menor mudança (só o security muda de número), preserva os números já citados nas fronteiras de yellow/qa/automation e na ordem de criação.
- Arquivos a editar quando aprovado: `security.md` (cabeçalho v1.0 e `description`), e menções "Agente 03" a security em `growth.md`/`orchestrator.md` se houver.

## 8. Changelog

- 1.0 (2026-11-04) — trilha criada no kickoff; backlog Breck inicial.
- 1.1 (2026-11-04) — design entra como 06; security proposto 07; skills de design e Playwright (seções 9 e 10).
- 1.2 (2026-11-05) — missão/dor do dono, produto piloto revendável, fluxo de conversa entre agentes por tipo de pedido, regra do limite de uso (~97% → atualizar `PROGRESSO.md`); roster com design 06 / security 07*.

## 9. Atualização 04/11/2026: agente design (06)

- Entrou o **design** (Principal Design Engineer, `design.md`) como **Agente 06**: telas que convertem, recriar por print ou descrição, código real com tokens/estados/acessibilidade, sugere componente pronto (21st.dev, shadcn) antes de reinventar. Passa back/deploy para o yellow; toda tela passa pelo qa antes de produção.
- Como o 06 ficou com o design, a proposta da seção 7 muda: **security passa a ser 07** (aguarda aprovação do dono).

## 10. Skills e Playwright (04/11/2026)

Skills do design em `.claude/skills/`: `awesome-design-md` (DESIGN.md na raiz é o contrato visual; o CSS é a fonte da verdade), `taste-skill`, `web-design-guidelines`, `image-to-code`, `playwright-cli`.

Verificação com Playwright — quem usa o quê:
- **design**: verificação visual da própria tela antes do handoff. Roda `.claude/skills/playwright-cli/check.cjs <url> <tela> <antes|depois>` contra o dev server (ou a produção, só leitura): screenshots 1366 e 390 (+ 390 com movimento reduzido), overflow horizontal, erros de console e HTTP >= 400. Saída em `.taste-skill/` (no `.gitignore`). É evidência de autoverificação, **não** aceite.
- **qa**: aceitação formal (G2) em `e2e/` + `playwright.config.ts`, veredito APROVADO/REPROVADO/BLOQUEADO.
- **automation**: arquitetura da suíte, flakiness, tempo/custo e CI.

Estado do ambiente (2026-11-04): o repo não tem `@playwright/test`, `e2e/` nem pipeline de CI (`.github/workflows` não existe). Playwright 1.64.1 roda de uma pasta temporária fora do repo (caminho na skill `playwright-cli`); se sumir, o automation/qa precisa instalar no projeto (decisão a combinar, sem gasto). Orquestrador: exija o resultado do `check.cjs` (overflowX false nas duas larguras, sem erro novo de console) na evidência do design antes de mandar ao qa.
