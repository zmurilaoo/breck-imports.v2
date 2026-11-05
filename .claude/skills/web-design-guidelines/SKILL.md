---
name: web-design-guidelines
description: Diretrizes de interface web (base nas Web Interface Guidelines da Vercel e no WCAG 2.2 AA) e formato de auditoria com achados por severidade e arquivo:linha. Use ao auditar ou revisar tela/componente web, antes de entregar UI nova, ou quando pedirem "revisa a acessibilidade/UX/qualidade dessa página".
---

# web-design-guidelines — diretrizes e auditoria de interface web

Referência pública consultada em 2026-11-04: Vercel Web Interface Guidelines, https://vercel.com/design/guidelines (seções: Interactions, Animations, Layout, Content, Forms, Performance, Design, Copywriting). O conteúdo abaixo é nosso, escrito a partir dela e do WCAG 2.2 (https://www.w3.org/TR/WCAG22/). A Vercel também publica uma versão para agentes; o endereço exato dela **não foi verificado** — confira na página antes de citar.

A lista completa por área está em `checklist.md` (ao lado deste arquivo). Este arquivo diz como auditar.

## Como auditar

1. **Escopo**: quais rotas/componentes. Leia o `DESIGN.md` para saber os tokens.
2. **Leitura de código**: percorra os `.tsx` e o CSS do escopo com o `checklist.md` aberto. Use Grep para atalhos:
   - `outline: none|outline: 0` sem substituto → foco sumido.
   - `transition: all` → animação cara.
   - `<div onClick` / `<span onClick` → controle sem semântica.
   - `<img` sem `alt`, sem `width/height` ou `aspect-ratio` → a11y e CLS.
   - `<input` sem `<label>`/`aria-label`, sem `type`/`autocomplete`.
   - `user-scalable=no|maximum-scale=1` → zoom bloqueado.
   - `@keyframes`/`animation` sem `prefers-reduced-motion` correspondente.
3. **Verificação real**: screenshots 1366 e 390, overflow horizontal, console e navegação só com teclado (skill `playwright-cli`).
4. **Relatório** no formato abaixo.

## Severidade

| Nível | Critério | Exemplo |
|---|---|---|
| **Crítico** | Bloqueia tarefa ou viola WCAG A/AA em fluxo de compra | Botão de pagar inacessível por teclado; campo sem rótulo no checkout |
| **Alto** | Prejudica muitos usuários ou a métrica | Contraste < 4,5:1 em texto de preço; overflow horizontal no celular; CLS visível |
| **Médio** | Atrito real, com contorno | Erro de formulário longe do campo; alvo de toque 30px |
| **Baixo** | Polimento | `transition: all`; aspas retas em copy |

## Formato do achado

```
[ALTO] src/components/product/ProductCard.tsx:42 — Imagem sem dimensões
Regra: Performance / imagens com dimensão explícita (CLS)
Evidência: <img src=...> sem width/height; o card pula ao carregar no 390px.
Correção: definir width/height ou manter aspect-ratio no wrapper (.product-card-image já tem aspect-ratio: 1 — confirmar que a img está dentro dele).
```

Regras do relatório:
- Ordene por severidade; dentro dela, por fluxo de compra primeiro.
- Todo achado tem arquivo:linha **ou** rota + viewport + screenshot.
- Separe "confirmado" (visto no navegador/código) de "suspeita" (precisa testar).
- Feche com: total por severidade, o que **não** foi auditado, e o que não vai ser mexido e por quê.

## Princípios que guiam o julgamento

- HTML nativo antes de ARIA (`<button>`, `<a href>`, `<label>`).
- Foco sempre visível e nunca coberto por header fixo (`scroll-margin-top`).
- Todo estado desenhado: vazio, carregando, erro, sucesso, parcial.
- Animar só `transform`/`opacity`; respeitar `prefers-reduced-motion`.
- Moeda e data no locale pt-BR (Intl.NumberFormat com currency BRL).
- Nada de bloquear colar, zoom ou digitação.
