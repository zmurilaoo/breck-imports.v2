---
name: taste-skill
description: Senso estético e curadoria de interface. Revisa e orienta hierarquia, tipografia, espaçamento, cor e consistência com a marca, e caça o "look gerado por IA"/template antes de entregar. Use ao criar ou revisar qualquer tela, componente ou banner, quando algo "parece genérico", ou como checklist final de crítica antes de passar a entrega ao qa.
---

# taste-skill — curadoria antes de entregar

Gosto aqui não é opinião: é um conjunto de decisões verificáveis que fazem a tela parecer **da marca** e não de um template. Toda crítica sai com o porquê em termos de resultado (leitura, clique, confiança).

## Entrada obrigatória

1. Leia o `DESIGN.md` da raiz (na Breck: preto, amarelo `#ffe600`, Montserrat + Permanent Marker, mascote). Sem DESIGN.md, use a skill `awesome-design-md` para criar um antes.
2. Saiba a métrica da tela (conversão? descoberta? confiança no checkout?). Gosto serve a ela.

## Os sinais de "gerado por IA" (corte na hora)

- Gradiente roxo→azul, glassmorphism, blobs desfocados de fundo sem função.
- Emoji fazendo papel de ícone; ícones de pacotes diferentes misturados.
- Tudo centralizado, tudo do mesmo tamanho, cards idênticos em grade 3×N sem hierarquia.
- Título genérico ("Unleash your potential", "Experiência incrível") e lorem disfarçado.
- Sombra grande e difusa em tudo; raio de borda diferente em cada componente.
- Cinco pesos de fonte, três famílias, letter-spacing aleatório.
- Cor nova em hex solto no componente, fora dos tokens.
- Animação em tudo, sem `prefers-reduced-motion`.

## Os cinco eixos da crítica

1. **Hierarquia** — aperte os olhos (ou faça screenshot borrado): dá para dizer o 1º, 2º e 3º elemento? O 1º é a ação que a métrica pede? Um único destaque por área.
2. **Tipografia** — no máximo 2 famílias e os pesos carregados. Escala com contraste claro (título ≥ 1,5× o corpo). Fonte de display (Permanent Marker) só em grito curto. Linha de texto entre 45 e 75 caracteres.
3. **Espaçamento** — escala em múltiplos de 4. Espaço maior **entre** grupos do que **dentro** deles (lei da proximidade). Nada encostado na borda no celular (gutter 16px).
4. **Cor** — cor da marca é escassa e significa ação. Contraste AA (4,5:1 texto, 3:1 elemento de interface). Estados (hover, foco, erro) visivelmente diferentes.
5. **Consistência** — mesmo raio, mesma borda, mesmo botão para a mesma função. Reuse classe existente (`.btn-primary`, `.product-card`) antes de criar.

## Checklist de crítica (rode antes de entregar)

- [ ] Li o DESIGN.md e a tela usa só tokens dele (sem hex solto).
- [ ] Tem exatamente um CTA principal por área de decisão.
- [ ] Teste do borrão: a hierarquia aparece.
- [ ] Nenhum item da lista "gerado por IA" acima.
- [ ] Fonte de display usada no máximo uma vez por bloco.
- [ ] Espaçamento em múltiplos de 4, gutter respeitado em 390px.
- [ ] Contraste conferido nos pares novos.
- [ ] Estados: hover (só com `(hover: hover)`), foco visível, ativo, desabilitado, vazio, erro, carregando.
- [ ] Movimento tem propósito e desliga em `prefers-reduced-motion`.
- [ ] Copy concreta, voz da marca, sem frase de template.
- [ ] Screenshot desktop 1366 e mobile 390 conferidos (skill `playwright-cli`).
- [ ] Regras do dono (TRILHA.md) respeitadas — ex.: link pelo modelo, nunca pela cor.

## Saída da crítica

Para cada achado: `onde` (arquivo:linha ou região da tela) · `o que` · `por que importa` (resultado) · `ajuste proposto`. Separe **custa conversão/usabilidade** de **só incomoda o gosto** — o segundo grupo você lista e diz que não vai mexer.

## Pasta de saída

Screenshots e anotações de inspeção desta skill vão para `.taste-skill/` na raiz do projeto (já está no `.gitignore` como "saída das ferramentas de inspeção"). Nunca comite essa pasta. Sugestão de nomes: `.taste-skill/<data>-<tela>-<viewport>-antes.png` / `-depois.png`.

## Limites

Gosto não vence dado nem acessibilidade. Se uma escolha "feia" converte (teste ou métrica), ela fica — aplique a cerca de Chesterton e pergunte por que está assim antes de trocar.
