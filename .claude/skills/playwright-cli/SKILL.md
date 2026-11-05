---
name: playwright-cli
description: Verificação visual da própria tela com Playwright - sobe o dev server, tira screenshots desktop 1366 e mobile 390, checa overflow horizontal e erros de console, e compara antes/depois. Use sempre que o design (ou qualquer agente) alterar algo visível e precisar conferir com navegador de verdade antes de passar ao qa. Não substitui a aceitação formal do qa nem a suíte/CI do automation.
---

# playwright-cli — o design confere a própria tela

## Quem usa o quê (divisão da trilha)

| Agente | Uso do Playwright | Onde fica |
|---|---|---|
| **design** | Verificação visual própria: screenshot, overflow, console, antes/depois. Rápido, descartável. | Script `check.cjs` (ao lado) e saída em `.taste-skill/` (ignorado no git) |
| **qa** | Aceitação formal: critérios do dono, desktop + celular, veredito APROVADO/REPROVADO/BLOQUEADO. | `e2e/` e `playwright.config.ts` (do qa) |
| **automation** | Arquitetura da suíte, flakiness com causa raiz, CI, tempo/custo da suíte. | Config/CI |

Screenshot do design é **evidência de autoverificação**, não aceite. Toda tela ainda passa no G2 (qa).

## Ambiente neste PC (Windows, Git Bash)

- Node: `"/c/Program Files/nodejs/node.exe"` (pode não estar no PATH; chame pelo caminho).
- O projeto **não** tem `@playwright/test` nem pasta `e2e/` hoje (verificado em 2026-11-04).
- Playwright 1.64.1 instalado fora do repo, em
  `C:\Users\muril\AppData\Local\Temp\claude\c--Users-muril-Downloads-breck-imports-v2\5f50643d-852b-4480-8a2d-ac318b385dc4\scratchpad\scraper\node_modules`.
  Scripts `.cjs` rodam de lá (ou com `NODE_PATH` apontando para essa pasta). É pasta temporária: se sumir, avise e peça ao dono/automation para instalar (não instale dependência no projeto sem combinar).
- Quando o projeto tiver o pacote: `npx playwright screenshot --viewport-size=1366,800 --full-page http://localhost:5173/ shot.png` e `npx playwright test` (este é do qa).

## Passo a passo

1. **Subir o dev server** em segundo plano (Bash com `run_in_background`):
   `cd "c:/Users/muril/Downloads/breck-imports.v2" && "/c/Program Files/nodejs/node.exe" node_modules/vite/bin/vite.js --port 5173 --strictPort`
   Espere responder (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` = 200).
2. **Antes**: se a mudança ainda não foi feita, tire o screenshot "antes" (ou use a produção https://breckimports.com.br como "antes", só leitura).
3. **Rodar a verificação**:
   ```
   NODE_PATH="<pasta node_modules acima>" "/c/Program Files/nodejs/node.exe" .claude/skills/playwright-cli/check.cjs http://localhost:5173/ home depois
   ```
   Argumentos: URL, nome da tela, rótulo (antes/depois). Saída em `.taste-skill/`.
4. **Ler o resultado**: o script imprime, por viewport, `overflowX` (largura do documento maior que a viewport), lista de elementos que passam da borda, erros de console e de página, e respostas HTTP >= 400.
   Atenção: `offenders` lista elementos fora da viewport mesmo quando recortados por um pai com `overflow: hidden` (ex.: slides de carrossel). O que decide é `overflowX`; use `offenders` só para achar o culpado quando `overflowX` for true.
5. **Olhar as imagens** (Read no PNG) e comparar antes/depois na mesma largura. Rode o checklist da `taste-skill`.
6. **Derrubar o servidor** ao terminar (TaskStop no processo em segundo plano).

## Critério mínimo para passar ao qa

- `overflowX: false` em 390 e 1366.
- Zero erro de console/página novo em relação ao "antes".
- Screenshots 1366 e 390 vistos por você (não só gerados).
- Animação: se a tela anima na entrada, o script espera 1,5s; cheque também com `reducedMotion` (o script tira uma variante mobile com movimento reduzido).

## Regras

- Só leitura em produção: nada de clicar em comprar, preencher checkout ou disparar webhook no site no ar.
- Não diga "verifiquei" sem ter rodado e aberto o screenshot.
- Falhou o ambiente (Node, Playwright ausente)? Reporte como BLOQUEADO na evidência, não finja.
