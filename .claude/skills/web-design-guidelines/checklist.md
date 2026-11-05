# Checklist de interface web (por área)

Escrito pela equipe a partir das Web Interface Guidelines da Vercel (https://vercel.com/design/guidelines) e do WCAG 2.2 AA (https://www.w3.org/TR/WCAG22/). Marque cada item como OK / FALHA / N/A.

## Acessibilidade e teclado
- Tudo operável por teclado; ordem de Tab segue a leitura visual.
- Botão de ícone tem `aria-label`; ícone decorativo tem `aria-hidden="true"`.
- Navegação é `<a href>` de verdade (abre em nova aba, copia link).
- Hierarquia de títulos sem pular nível; um `<h1>` por página.
- Skip link para o conteúdo.
- Zoom e colar nunca bloqueados.
- Contraste: 4,5:1 texto normal, 3:1 texto grande e componentes/ícones de estado.
- `lang="pt-BR"` no documento.

## Foco
- `:focus-visible` com anel visível em todo elemento focável.
- Elemento focado não fica escondido atrás de header/barra fixa (WCAG 2.4.11).
- Modal/drawer: prende o foco dentro, fecha com Esc, devolve o foco ao gatilho.

## Alvo de toque
- Mínimo 24x24px (WCAG 2.5.8); 44px recomendado no celular.
- Espaço entre alvos pequenos para não errar o toque.

## Formulários
- Todo campo tem `<label>` associado; clicar no rótulo foca o campo.
- `type` e `autocomplete` corretos (email, tel, postal-code...); `inputmode="numeric"` para CEP/CPF.
- `spellcheck="false"` em e-mail, código, CEP.
- Não desabilitar o envio antes da hora; validar e mostrar o erro ao lado do campo.
- No envio com erro, foco no primeiro campo inválido; mensagem diz como corrigir.
- Botão de envio mostra carregando e evita duplo envio durante a requisição.
- Avisar antes de perder dados não salvos.

## Estados e conteúdo
- Vazio, poucos itens, muitos itens, erro, carregando, sucesso: todos desenhados.
- Skeleton com o mesmo layout do conteúdo final.
- Toda tela tem um próximo passo (sem beco sem saída).
- Texto longo trunca com elegância (line-clamp, `min-width: 0` em flex).
- Números, moeda e data no locale do usuário.
- Mensagem de erro: o que aconteceu + como resolver, voz ativa.

## Animação
- `prefers-reduced-motion` respeitado.
- Só `transform` e `opacity` (e `translate`/`scale`); nunca `transition: all`.
- Animação interrompível; sem autoplay além de loop mudo não essencial.
- Interação em 150-300ms; mais longo só em entrada decorativa.

## Layout e responsivo
- Testado em 390 (celular), 1366 (notebook) e ultra-wide.
- Sem rolagem horizontal; `min-width: 0` em filhos de grid/flex.
- Safe areas no iOS (`env(safe-area-inset-*)`) em barras fixas.
- Tamanho resolvido por CSS (grid, flex, clamp, container queries), não por JS.
- Alinhamento deliberado; ajuste ótico quando necessário (ícone em botão).

## Performance
- Imagem com dimensão explícita ou `aspect-ratio` (CLS).
- Só imagem acima da dobra com prioridade; resto `loading="lazy"`.
- Fontes críticas pré-carregadas, subset, `font-display: swap`.
- Lista grande virtualizada.
- Mutação (POST/PATCH/DELETE) idealmente < 500ms ou com feedback otimista.
- Metas Core Web Vitals: LCP <= 2,5s, INP <= 200ms, CLS <= 0,1.

## Design
- Sombra em camadas sutis; raios aninhados coerentes (raio interno = externo - padding).
- Cores e espaços só via tokens do DESIGN.md.
