---
name: awesome-design-md
description: Ler, criar e manter o arquivo DESIGN.md de um projeto (padrão "awesome-design-md": documento em Markdown com visão, cores, tipografia, layout, componentes, faça/não faça e lacunas, para agentes gerarem UI coerente). Use antes de criar ou alterar qualquer tela, ao começar em projeto novo sem DESIGN.md, ao criar token/componente novo, ou quando a UI gerada estiver saindo fora da marca.
---

# awesome-design-md — o DESIGN.md como contrato visual

## O que é

DESIGN.md é um arquivo Markdown na raiz do projeto que descreve o sistema visual em linguagem que um agente consegue seguir: tokens, tipografia, componentes e tom. O padrão ficou conhecido pela coleção VoltAgent/awesome-design-md (https://github.com/VoltAgent/awesome-design-md), que reúne DESIGN.md extraídos de sites conhecidos em `design-md/<site>/DESIGN.md`. Fontes de terceiros atribuem o formato ao Google Stitch (https://stitch.withgoogle.com) — **não verificado** por nós na especificação oficial.

Não copiamos DESIGN.md de outra marca para dentro do projeto: eles servem de referência de estrutura. O conteúdo vem do nosso código.

Na Breck: `DESIGN.md` na raiz, gerado de `src/index.css`. **O CSS é a fonte da verdade**; o DESIGN.md é o mapa.

## Estrutura (seções na ordem)

1. Visão geral — tom visual em 3-5 frases e as 3 ideias que seguram a identidade.
2. Cores — tabela token / valor / papel, regras de uso, pares de contraste a revisar.
3. Tipografia — famílias, pesos carregados, escala, onde usar cada uma.
4. Layout e espaçamento — container, gutter, grade, breakpoints, escala.
5. Elevação e profundidade — como a profundidade é criada.
6. Formas — raios, ícones, foto/ilustração.
7. Componentes — cada um com classe/arquivo, variantes e estados.
8. Faça / Não faça.
9. Comportamento responsivo.
10. Guia de iteração.
11. Lacunas conhecidas — o que o documento ainda não cobre.

## Como LER um DESIGN.md existente (antes de qualquer tela)

1. Leia Visão, Cores, Tipografia e Faça/Não faça inteiros. Componentes: só os que você vai tocar.
2. Confira 2-3 tokens contra o CSS (`:root` em `src/index.css`). Divergiu? O CSS vence; anote para corrigir o DESIGN.md na mesma entrega.
3. Leia as Lacunas: se sua tela cai numa lacuna (ex.: estado de formulário), leia o CSS do caso e preencha a lacuna ao terminar.
4. Leia as regras do dono em `.claude/agents/TRILHA.md` — elas valem acima do DESIGN.md.

## Como CRIAR um DESIGN.md para um projeto

1. **Inventário de tokens**: Grep por `:root`, `--`, `@font-face`, `@media`, `border-radius`, `box-shadow`, `font-family` no CSS (ou `tailwind.config`/`@theme` em Tailwind).
2. **Inventário de componentes**: liste `src/components/**`, e as classes base (`.btn`, `.card`...). Registre variantes e estados (`:hover`, `:focus-visible`, `:disabled`).
3. **Hex soltos**: procure cores fora dos tokens (`#[0-9a-f]{3,6}` fora do `:root`) e liste em Cores ou Lacunas.
4. **Contraste**: calcule os pares texto/fundo principais; o que ficar abaixo de AA vai em Cores como "a revisar" (diga se foi medido ou estimado).
5. **Tom**: descreva o que a marca é a partir do que está no ar (screenshot com a skill `playwright-cli`), não do que você gostaria.
6. Escreva nas 11 seções. Afirmação que você não confirmou no código vira "hipótese" ou "lacuna".
7. Cite arquivo/linha da fonte da verdade no topo e a data da última leitura.

## Como MANTER

- Criou token ou componente? Atualize o DESIGN.md no mesmo commit.
- Mudou valor de token? Atualize a tabela e a data.
- Achou divergência? Corrija o arquivo errado (normalmente o DESIGN.md) e diga no handoff.
- Mantenha < 300 linhas: é mapa, não manual. Detalhe vai no código/comentário.

## Como USAR ao gerar tela

No início do trabalho, resuma para si: paleta permitida, fontes e onde, raio, botão principal, 3 proibições. Toda escolha da tela deve apontar para um token ou regra do DESIGN.md; o que não aponta é invenção e precisa de justificativa.
