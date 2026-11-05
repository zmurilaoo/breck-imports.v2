---
name: image-to-code
description: Recriar uma tela ou seção a partir de print, imagem ou link de referência - identifica padrão, layout, tokens e estados, mapeia para os componentes que o projeto já tem, entrega código adaptado ao DESIGN.md e verifica com screenshot lado a lado. Use quando mandarem um print/imagem/URL dizendo "faz igual", "quero algo assim", "recria essa seção", ou ao portar um layout de referência para o projeto.
---

# image-to-code — recriar vendo, sem clonar marca

## Princípio

Recriamos **estrutura e padrão** (layout, hierarquia, comportamento), vestidos com a **nossa** marca (DESIGN.md). Não copiamos logo, nome, foto, ilustração, copy nem paleta proprietária de terceiro. Se a referência é de outra loja, o resultado tem que parecer Breck.

## Passo a passo

### 1. Ler a imagem (antes de qualquer código)
Escreva, em lista curta:
- **Padrão**: hero, grade de produto, carrossel, pricing, card de login, PDP, rodapé...
- **Objetivo provável**: que ação a tela empurra? (isso decide a hierarquia)
- **Layout**: colunas, alinhamento, proporções (ex.: imagem 1:1, texto 40%), espaçamento relativo.
- **Hierarquia**: 1º, 2º, 3º elemento que o olho vê.
- **Tokens implícitos**: cores (papel, não hex), tipo (display vs. corpo), raio, sombra.
- **Estados visíveis e não visíveis**: hover, foco, vazio, erro, carregando — a imagem mostra um só; você desenha todos.
- **Responsivo**: como a imagem provavelmente quebra em 390px (se não houver print mobile, marque como suposição).

### 2. Traduzir para o sistema
- Leia o `DESIGN.md`. Cada cor/fonte da referência vira um token nosso (ex.: "azul de destaque" → `--accent`).
- Mapeie para o que já existe: `ProductCard.tsx`, `Carousel.tsx`, `BrandBanner.tsx`, `PriceBlock.tsx`, `Mascot.tsx`, classes `.btn-*`, `.product-grid`, `.container`. Reusar vence recriar.
- Só se nada servir, considere componente pronto (21st.dev, shadcn/Radix) — revise o código antes; na Breck o projeto é React + CSS puro, então adapte para classes em `src/index.css`, sem trazer Tailwind.
- Liste o que você **assumiu** (texto, comportamento, mobile) para o dono confirmar.

### 3. Codar
- Componente em `src/components/<área>/`, CSS em `src/index.css` na seção correspondente, só tokens.
- Semântica e acessibilidade desde o início (skill `web-design-guidelines`).
- Animação com `prefers-reduced-motion`; hover em `@media (hover: hover)`.
- Regras do dono (TRILHA.md): links de produto pelo modelo, nunca pela cor.

### 4. Verificar lado a lado
- Screenshot da implementação em 1366 e 390 (skill `playwright-cli`), salvos em `.taste-skill/`.
- Compare com a referência na mesma largura: estrutura, hierarquia, proporção, ritmo de espaço. **Não** busque pixel-perfeito de cor/foto alheia — busque o mesmo padrão com a nossa marca.
- Rode o checklist da `taste-skill`.
- Diga o que diverge de propósito (marca) e o que diverge por limitação.

## Entrega

1. Leitura da imagem (passo 1) em poucas linhas.
2. Mapa referência → componente/token nosso.
3. Código.
4. Screenshots antes/depois e lado a lado (caminhos).
5. Suposições a confirmar e o que não foi recriado (marca de terceiro).
6. Handoff: yellow para dados/back, qa para aceitação.

## Não faça

- Copiar logo, mascote, foto de produto ou texto da referência.
- Inventar hex novo porque "na imagem era esse tom".
- Entregar sem verificar em 390px.
- Dizer que ficou igual sem ter tirado o screenshot.
