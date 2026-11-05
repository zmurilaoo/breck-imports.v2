# PROGRESSO — Breck Imports (piloto revendável)

Última atualização: 2026-11-05 · mantido pelo orquestrador. Regras da esteira: `.claude/agents/TRILHA.md`.

**Como retomar numa sessão nova:** leia este arquivo, depois a seção "Fluxo de conversa entre agentes" da TRILHA. Continue pela "Rodada em andamento"; se ela fechou, siga as "Pendências" na ordem.

## No ar (produção, https://breckimports.com.br)

- Catálogo com cards de produto; links de banner/bolinha pelo **modelo** (regra do dono).
- Banners com card do Neymar e do Falcão (Chuteiras Campo).
- Checkout Mercado Pago via **API de Orders**, em produção.
- Frete SuperFrete com etiqueta automática (fila/estado no Upstash); CEP com autopreenchimento; frete calculado no carrinho.
- Time: 6 agentes (yellow 01, qa 02, automation 03, growth 04, orchestrator 05, design 06; security com número 07 pendente) + 5 skills de design + `DESIGN.md`.

## Pendências conhecidas (prioridade)

1. **Preço Pix anunciado ≠ cobrado** — risco CDC vivo. Decisão do dono: A (remover a promessa) ou B (desconto real no servidor).
2. **Rotacionar token SuperFrete** exposto no chat — ação do dono.
3. **Simular webhook de produção** do MP (validação x-signature) — dono dispara no painel; security revisa.
4. Etiqueta duplicada se a resposta SuperFrete se perder (idempotência) — automation → yellow.
5. **Compra real ponta a ponta** (pagamento + webhook + etiqueta), depois de 1, 3 e 4 — dono paga.
6. Proteção de Deployment no Preview (Vercel) — dono liga.
7. Vercel Hobby → Pro (uso comercial) — decisão de custo do dono.
8. Contraste dos tokens `--danger`/`--success` (WCAG AA) — design.
9. 3 detalhes do QA: selo MP fora do checkout; arrastar banner com mouse no desktop; WhatsApp sem "+55" — yellow → qa reteste.
10. Numeração: security como 07 — ok do dono.

## Rodada em andamento (2026-11-05)

| Agente | Tarefa | Estado |
|---|---|---|
| design | Auditoria geral do site (só leitura, relatório), referência 21st.dev | em andamento |
| yellow | Seção/skill de pagamentos e gateways + parecer sobre login (Google ou não) | em andamento |
| automation | CI no GitHub Actions + Playwright no projeto + e2e smoke | em andamento |
| orchestrator | TRILHA 1.2 (missão, piloto revendável, fluxo entre agentes) + este arquivo | feito |

Quando cada um fechar: registrar aqui o resultado, o gate em que parou e o próximo passo.

## Próximo passo sugerido

Fechar os 3 relatórios da rodada → dono decide Pix (A/B) e login → aplicar pela esteira (design → yellow → security → qa → dono).
