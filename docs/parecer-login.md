# Parecer — Login e autenticação (Breck Imports, piloto revendável)

Autor: Yellow · Data: 2026-11-05 · Status: proposta, aguardando decisão do dono

## Resposta curta

**Não exija login para comprar.** Mantenha a compra como convidado (é o que já funciona hoje) e ofereça conta como opcional, **depois** do pagamento ("acompanhe seu pedido: crie sua conta com 1 clique"). Quando a conta entrar, use **e-mail com código (OTP) + "Entrar com Google" como atalho**, **sem senha**, via **Clerk** no piloto (ou Supabase Auth se custo/lock-in pesar mais que velocidade). Até lá, **tire do ar ou esconda** as telas `/conta/login` e `/conta/cadastro`: hoje elas são formulários sem back-end, e uma tela de senha que não funciona derruba confiança e convida tentativa de credential stuffing contra nada.

## 1. Estado atual

- `src/pages/AccountPage.tsx` renderiza um formulário de e-mail e senha (`mode: "login" | "register"`) sem integração: não há provedor, sessão, nem endpoint de autenticação em `server/` ou `api/`.
- O checkout (`server/checkout.ts`) já é convidado: recebe dados do cliente, recalcula frete no servidor, cria a order no Mercado Pago e grava o pedido no Upstash Redis com TTL. Ou seja, **a loja vende sem conta hoje**.
- Stack: Vercel (funções serverless) + React/Vite (SPA) + Upstash. Sem back-end dedicado nem banco relacional.

## 2. Precisa de login?

Para comprar, não. Checkout obrigando conta é uma das maiores causas de abandono em e-commerce (ordem de grandeza de dezenas de % dos abandonos em pesquisas do Baymard Institute — **[não verificado: conferir o estudo atual]**). Para loja de tênis com ticket médio e recompra baixa-média, convidado é o padrão certo.

O que a conta destrava, e o que dá para ter **sem** conta:

| Benefício | Precisa de conta? | Alternativa sem conta |
|---|---|---|
| Rastreio do pedido | Não | Link mágico no e-mail de confirmação (`/pedido/<ref>?t=<token assinado>`) ou consulta por nº do pedido + e-mail |
| Histórico de pedidos | Sim, para ver vários juntos | Consulta por e-mail com OTP (é basicamente login sem "conta") |
| Endereço salvo / recompra | Sim | Autopreenchimento do navegador + CEP já cobre boa parte |
| Favoritos | Não necessariamente | `localStorage` (por aparelho) |
| Cartão salvo / 1-clique | Não é seu papel | A conta Mercado Pago do comprador já faz isso no Checkout Pro |
| Marketing/CRM (recompra, cupom) | Ajuda | E-mail capturado no checkout com consentimento explícito |

Conclusão: o maior valor (rastreio) se entrega com **link assinado no e-mail**, sem sistema de contas. Isso é o passo 1 e custa pouco.

## 3. Opções de método

| Método | Conversão | Custo | Segurança | Observação |
|---|---|---|---|---|
| Google (OAuth/OIDC) | Alta para quem tem conta Google (maioria no Android BR) | Grátis no Google; depende do provedor | Boa: sem senha sua para vazar; MFA é do Google | Precisa tela de consentimento OAuth verificada, domínio próprio, redirect URIs. Sozinho exclui quem não quer usar Google |
| E-mail com OTP / link mágico | Boa; funciona para todos | Custo de e-mail transacional (centavos por mil **[não verificado]**) | Boa se código curto expirar rápido (5–10 min), limite de tentativas e rate limit por e-mail e IP | Link mágico quebra quando o e-mail abre em outro app/aparelho; OTP de 6 dígitos é mais robusto no celular |
| Senha | A mais baixa (cadastro, esquecer senha) | Você paga suporte de "esqueci a senha" | A pior: hashing (Argon2id), reset seguro, credential stuffing, vazamento | Não recomendo para o piloto |
| Passkeys | Alta quando suportado | Depende do provedor | A melhor | Bom como segundo passo, não como único |

Recomendação de método: **OTP por e-mail como base + Google como atalho**, passkeys depois.

## 4. Provedores viáveis na stack (Vercel + SPA Vite + Upstash)

Preços e limites de plano gratuito mudam: **todos [não verificado — conferir a página de pricing atual]**.

| Provedor | Encaixe na stack | Custo (ordem de grandeza) | Lock-in | LGPD / dados |
|---|---|---|---|---|
| **Clerk** | Excelente: SDK React pronto, OTP + Google + passkeys, verificação de JWT em função Vercel | Gratuito até um número generoso de usuários ativos mensais, depois por MAU | Médio-alto (UI e usuários no Clerk; exporta usuários, mas migração dá trabalho) | Dados nos EUA; transferência internacional precisa estar na política de privacidade; DPA disponível |
| **Supabase Auth** | Bom: SDK JS, OTP, OAuth, magic link; traz Postgres junto (útil para pedidos/histórico depois) | Plano gratuito com limite de MAU; pago por projeto | Baixo-médio (open source, Postgres padrão, dá para auto-hospedar) | Escolha de região (há opção em São Paulo **[não verificado]**) — ponto forte para LGPD |
| **Firebase Auth** | Bom: SDK web maduro, Google nativo | Gratuito em larga faixa; SMS/fases avançadas pagas | Alto (ecossistema Google, exportação de hashes possível mas chata) | Infra Google; mesma questão de transferência internacional |
| **Auth.js** | Fraco aqui: pensado para Next.js/servidor; em SPA Vite + funções avulsas exige montar a cola | Grátis (você hospeda) | Baixo | Dados ficam com você (no Upstash, via adapter) |
| **OTP próprio** (Upstash + e-mail transacional + JWT/cookie) | Possível: ~1–2 dias de engenharia | Só o e-mail | Nenhum | Total controle, total responsabilidade |

Por que não "próprio" no piloto: autenticação é onde erro pequeno vira incidente grande (rate limit, enumeração de usuário, fixação de sessão, revogação). Para um produto que vai ser **revendido para várias lojas**, você quer um provedor que já resolve multi-tenant de aplicação (uma instância/projeto por loja) e MFA/passkeys sem você manter isso.

## 5. Recomendação para o piloto revendável

1. **Agora (sem provedor):** esconder `/conta/login` e `/conta/cadastro` do menu ou trocá-las por "Acompanhe seu pedido" (nº do pedido + e-mail, ou link assinado do e-mail de confirmação). Entrega 80% do valor de conta com quase zero superfície de ataque.
2. **Quando houver demanda de recompra/histórico:** **Clerk** com OTP por e-mail + Google, **conta oferecida depois da compra** e vinculada aos pedidos pelo e-mail verificado.
3. **Se o custo por MAU ou o lock-in incomodar na revenda**, ou se a loja precisar de banco relacional para pedidos: **Supabase Auth** (região BR, Postgres junto, menor lock-in). É o plano B e o caminho natural se o piloto evoluir para um SaaS multi-loja com dados próprios.

Cada loja revendida deve ter **sua própria instância/projeto de auth** (isolamento de usuários e chaves por tenant), nunca uma base de usuários compartilhada entre lojas.

## 6. ADR-00X — Autenticação de clientes

- **Contexto:** loja vende como convidado; telas de login existem sem back-end; stack sem servidor dedicado; produto será revendido como piloto para outras lojas; LGPD se aplica.
- **Opções:** (a) manter só convidado + rastreio por link assinado; (b) provedor gerenciado (Clerk ou Supabase) com OTP + Google; (c) senha própria; (d) OTP próprio sobre Upstash.
- **Decisão (proposta):** (a) já; (b) com Clerk quando houver caso de uso de histórico/recompra, Supabase como alternativa por custo/lock-in/região. Rejeitadas: (c) por conversão e risco; (d) por risco de segurança e custo de manutenção multiplicado por loja.
- **Consequências:** checkout continua sem atrito; dependência de terceiro para identidade (porta de mão dupla enquanto a base de usuários for pequena, vira mão única com o tempo — reavaliar antes de ~mil contas); transferência internacional de dados a declarar se Clerk; custo variável por MAU a repassar no preço da revenda.

## 7. Modelo de ameaça resumido (STRIDE)

| Ameaça | Onde | Controle |
|---|---|---|
| Spoofing: credential stuffing / força bruta de OTP | Login | Sem senha; OTP de 6 dígitos com expiração curta, máximo de tentativas, rate limit por e-mail e IP, CAPTCHA adaptativo |
| Spoofing: link de rastreio adivinhável | `/pedido/<ref>` | Token HMAC assinado com expiração; nunca só `reference` (ela é previsível em parte: `BRK-<timestamp36>-<4 hex>`) |
| Tampering: JWT forjado ou não validado na função | `server/*` | Validar assinatura, `iss`, `aud`, `exp` com a biblioteca do provedor; nada de `alg: none` |
| Repudiation | Alterações de conta/endereço | Log de auditoria sem dado pessoal completo |
| Information disclosure: enumeração de e-mail, IDOR em pedidos | Login, histórico | Mesma resposta para e-mail existente ou não; pedido só retornado se `customer.email == email verificado da sessão` |
| Information disclosure: token em `localStorage` | SPA | Preferir cookie HttpOnly/Secure/SameSite do provedor; CSP restritiva contra XSS |
| DoS / custo: abuso de envio de OTP | Endpoint de e-mail | Rate limit no Upstash, teto diário de envios, alerta de custo |
| Elevation: painel admin junto com conta de cliente | Futuro admin | Papéis separados; admin com MFA obrigatório e outra origem/rota |
| Account takeover via Google | OAuth | Usar `email_verified`, vincular por `sub` e não só e-mail, validar `state`/PKCE |

## 8. O que o security precisa revisar

1. Rate limit e bloqueio de tentativas de OTP/login (por e-mail, IP e global).
2. Validação de sessão/JWT em toda função que devolver dado de pedido (IDOR em histórico e rastreio).
3. Token de link de rastreio: assinatura, expiração, ausência de dado pessoal na URL.
4. Configuração OAuth do Google: redirect URIs exatos, `state`, PKCE, domínio verificado.
5. Armazenamento de sessão no cliente (cookie vs storage) e CSP do site.
6. LGPD: política de privacidade atualizada (operador de auth, transferência internacional, retenção), fluxo de exclusão de conta.
7. Isolamento por tenant na revenda: chaves e base de usuários separadas por loja.

## 9. O que eu não vou mexer e por quê

- `src/pages/AccountPage.tsx`, `server/`, `api/`: fora do escopo deste parecer (só recomendação; outros agentes estão nos arquivos).
- Checkout atual: funciona como convidado e não precisa mudar para receber auth.
