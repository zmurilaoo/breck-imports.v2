# Revisão premium ("nível Apple") — 2026-11-08

Escopo: hero, home, card de produto, página de produto, checkout. Telas em 1366 e 390.
Referência de qualidade: as páginas de produto da apple.com (foto limpa e inteira, pouco movimento, tipografia precisa, borda fina). Recriamos o padrão, sem copiar marca.
Identidade mantida: preto + amarelo, mascote, Permanent Marker nos destaques. Não mexemos na lógica de pagamento (PaymentBrick/PaymentPending/server/api).

Legenda: [FEITO] corrigido neste commit · [DEPOIS] fica para depois, com o motivo.

## Crítico

1. [FEITO] **Foto de produto cortada no card.** As 24 chuteiras novas (wa02–wa33) eram 600x800 (3:4) com a chuteira encostando nas bordas. O card e a galeria são quadrados (`aspect-ratio: 1` + `object-fit: cover`), então a ponta e o calcanhar saíam. Foram refeitas em 900x900 (1:1), com a chuteira inteira centralizada, ~9% de margem, gramado e sombra.
2. [FEITO] **Defeitos de recorte:** wa30 (pedaço vermelho solto de outra chuteira), wa27 (etiqueta preta e chuteira desfocada no calcanhar) e wa15 (chuteira desfocada atrás).
3. [FEITO] **Hero de 2 MB em PNG** (`hero-breck-teste.png`, 2172x724) era o LCP da home. Agora é WebP (256 KB) com versão de 1200px para o celular (107 KB) via `srcset`, e tem `width`/`height`, então a página não pula enquanto ele carrega (CLS).

## Alto

4. [FEITO] **Card do Ronaldinho no celular** cortava a chuteira e o botão ficava em cima do peito. Agora é um card 4:5 no celular que mostra o rosto e a Tiempo, com o botão em pílula preta no canto superior direito. O enquadramento é por imagem (`featured.position`, `mobilePosition`, `mobileAspect`, `mobileBtn`), então o card do Neymar continua igual.
5. [FEITO] **Movimento demais.** Quatro faixas douradas repintavam o fundo sem parar (linha do cabeçalho, sublinhado dos títulos, anéis das categorias, linha do rodapé), e o brilho da base do hero ficava pulsando. Em site premium o movimento acontece uma vez e para. Agora as faixas ficam paradas, o brilho do hero passa duas vezes e para, e a base fica fixa. Isso também reduz o trabalho de repintura no celular.
6. [FEITO] **Botões com amarelo "lavado".** O degradê dourado começava num creme (#fff9a8), então metade de cada botão parecia desbotada. Agora o degradê é amarelo do começo ao fim, com um leve brilho.
7. [DEPOIS] **Fotos antigas cortadas pelo card.** Todas as fotos antigas do catálogo são 3:4, e o card corta 12,5% em cima e embaixo. Na triagem visual, estas perdem parte da chuteira: `ad-f50-elite-pt-39fs3`, `ad-f50-elite-pt-campo-1bu1j`, `chuteira-de-futebol-de-campo-trava-alta-verde-fluorescente-neon-1rnlm`, `sla-1r5tl`, `sla-1to2o`, `tenis/wave-prophecy-15-branco-lipox` (caixa no topo) e `tenis/wave-prophecy-8-preto-vermelho-155mw`. Muitos pares de TN e Mizuno já encostam nas laterais na foto original. Motivo de ficar para depois: são cerca de 150 produtos com fundos reais diferentes. Precisa do mesmo processo das novas (recorte, montagem 1:1 e revisão uma a uma), num lote próprio.

## Médio

8. [FEITO] Raio inconsistente: card de destaque com 18px, ao lado de cards de produto e galeria com 10px. Os três agora usam 14px (`--radius-card`).
9. [FEITO] A borda dos cards (#2a2a2a) pesava. Agora é uma linha fina (`rgba(255,255,255,.08)`) que fica amarela suave no hover.
10. [FEITO] Tipografia: título do produto com tracking -0.01em, entrelinha 1.2 e `text-wrap: balance` (sem palavra sozinha na linha). Títulos de seção balanceados. Preços com números de largura fixa (tabular-nums). Nome no card com cinza #e8e8e8 em vez de branco puro.
11. [FEITO] Checkout: o rótulo "Total" ficava pendurado embaixo do valor grande. Agora fica alinhado ao meio.
12. [DEPOIS] Montserrat só tem os pesos 400 e 700. Títulos grandes em 700 ficam pesados; um 600 daria o acabamento "Apple". Fica para depois porque é mais uma fonte para baixar (impacto em LCP), e a decisão é do dono.
13. [DEPOIS] Botão "COMPRAR AGORA" branco e "ADICIONAR AO CARRINHO" amarelo competem na página de produto (dois CTAs fortes). Fica para depois porque mexe na conversão: precisa de teste A/B (hipótese: deixar "Comprar agora" como contorno aumenta o clique no CTA principal sem baixar a compra direta).
14. [DEPOIS] Ícones de pagamento com tamanhos e fundos diferentes (Pix sem fundo, outros com fundo branco). Fica para depois: precisa padronizar os arquivos de imagem.

## Baixo

15. [DEPOIS] O banner de cookies cobre parte dos produtos no celular até o "OK". Dá para tornar mais compacto, mas é texto legal: fica com o dono.
16. [DEPOIS] O botão do WhatsApp cobre o canto do card de produto no celular. Ajuste de posição depende de decidir o espaço de segurança junto com o growth.
17. [DEPOIS] No desktop, o botão "VER TODAS" do card do Ronaldinho ainda fica em cima da sola da chuteira. Ficou como estava para não mudar o padrão do card do Neymar no desktop.

## Verificação

- playwright em 1366 e 390 (home, card de destaque, produto, checkout): zero erro de console, zero rolagem horizontal.
- `npx tsc -b`, `npm run build` e `npm run test:e2e` (51 passaram, 1 pulado).
