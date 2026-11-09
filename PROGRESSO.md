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

## Atualização 05/11/2026 (noite) — pagamento transparente

Commits LOCAIS (não publicados, sem push): e075ad0 (promessas honestas + idempotência), 003126a (checkout 3 passos, rodapé, cookies, animações), 672e141/4b94c2a (QA: 41 testes ok), cf5a536 (Payment Brick: Pix/cartão/boleto no site, sem conta MP; e-mails via Resend), a73bb4f (security: limite anti card testing + webhook confere valor pago).
Gates: QA aprovado (checkout); Security G4 = LIBERA COM RESSALVAS (pagamento).

Falta do dono (Vercel):
- VITE_MP_PUBLIC_KEY (teste em Preview, produção em Production) e marcar evento "Pagamentos" no webhook do MP.
- Resend: conta, domínio verificado no DNS, RESEND_API_KEY e LOJA_EMAIL_REMETENTE.
- CNPJ para o rodapé.
Depois: deploy em Preview → teste com cartão APRO, Pix e boleto → QA → "sobe" do dono para produção.

Ressalvas do security para o Yellow: recusar webhook sem segredo em produção; mascarar CPF nos logs; /api/pay-status exigir reference; limite de tamanho/e-mail nos campos; CSP; aviso de pagamento duplicado.
Pendência: e-mail "pedido enviado" só sai com etiqueta paga automaticamente.

## 05/11/2026 — EM PRODUÇÃO
Pagamento dentro do site (Payment Brick: cartão, débito CAIXA, Pix, boleto) NO AR em breckimports.com.br, com animações e checkout novo. VITE_MP_PUBLIC_KEY (produção) cadastrada sem BOM — cuidado: valores enviados via PowerShell entram com BOM; use bash `printf '%s' valor | vercel env add`.
Falta do dono: marcar evento "Pagamentos" no webhook do MP (senão etiqueta/e-mail não disparam para pagamentos do Brick); conta Resend + domínio no DNS + RESEND_API_KEY/LOJA_EMAIL_REMETENTE (e-mails); CNPJ no rodapé; primeira compra real pequena para validar.

---

## Estado em 09/11/2026 (retome por aqui)

### No ar (breckimports.com.br)
- Checkout em 3 passos com pagamento DENTRO do site (Payment Brick do Mercado Pago: cartão 12x, débito CAIXA, Pix com QR, boleto) — sem conta MP. Reserva: Checkout Pro se o Brick falhar.
- Frete real SuperFrete (PAC/SEDEX) no checkout e no carrinho; etiqueta automática no carrinho da SuperFrete após pagamento (precisa do evento "Pagamentos" no webhook).
- Promessas falsas removidas (frete grátis Sudeste, desconto Pix); login falso escondido; rodapé completo (falta CNPJ).
- Animações (voar pro carrinho, botão Adicionado, transições), acabamento premium, hero 256 KB.
- Home: banners "Leve uma chuteira e ganhe um par de meia" + "Coleção de chuteiras com meias grátis"; card Neymar (Puma laranja/roxa) em Mais Compradas; card Ronaldinho em Chuteiras Campo.
- 24 chuteiras novas (F50 + Nike Phantom) das fotos do WhatsApp de 08/11 13h, fotos 1:1 em gramado, abrindo "As mais compradas".

### Só no GitHub (NÃO publicado) — aguardando decisão do dono
- 41 chuteiras de FUTSAL (fotos do WhatsApp 08/11 21h), commits 4f75e3f + b9319d2. Fotos atuais = originais com a mão, crop quadrado, fundo desfocado; chuteiras inteiras, mas aparecem as plaquinhas do fornecedor ("A1-10-1", "40ao43").
  Opções: A) subir assim; B) pedir ao fornecedor fotos sem plaquinha (recomendado); C) fotografar; D) tarjar/desfocar as plaquinhas.
  Modelos são palpite (Superfly = cano alto, Vapor = cano baixo; Phantom GX/Luna pelo formato) — confirmar com fornecedor.

### Pedidos do dono ainda pendentes
1. Webhook Mercado Pago (Produção): marcar evento "Pagamentos" — sem isso etiqueta e e-mails não disparam após pagamento no site. [dono]
2. E-mails (pedido confirmado / enviado): conta Resend + domínio no DNS da Hostinger + RESEND_API_KEY e LOJA_EMAIL_REMETENTE na Vercel. Código pronto. [dono]
3. CNPJ no rodapé (TODO em Footer.tsx e rodapé do checkout). [dono]
4. Compra real pequena de ponta a ponta (Pix) para validar pagamento → etiqueta → e-mail. [dono]
5. Futsal: decidir A/B/C/D acima e publicar. [dono → design]
6. Painel admin (subir fotos, preço, banners sem dev) — ideia aprovada em conversa, não iniciada. [yellow + design]
7. Desconto Pix real (Pix com valor próprio no servidor) — parecer pronto no yellow.md 13B. [dono decide → yellow]
8. 7 fotos antigas cortadas pelo card 1:1 (lista em docs/revisao-premium-2026-11-08.md). [design]
9. Ressalvas do security: mascarar CPF em logs, /api/pay-status exigir reference, limite de tamanho dos campos, CSP, aviso de pagamento duplicado, recusar webhook sem segredo em produção. [yellow]
10. E-mail "pedido enviado" só sai com etiqueta paga automaticamente — falta gatilho quando a etiqueta é paga no painel. [automation]
11. Plano Vercel Pro (uso comercial) e rotacionar o token SuperFrete (foi colado no chat). [dono]
12. Proposta de numeração: security = Agente 07 (design é o 06) — aguarda ok. [dono]

### Como publicar
- Deploy é manual via Vercel CLI (Vercel NÃO está ligada ao GitHub: push não publica).
- Bash: `PATH="/c/Program Files/nodejs:$APPDATA/npm:$PATH"; node "$APPDATA/npm/node_modules/vercel/dist/vc.js" deploy --prod --yes`
- Variáveis na Vercel: enviar com `printf '%s' valor | vercel env add NOME --environment production` (PowerShell injeta BOM e quebra a chave).
