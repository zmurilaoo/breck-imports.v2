# DESIGN.md — Breck Imports

Documento de design para agentes e pessoas que criam tela na Breck (breckimports.com.br). Formato inspirado no padrão DESIGN.md (coleção VoltAgent/awesome-design-md). Fonte da verdade do código: `src/index.css` (tokens em `:root`, linhas 28-55). Se este arquivo e o CSS divergirem, **o CSS vence** e este arquivo deve ser corrigido.

Última leitura do CSS: 2026-11-04.

## 1. Visão geral

Loja de chuteiras importadas. Tom visual: **noite de estádio** — fundo preto absoluto, amarelo-ouro elétrico como única cor de destaque, letreiro manuscrito (Permanent Marker) nos gritos de marca, e um mascote que "espia" banners. Energia de rua/futebol, não de luxo frio. Mobile-first: a maioria do tráfego é celular.

Três ideias que seguram a identidade:
1. Preto domina; amarelo é escasso e significa "ação" ou "destaque".
2. Montserrat faz o trabalho; Permanent Marker só grita (títulos curtos, chamadas, nomes de categoria).
3. Movimento com propósito (carimbo, brilho no botão, pulinho do mascote), sempre desligado em `prefers-reduced-motion`.

## 2. Cores

| Token | Valor | Papel |
|---|---|---|
| `--bg` / `--black` | `#000000` | Fundo da página |
| `--surface` | `#111111` | Card, drawer, campo |
| `--surface-2` | `#1a1a1a` | Fundo de imagem de produto, camada 2 |
| `--soft` | `#1a1a1a` | Bloco suave |
| `--nav-bg` | `#0d0d0d` | Navegação |
| `--line` | `#2a2a2a` | Borda e divisória |
| `--fg` | `#f2f2f2` | Texto principal |
| `--muted` | `#a3a3a3` | Texto secundário |
| `--accent` | `#ffe600` | Amarelo da marca (ação, destaque) |
| `--accent-hover` | `#ffd400` | Hover do amarelo |
| `--accent-ink` | `#ffe600` | Amarelo usado como cor de texto/foco |
| `--on-accent` | `#111111` | Texto sobre amarelo |
| `--accent-soft` | `#2a2200` | Fundo de aviso/realce discreto |
| `--grad-gold` | gradiente `#fff9a8 → #fff04d → #ffe600 → #ffd400` | Fundo do botão primário |
| `--glow` | `0 8px 28px rgba(255,220,0,.45)` | Brilho de hover (botão, card) |
| `--success` | `#12823b` | Sucesso |
| `--danger` | `#c81e1e` | Erro, borda de campo inválido |

Regras:
- Amarelo nunca vira fundo de seção inteira; é botão, selo, borda de hover, texto de destaque.
- Texto sobre amarelo é sempre `--on-accent` (preto), nunca branco.
- Não crie cor nova solta no componente. Precisa de uma? Crie o token em `:root` primeiro.
- **Contraste a revisar (cálculo aproximado, não medido com ferramenta):** `--danger` (~3,6:1) e `--success` (~4,3:1) sobre `#000` ficam abaixo de 4,5:1 para texto pequeno. Use como borda/ícone ou em texto grande/negrito; para mensagem de erro em texto corrido, prefira um tom mais claro (token novo, ex.: `--danger-ink`).
- Existem hex fixos fora dos tokens (ex.: `#ffe600` e `#fff` nas chamadas Permanent Marker da home). Ao mexer nessas áreas, troque por `var(--accent)` / `var(--fg)`.

## 3. Tipografia

Fontes self-hosted em `/public/fonts` com `font-display: swap`.

| Família | Pesos | Uso |
|---|---|---|
| Montserrat | 400, 700 | Todo o texto da interface, botões, preço |
| Permanent Marker | 400 | Destaques de marca: chamadas ("Escolhe a sua!"), nomes de categoria nas bolinhas, títulos-grito |

Padrões observados:
- Base: `line-height: 1.45`, antialiasing ligado.
- Botão: 700, `0.875rem`, caixa alta, `letter-spacing: .02em`.
- Nome no card de produto: `0.8rem`, 2 linhas no máximo (line-clamp), altura mínima reservada.
- Chamada Permanent Marker: `clamp(1rem, 2.4vw, 1.3rem)`, caixa alta, leve rotação (`--r: -2deg`), sombra amarela suave.

Regras:
- Permanent Marker: no máximo um grito por bloco, até ~4 palavras. Nunca em parágrafo, preço, formulário ou texto legal.
- Só dois pesos de Montserrat estão carregados. Não use 500/600/800: o navegador vai sintetizar.
- Use `clamp()` para tamanho de título fluido em vez de vários breakpoints.

## 4. Layout e espaçamento

- Container: `--container: 1240px`, `--gutter: 16px` nas laterais.
- `--header-h: 64px`.
- Grade de produto: 2 colunas no celular, `gap: 12px`; cresce em telas maiores.
- Breakpoints usados no CSS: `max-width: 400px`, `600px`, `min-width: 900px`; e consultas de capacidade `(hover: hover)` / `(hover: none)`.
- `html, body { overflow-x: clip }` trava arrasto lateral no iOS — nenhum componente deve depender de transbordar a viewport.
- Espaçamento observado em múltiplos de 4 (8, 10, 12, 16, 22). Não há escala de espaço tokenizada: **lacuna conhecida** (ver seção 11).

## 5. Elevação e profundidade

- Profundidade vem do degrau de superfície (`#000` → `#111` → `#1a1a1a`) e da borda `--line`, não de sombra.
- Sombra (`--shadow`) e brilho amarelo (`--glow`) aparecem só em hover/destaque.
- Mascote e sapatos recortados usam `drop-shadow` para descolar do fundo.

## 6. Formas

- `--radius: 10px` (card, painel), `--radius-sm: 6px` (botão, campo, selo).
- Pílula `999px` para chips; `50%` para bolinhas de categoria e setas.
- Raios avulsos existentes (14, 16, 18px) em modais/banners — ao criar algo novo, use os tokens.

## 7. Componentes

**Botão (`.btn`)** — altura mínima 44px, caixa alta, borda 2px.
- `.btn-primary`: gradiente ouro, texto preto; hover desloca o gradiente, aplica `--glow` e passa uma faixa de brilho. É o CTA único da área (comprar, finalizar).
- `.btn-dark`: fundo claro, texto preto; hover vira amarelo.
- `.btn-outline`: borda clara sobre `--surface`; hover inverte.
- `.btn-block` (largura total), `.btn-grow` (flex 1), `.btn-link` (texto sublinhado).
- Estados: `:active` desce 1px; `:disabled` opacidade .5.

**Card de produto (`.product-card`, `ProductCard.tsx`)** — borda `--line`, `--surface`, imagem quadrada (`aspect-ratio: 1`) com galeria por setas; nome em 2 linhas; botão de compra no rodapé (`margin-top: auto`). Hover só em dispositivo com mouse: sobe 6px, borda amarela, glow.

**Banner (`BrandBanner.tsx`, `.banner-slider`)** — carrossel com setas e bolinhas; mascote posicionado por cima (`.banner-mascot`) que dá um pulinho no hover.

**Bolinhas de categoria (home)** — círculo com chuteira, nome em Permanent Marker embaixo, entrada em "carimbo". **Regra do dono:** o link vai para o MODELO citado, nunca pela cor da foto.

**Mascote (`Mascot.tsx`)** — personagem recortado da logo, sem o letreiro; `crop="head"` mostra só cabeça e ombros para espiar pela borda. Sempre decorativo (`aria-hidden`). Não distorcer, não recolorir, não usar como botão.

**Preço (`PriceBlock.tsx`, `.price-*`)** — preço principal, preço riscado, linha Pix e parcelamento. Qualquer promessa de desconto exibida precisa bater com o valor cobrado (ver backlog TRILHA, item a).

**Foco** — `:focus-visible` global com contorno 2px `--accent-ink`, offset 2px. Não remover. Há `.skip-link` amarelo no topo.

## 8. Faça / Não faça

Faça:
- Um CTA amarelo por área de decisão.
- Fotos de produto em fundo neutro escuro, recorte limpo.
- Copy curta, direta, brasileira ("Escolhe a sua!").
- Respeitar `prefers-reduced-motion` em toda animação nova.

Não faça:
- Gradiente roxo/azul, glassmorphism, emoji como ícone, sombra colorida que não seja o glow amarelo.
- Branco como fundo de seção (quebra o tema noite).
- Permanent Marker em texto longo ou em mais de um ponto por bloco.
- `transition: all`; animar `width/height/top/left` (use `transform`/`opacity`/`translate`).
- Ligar produto pela cor.

## 9. Comportamento responsivo

- Mobile-first: estilos base são do celular; `min-width: 900px` libera o desktop (`.only-desktop`).
- Alvo de toque: 44px nos botões; mínimo 24px em qualquer controle.
- Hover decorativo somente dentro de `@media (hover: hover)` — no toque o hover "grudava".
- Verificar em 390px e 1366px (ver skill `playwright-cli`).

## 10. Guia de iteração

1. Leia este arquivo e o trecho do `index.css` do componente antes de mexer.
2. Reuse classe/token existente; crie token antes de criar valor.
3. Um componente por vez; confira com screenshot antes/depois.
4. Atualize este DESIGN.md na mesma entrega quando criar token ou componente.

## 11. Lacunas conhecidas

- Sem escala de espaçamento nem de tipografia tokenizada.
- Contraste de `--danger`/`--success` em texto pequeno (seção 2).
- Hex fixos fora dos tokens em partes da home.
- Estados de formulário (erro, ajuda) não documentados aqui; ler `.field`/checkout no CSS antes de criar.
- Logo/mascote existem só como PNG (`/images/logo-breck.png`); não há SVG.
