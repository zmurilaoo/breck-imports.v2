# Auditoria de design — Breck Imports (piloto)

Data: 2026-11-05 · Autor: Agente 06 (Design) · Escopo: produção https://breckimports.com.br + código em `src/` · Modo: somente leitura (nenhum código alterado, nenhum clique em "Pagar com Mercado Pago").

Evidência: screenshots em `.taste-skill/audit-2026-11-05/` (prefixo `d-` = 1366x800, `m-` = 390x844). Varredura automática (Playwright 1.64.1) em 9 rotas x 2 viewports: sem overflow horizontal, sem erro de console, todas as imagens com `alt`. Medições: home sem `<h1>`; checkout com 5 campos sem rótulo acessível; 26-36 alvos clicáveis menores que 24px por página.

Limitação: o 21st.dev não foi consultado ao vivo nesta sessão; as referências a componentes abaixo são por padrão/nome conhecido (shadcn, Magic UI, Aceternity, Origin UI) e devem ser conferidas no site antes de portar. Números de conversão citados são hipóteses a testar, não medições.

---

## Resumo executivo

O site tem identidade forte (noite de estádio, amarelo, mascote, Permanent Marker) — isso é o ativo e não deve ser diluído. O que o derruba é: (1) **promessa que não bate com a cobrança** (frete grátis Sudeste e 5% Pix anunciados na PDP, mas o checkout cobra frete para SP e não mostra desconto Pix); (2) **checkout de template** — placeholder como rótulo, sem validação por campo, sem estados ricos, resumo enterrado no mobile; (3) **vazios pretos** — home com seções de produto que renderizam como blocos vazios até carregar, e páginas curtas com ~600px de preto antes do rodapé; (4) **rodapé praticamente inexistente**, o que custa confiança (CNPJ, políticas, troca).

---

## CRÍTICO

### C1. Promessa de preço/frete diverge do checkout
- **Tela:** PDP (`m-product.png`) mostra "Frete grátis para o Sudeste" e "5% OFF pagando no Pix". Checkout com CEP 01310-100 (São Paulo, Sudeste) cobra SEDEX R$13,73 / PAC R$21,15 e o total não mostra nenhum desconto Pix (`d-checkout-cep.png`).
- **Por que importa:** quebra de confiança no último passo é a causa clássica de abandono; além disso, anúncio de condição não honrada é risco de Procon/CDC. Já está no backlog da TRILHA (item a).
- **Correção:** decisão de negócio primeiro (honrar ou remover). Design: uma única fonte de verdade de promoções (`src/data/site` ou API) consumida por PDP, carrinho e checkout; no checkout, linha "Frete grátis Sudeste" com valor riscado e linha "Desconto Pix −5%" visível quando o método for Pix (ou "a partir de R$ X no Pix" se o método for escolhido só no Mercado Pago). Handoff de cálculo para o Yellow.

### C2. Checkout sem rótulos — placeholder como label
- **Evidência:** `src/pages/CheckoutPage.tsx` linhas do JSX `<input required placeholder="Nome completo" …>` (todos os campos); varredura: 5 inputs sem `label`/`aria-label` (os demais só têm placeholder).
- **Por que importa:** WCAG 1.3.1/3.3.2 (falha AA); placeholder some ao digitar, usuário perde contexto ao revisar; leitor de tela anuncia só "editar texto". Afeta conclusão de formulário.
- **Correção:** label flutuante ou label acima de cada campo (`<label htmlFor>`), `aria-describedby` para dica/erro, `autocomplete` completo (`street-address`/`address-line2`, `address-level2`, `address-level1`), `inputMode="email"`.

### C3. Erros só no rodapé do resumo; sem validação por campo
- **Evidência:** `status.error` renderizado só dentro de `<aside className="checkout-summary">`; validação depende do balão nativo do navegador (CPF via `pattern` + `title`).
- **Por que importa:** no mobile o erro aparece longe do campo errado (o resumo está abaixo do formulário); balão nativo é inconsistente e em inglês em alguns navegadores. Erro de CPF/e-mail é o maior vazamento de formulário BR.
- **Correção:** validação inline on-blur (CPF com dígito verificador, e-mail, telefone 10-11 dígitos), mensagem embaixo do campo com `role="alert"`/`aria-live`, borda `--danger` + ícone, e foco movido ao primeiro campo inválido no submit. Criar token `--danger-ink` (DESIGN.md já aponta contraste ~3,6:1 do `--danger`).

### C4. Banner de cookies cobre conteúdo e CTA de formulário
- **Evidência:** em todas as telas (`d-checkout-cep.png` cobre Rua/Número; `m-checkout.png` cobre o Resumo; `m-product.png` cobre preço/tamanho).
- **Por que importa:** no mobile esconde preço e seletor de tamanho — os dois elementos de decisão. Também sobrepõe o botão do WhatsApp.
- **Correção:** barra fina fixa no rodapé (máx. ~64px no mobile, uma linha + botão "Ok"), com `padding-bottom` reservado no `body` enquanto visível; nunca sobre formulário. Entrada com slide-up 200ms.

### C5. Rodapé ausente = sinal de loja não confiável
- **Evidência:** `d-footer.png`, `m-checkout.png`: rodapé só "Breck Imports ©2026". Sem CNPJ, endereço, política de troca/devolução, prazo, privacidade, formas de pagamento, redes.
- **Por que importa:** e-commerce de importados vive de confiança; comprador de chuteira de R$300 procura CNPJ e troca antes de pagar (e o Código de Defesa do Consumidor/Decreto 7.962 exige CNPJ e endereço visíveis).
- **Correção:** rodapé em 4 colunas (Loja / Ajuda / Políticas / Atendimento) + faixa de selos de pagamento + CNPJ e endereço. Checkout com rodapé enxuto (só políticas + CNPJ), mas presente.

---

## ALTO

- **A1. Vazios pretos enormes.** Home (`d-home.png`): cada carrossel de produto aparece como bloco preto até carregar (sem skeleton). Páginas curtas (checkout, pedido, login, 404, PDP) têm 500-900px de preto antes do rodapé (`m-checkout.png`, `m-product.png`) — provavelmente `min-height` do `main`. Parece site quebrado. Correção: skeleton com shimmer nas grades; trocar `min-height: 100vh` por layout flex `body{display:flex;flex-direction:column}` + `main{flex:1}` (o rodapé só cola embaixo, sem vão).
- **A2. Home sem `<h1>`.** Varredura: `h1: []`. SEO e navegação por leitor de tela. Correção: h1 visualmente escondido ou o "Beja bem-vindo" como texto real.
- **A3. Resumo do pedido enterrado no mobile.** `m-checkout.png`: total só aparece depois de todo o formulário. Correção: barra "Resumo · R$ 312,73 ▾" colapsável no topo + barra fixa de total/CTA no rodapé (ver redesign).
- **A4. CTA desabilitado sem explicação.** "Pagar" fica opaco até haver frete, sem dizer o que falta. Correção: botão sempre ativo; no clique, rola/foca no primeiro passo pendente com mensagem ("Falta o CEP para calcular o frete").
- **A5. Alvos de toque pequenos.** 26-36 links/botões < 24px por página (setas de galeria, bolinhas do slider, links do topo). WCAG 2.5.8. Correção: área mínima 24px (ideal 44px) via padding/`::after` expandido.
- **A6. PDP mobile sem barra de compra fixa.** Ao rolar até a descrição o CTA some. Correção: sticky bar com preço + "Adicionar" após passar do CTA original (IntersectionObserver).
- **A7. Sem prova social.** Nenhuma avaliação/depoimento/contagem de pedidos na PDP ou checkout. Correção: bloco de depoimentos (fotos reais de clientes da loja física/Instagram) na PDP e um selo "+X pedidos enviados" no checkout — dado real, nunca inventado.

## MÉDIO

- **M1. Emoji como ícone** — `📍` no endereço do checkout e `🔥` no título de sucesso (`CheckoutPage.tsx`, objeto `results`). DESIGN.md proíbe. Trocar por ícone de `Icons.tsx`.
- **M2. Microcopy:** "até 1 dias úteis" (plural errado) → "1 dia útil"/"até N dias úteis"; mostrar data estimada ("chega até qui, 12/11") converte mais que "dias úteis" (hipótese — testar).
- **M3. Página de pedido/resultado crua** (`d-pedido-erro.png`): só título + texto. Faltam número do pedido, resumo, próximo passo, timeline (pago → separando → enviado), e no erro um "tentar de novo" que volta ao checkout com dados preservados.
- **M4. Persistência do formulário:** recarregar o checkout perde tudo. Salvar dados (exceto CPF) em `sessionStorage`.
- **M5. "Busque por modelos ou marcas."** — sem sugestões/autocomplete; busca mobile esconde-se atrás de ícone. Adicionar sugestões com imagem (command palette leve).
- **M6. Card de categoria/produto:** hover de "sobe 6px + glow" está ok no desktop, mas não há feedback de "adicionado" com animação até o carrinho; drawer abre seco.
- **M7. Login/Cadastro no header com peso igual ao carrinho** — ver seção Login.

## BAIXO

- **B1.** Hex fixos fora de token (já listados no DESIGN.md) — consolidar ao mexer.
- **B2.** Raios avulsos 14/16/18px em modais/banners → `--radius`.
- **B3.** Ícone do Pix no bloco "Formas de pagamento" aparece lavado (baixo contraste do logo sobre o quadradinho claro).
- **B4.** Título do checkout "Finalizar compra" grande demais para o pouco que comunica; trocar por stepper.

---

## Cara de IA / template

O que denuncia:
1. **Fieldsets com legenda amarela em caixa alta cortando a borda** ("SEUS DADOS", "ENTREGA") — é o visual padrão de formulário de template/HTML cru.
2. **Placeholder como rótulo + inputs todos iguais** sem hierarquia nem agrupamento lógico.
3. **Emoji como ícone** (📍, 🔥).
4. **Rodapé de uma linha** e páginas com preto vazio — sinal de "pegaram o tema e não terminaram".
5. **Páginas de sistema genéricas** (login, 404, pedido) sem nenhuma voz da marca — o mascote, o letreiro e a energia de rua somem justamente onde o cliente está mais inseguro.
6. **Blocos de "Formas de pagamento" com grid de 4 itens + fileira de bandeiras** — idêntico em PDP e checkout, cara de widget colado.

Como deixar autoral (sem perder a marca):
- **Mascote em estado de sistema:** espiando no carrinho vazio, comemorando no sucesso (com carimbo "PEDIDO CONFIRMADO" no estilo das bolinhas), coçando a cabeça no 404/erro de pagamento. Já existe `Mascot.tsx` com `crop="head"`.
- **Carimbo e fita** (linguagem que já existe na home) como elemento de confirmação: CEP encontrado → "carimbo" verde rápido; frete escolhido → selo.
- **Números grandes de placar** (Montserrat 700, tabular-nums) para total e contagem regressiva de entrega — remete a placar de estádio, é autoral e funcional.
- **Uma linha de voz por tela** em Permanent Marker ("Quase lá!" no checkout, "Partiu campo!" no sucesso) — no máximo uma, conforme DESIGN.md.

---

## Modernidade e animação

Stack atual: React 19 + Vite + CSS puro, sem dependências de UI. Recomendação: **ficar em CSS puro + Web APIs** para 80% do ganho; introduzir **uma** lib de motion só se o checkout em etapas pedir transições de layout.

| # | O que | Padrão de referência (21st.dev/libs) | Como no stack atual | Custo |
|---|---|---|---|---|
| 1 | Skeleton com shimmer nas grades e no frete | shadcn `Skeleton` | `.skeleton{background:linear-gradient(...);animation:shimmer}` + render condicional | ~0,5 dia |
| 2 | Transição entre páginas e abertura de produto | View Transitions (padrão "shared element") | `document.startViewTransition` no navigate do React Router (`viewTransition` prop no `<Link>` do RR7) + `view-transition-name` na imagem do card → PDP | ~1 dia, 0 KB |
| 3 | Scroll reveal das seções da home | Magic UI `BlurFade` / Aceternity "reveal" | `animation-timeline: view()` em CSS (com fallback de IntersectionObserver), opacity+translateY, desligado em reduced-motion | ~0,5 dia |
| 4 | "Voar pro carrinho" + badge pulando | Magic UI micro-interactions / add-to-cart | clonar imagem e animar com `transform` (WAAPI `element.animate`) até o ícone do carrinho; badge com scale bounce | ~1 dia |
| 5 | Botão com estados (idle → carregando → sucesso) | Origin UI / shadcn "loading button", Magic UI `ShinyButton` (o brilho já existe) | estado `data-state` no `.btn`, spinner SVG, check animado com `stroke-dashoffset` | ~0,5 dia |
| 6 | Número animado no total (frete entrando) | Magic UI `NumberTicker` | `requestAnimationFrame` de 300ms; `aria-live` só com o valor final | ~0,3 dia |
| 7 | Drawer/carrinho com mola e arrasto para fechar no mobile | shadcn `Drawer` (Vaul) | CSS `transition` em `translate` + pointer events para swipe | ~1 dia |
| 8 | Busca com sugestões | shadcn `Command` (cmdk) | componente próprio com listbox ARIA | ~1,5 dia |
| 9 | Marquee de marcas/depoimentos | Magic UI `Marquee` | CSS keyframes `translateX`, pausa no hover/foco | ~0,3 dia |

Libs: **Motion (ex-Framer Motion)** só se for fazer o checkout em etapas com `AnimatePresence`/layout animation — ~30-40 KB gz; alternativa sem custo: View Transitions + CSS. **Não** recomendo introduzir Tailwind agora: o design system está em custom properties e funciona; migrar custaria semanas sem ganho para o cliente. Para revender o piloto, o caminho é extrair os tokens para um arquivo de tema por loja (`theme-<loja>.css`), não trocar de framework. Componentes de 21st.dev são escritos em Tailwind: porte a estrutura e o comportamento, reescrevendo o estilo com os tokens da Breck (e revise o código de terceiro antes).

Evite (vira "cara de IA" de 2025): aurora/gradiente roxo, glassmorphism, spotlight cursor, partículas, texto com typewriter em tudo. Toda animação nova com `prefers-reduced-motion` e só `transform/opacity`.

---

## Redesign do CHECKOUT (prioridade)

Objetivo/métrica: taxa de conclusão checkout → clique em pagar (e aprovação no MP). Hipótese principal: reduzir campos visíveis, mostrar total/confiança sempre e validar inline aumenta a conclusão. Teste: medir funil por passo (eventos `checkout_step_view`, `cep_ok`, `shipping_selected`, `pay_click`) por 2 semanas antes e depois; com tráfego suficiente, A/B.

### Fluxo
Página única em **3 passos acordeão** (não três páginas — menos carregamento, e o MP já é um passo externo):
1. **Contato** — e-mail primeiro (permite recuperar carrinho abandonado), nome, WhatsApp. CPF sai daqui.
2. **Entrega** — CEP → endereço preenchido (carimbo "CEP encontrado"), número/complemento; opções de frete como cards com data estimada, aparecem logo abaixo.
3. **Pagamento** — CPF (o MP exige; explicar "para a nota fiscal"), escolha de intenção Pix/Cartão (só para mostrar o preço correto com 5% Pix), botão "Pagar R$ 312,73 no Mercado Pago".
Passo concluído colapsa em resumo de uma linha com "Editar".

### Hierarquia
- Topo: logo + "Compra segura" (cadeado) + stepper 1-2-3. Header de navegação completo **removido** no checkout (menos saída).
- Desktop: formulário 7/12, resumo sticky 5/12 (itens, cupom, subtotal, frete, desconto Pix, total grande tipo placar, CTA, selos, política de troca em 1 linha, WhatsApp).
- Mobile: barra colapsável "Ver resumo · R$ 312,73" no topo; barra fixa inferior com total + CTA contextual ("Continuar" → "Pagar").

### Estados
- **Carregando:** skeleton nas opções de frete (2 cards); botão com spinner e texto "Abrindo Mercado Pago…"; campos travados durante envio.
- **Erro:** por campo, inline, com `aria-live`; erro de frete com "tentar de novo" e fallback "combinar pelo WhatsApp"; erro de pagamento preserva os dados.
- **Sucesso:** CEP achado (carimbo), frete escolhido (check), passo concluído (colapsa com check). Página `/pedido/sucesso` com número do pedido, resumo, timeline e mascote comemorando.
- **Vazio:** carrinho vazio com mascote + 4 produtos sugeridos (não só um botão).

### Confiança
Selos de pagamento só uma vez (no resumo), política de troca em uma linha com link, CNPJ no rodapé enxuto, WhatsApp "Dúvida? Fala com a gente" discreto (não o FAB verde cobrindo o resumo), contagem real de pedidos/avaliações se houver dado.

### Mobile
`inputMode`/`autocomplete` corretos (preenchimento automático do navegador faz metade do trabalho), alvos 44px, teclado não cobrir o CTA (barra fixa respeita `env(safe-area-inset-bottom)` e `visualViewport`), sem banner de cookies no checkout.

### Estrutura de componentes (esboço)
```
CheckoutPage
├─ CheckoutHeader            (logo, cadeado, Stepper)
├─ CheckoutLayout            (grid 7/5 | coluna única)
│  ├─ CheckoutSteps
│  │  ├─ Step id="contato"   → Field(email,name,phone)
│  │  ├─ Step id="entrega"   → CepField → AddressFields → ShippingOptions(ShippingCard[] | ShippingSkeleton | ShippingError)
│  │  └─ Step id="pagamento" → Field(cpf) → PaymentIntent(pix|cartao) → PayButton(state)
│  └─ OrderSummary           (SummaryLines, Totals(AnimatedNumber), TrustRow, ExchangePolicyLine)
├─ MobileSummaryToggle
└─ MobileCheckoutBar         (total + CTA contextual)

Field: label + input + hint + error (aria-describedby, aria-invalid)
useCheckoutForm: estado, validação (cpf/email/phone), persistência sessionStorage, foco no 1º inválido
```
Tokens novos: `--danger-ink`, `--success-ink`, `--space-1..8`, `--dur-fast:150ms`, `--dur-base:250ms`, `--ease-out`. Handoff: cálculo de frete grátis/desconto Pix e `/api/checkout` com desconto → Yellow; aceitação → QA (sem clicar em pagar em produção; mock de `/api/checkout`).

---

## Login, conta e "Entrar com Google"

Visão: **convidado é o caminho principal; conta é opcional e oferecida depois da compra.** Em e-commerce de chuteira o cliente típico compra 1-3 vezes por ano; exigir conta antes de pagar é uma das causas mais citadas de abandono (Baymard lista "site queria que eu criasse conta" entre os principais motivos — conferir número atual antes de citar). 
- **Checkout:** nunca exigir login. No passo Contato, um link discreto "Já comprou aqui? Entrar" (preenche dados). 
- **Pós-compra:** na página de sucesso, "Crie sua senha para acompanhar o pedido" (só senha, e-mail já temos) ou **Entrar com Google** em 1 clique — aqui o Google faz sentido: zero digitação, alta adoção mobile. 
- **Header:** trocar "Cadastre-se | Fazer login" (dois links com peso de navegação) por um ícone de pessoa → "Minha conta / Meus pedidos". Libera espaço e reduz ruído. 
- **Valor da conta precisa existir:** rastreio de pedido, recompra, lista de desejos, aviso de volta ao estoque do tamanho. Sem isso, conta é custo sem retorno — e a página "Rastreio" do menu já resolve o principal. 
- **Para o piloto revendável:** Google Sign-In vale como feature de catálogo, mas a implementação (OAuth, sessão, LGPD) é do Yellow + Security. Hipótese a testar: "Entrar com Google" no pós-compra aumenta contas criadas sem afetar conversão.

---

## O que eu não vou mexer e por quê

- **Paleta preto + amarelo, Permanent Marker e mascote** — são a identidade e o diferencial frente às lojas genéricas; o problema é aplicação incompleta, não a marca.
- **Banners da home (Seja bem-vindo, Leve uma chuteira e ganhe um par de meia)** — arte forte e com oferta clara; só ganham carregamento e transição melhores.
- **Bolinhas de categoria por modelo** — regra do dono (link pelo modelo) e padrão que funciona no mobile.
- **Mercado Pago como checkout de pagamento** — trocar gateway é decisão de negócio/engenharia; o redesign atua antes do redirecionamento.
- **Cards de produto (estrutura)** — imagem quadrada, 2 linhas de nome, CTA no rodapé estão corretos; só alvos de toque e microinteração.
- **Busca por CEP com ViaCEP + foco automático no número** — boa decisão já existente; mantenho e só adiciono estado visual.
- **Não proponho Tailwind/migração de framework** — custo alto, zero ganho para o cliente final.

---

## Plano em fases

**Fase 1 — Quick wins (2-3 dias)**
1. Banner de cookies vira barra fina e some no checkout (0,5d)
2. Labels/autocomplete/inputMode no checkout + emoji → ícones + microcopy de frete (0,5d)
3. Corrigir vão preto antes do rodapé (flex layout) + h1 da home (0,3d)
4. Alvos de toque ≥ 24px (0,5d)
5. Alinhar promessa frete grátis/Pix com o checkout — **depende de decisão do dono + Yellow** (0,5-1d)
6. Rodapé completo com CNPJ, políticas, pagamento (0,5d)

**Fase 2 — Médio (1-1,5 semana)**
1. Checkout redesenhado (passos, validação inline, resumo sticky/mobile bar, estados) (4-5d)
2. Páginas de pedido sucesso/pendente/erro com mascote e próximo passo (1d)
3. Skeletons + scroll reveal + View Transitions card → PDP (1,5d)
4. Sticky buy bar na PDP + "voar pro carrinho" (1d)

**Fase 3 — Grande (2-4 semanas)**
1. Prova social real (depoimentos/avaliações) + data estimada de entrega (depende de dado/back)
2. Busca com sugestões (command palette)
3. Conta pós-compra + Entrar com Google + Meus pedidos (Yellow/Security)
4. Tema por loja (tokens extraídos) para revenda do piloto + documentação no DESIGN.md
5. Instrumentação de funil e primeiro A/B do checkout

Gate: toda entrega passa por playwright-cli (autoverificação) e aceitação do QA antes de produção (TRILHA.md).
