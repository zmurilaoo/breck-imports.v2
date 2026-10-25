# Breck Imports — React + TypeScript

Loja Breck Imports em React 19 + TypeScript + Vite, totalmente responsiva.

## Rodar

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:5173
npm run build    # build de produção em dist/
npm run preview  # serve o build
```

## Estrutura

- `src/data/products.ts` — catálogo (75 produtos, tamanhos, preços, fotos) extraído do HTML salvo
- `src/data/site.ts` — menu, contatos, banners, FAQ, depoimentos, rodapé
- `src/components/` — header, menu mobile, carrinho, compra rápida, carrossel, seções da home
- `src/pages/` — home, produto, listagem/categoria/busca, páginas institucionais, login/cadastro
- `public/images/` — logo, banners, ícones e selos extraídos do site

O checkout envia o pedido pelo WhatsApp da loja (não há backend de pagamento).
Ao publicar, configure o servidor para redirecionar todas as rotas para `index.html` (SPA).
