import type { Banner, NavLink } from "../types";

export const contact = {
  whatsapp: "5511960259062",
  whatsappUrl: "https://wa.me/5511960259062",
  /** Mensagem que já vem escrita quando o cliente abre o WhatsApp pelo botão flutuante ou pela seção da loja */
  whatsappMessage: "Olá, Breck Imports! Vim pelo site e quero saber mais sobre as chuteiras. Pode me ajudar? ⚽",
  phoneDisplay: "(11) 96025-9062",
  phoneShort: "11 96025-9062",
  phoneHref: "tel:+5511960259062",
  site: "breckimports.com.br",
  siteUrl: "https://breckimports.com.br",
  address: "Rua Conselheiro Belisário 41, Shopping Stunt (ST1-177,178)",
  instagram: "https://instagram.com/breck_imports",
  instagramHandle: "@breck_imports",
};

export const announcements = ["5% OFF PAGANDO NO PIX", "FRETE GRÁTIS PARA O SUDESTE"];

const promoLinks: NavLink[] = [
  { label: "2 PARES POR R$350 (TN)", to: "/categoria/2-pares-350" },
  { label: "2 PARES POR R$400 (DN8)", to: "/categoria/2-pares-400" },
  { label: "2 PARES POR R$500", to: "/categoria/2-pares-500" },
];

const esportivosLinks: NavLink[] = [
  { label: "Adizero", to: "/categoria/adizero" },
  { label: "Adizero Prime X3", to: "/categoria/adizero-prime-x3" },
  { label: "Adidas Hyperboost", to: "/categoria/adidas-hyperboost" },
  { label: "Alphafly", to: "/categoria/alphafly" },
  { label: "Vomero", to: "/categoria/vomero" },
  { label: "On Cloud", to: "/categoria/on-cloud" },
];

const nikeLinks: NavLink[] = [
  { label: "Air Max Tn", to: "/categoria/air-max-tn" },
  { label: "Air Max Dn", to: "/categoria/air-max-dn" },
  { label: "Air Max Dn8", to: "/categoria/air-max-dn8" },
  { label: "Air Max 90", to: "/categoria/air-max-90" },
  { label: "Air Max 95", to: "/categoria/air-max-95" },
  { label: "Air Max 97", to: "/categoria/air-max-97" },
  { label: "Air Max Drift", to: "/categoria/air-max-drift" },
  { label: "Air Max Scorpion", to: "/categoria/air-max-scorpion" },
  { label: "NOCTA", to: "/categoria/nocta" },
  { label: "Bailleli", to: "/categoria/bailleli" },
];

const mizunoLinks: NavLink[] = [
  { label: "Prophecy 15", to: "/categoria/prophecy-15" },
  { label: "Prophecy 14", to: "/categoria/prophecy-14" },
  { label: "Prophecy 13", to: "/categoria/prophecy-13" },
  { label: "Sorayama", to: "/categoria/sorayama" },
];

const newBalanceLinks: NavLink[] = [
  { label: "9060", to: "/categoria/9060" },
  { label: "2000", to: "/categoria/2000" },
  { label: "530", to: "/categoria/530" },
  { label: "1000", to: "/categoria/1000" },
];

const categoryNav: NavLink[] = [
  { label: "Promoções", to: "/categoria/promocoes", children: promoLinks },
  { label: "Chuteiras", to: "/categoria/chuteiras" },
  { label: "Esportivos", to: "/categoria/esportivos", children: esportivosLinks },
  { label: "Nike", to: "/categoria/nike", children: nikeLinks },
  { label: "Mizuno", to: "/categoria/mizuno", children: mizunoLinks },
  { label: "New Balance", to: "/categoria/new-balance", children: newBalanceLinks },
  { label: "Gucci", to: "/categoria/gucci" },
  { label: "Rastreio", to: "/pagina/rastreio" },
];

export const mainNav: NavLink[] = [
  { label: "Início", to: "/" },
  { label: "Produtos", to: "/produtos", children: categoryNav },
  ...categoryNav,
];

export const mobileNav: NavLink[] = [{ label: "Início", to: "/" }, { label: "Todos os produtos", to: "/produtos" }, ...categoryNav];

/** Nome exibido para cada slug de categoria. */
export const categoryNames: Record<string, string> = {
  promocoes: "Promoções",
  "2-pares-350": "2 Pares por R$350 (TN)",
  "2-pares-400": "2 Pares por R$400 (DN8)",
  "2-pares-500": "2 Pares por R$500",
  chuteiras: "Chuteiras",
  "chuteira-campo": "Chuteiras Campo",
  "chuteira-society": "Chuteiras Society",
  "chuteira-futsal": "Chuteiras Futsal",
  mercurial: "Mercurial",
  esportivos: "Esportivos",
  adizero: "Adizero",
  "adizero-prime-x3": "Adizero Prime X3",
  "adidas-hyperboost": "Adidas Hyperboost",
  alphafly: "Alphafly",
  vomero: "Vomero",
  "on-cloud": "On Cloud",
  nike: "Nike",
  adidas: "Adidas",
  puma: "Puma",
  joma: "Joma",
  "air-max-tn": "Air Max Tn",
  "air-max-dn": "Air Max Dn",
  "air-max-dn8": "Air Max Dn8",
  "air-max-90": "Air Max 90",
  "air-max-95": "Air Max 95",
  "air-max-97": "Air Max 97",
  "air-max-drift": "Air Max Drift",
  "air-max-scorpion": "Air Max Scorpion",
  nocta: "NOCTA",
  bailleli: "Bailleli",
  mizuno: "Mizuno",
  "prophecy-15": "Prophecy 15",
  "prophecy-14": "Prophecy 14",
  "prophecy-13": "Prophecy 13",
  sorayama: "Sorayama",
  "new-balance": "New Balance",
  "9060": "9060",
  "2000": "2000",
  "530": "530",
  "1000": "1000",
  gucci: "Gucci",
};

export const hero = {
  image: "/images/hero-breck-teste.png",
  alt: "Bem-vindos à Breck Imports — maior variedade de calçados",
  to: "/produtos",
};

/**
 * Banners da home com o personagem da Breck animado por cima (posições em % do banner).
 * O personagem fica sobre as áreas onde a arte original tinha marcas apagadas.
 */
export const banners = {
  // A arte já traz o personagem e o título: sem camadas por cima
  promo500: {
    image: "/images/chuteira-chamas-meias-gratis.webp",
    alt: "Chuteira em chamas — leve uma e ganhe meias grátis",
    to: "/categoria/chuteiras",
  },
  meia: {
    image: "/images/colecao-breck-oficial.webp",
    alt: "Coleção Breck oficial — ver todas as chuteiras",
    to: "/categoria/chuteiras",
  },
  tn350: {
    image: "/images/banner-2-pares-350.webp",
    alt: "2 pares por R$350 — Air Max TN",
    to: "/categoria/2-pares-350",
    layout: "tn",
  },
  dn8: {
    image: "/images/banner-2-pares-400.webp",
    alt: "2 pares por R$400 — Air Max DN8",
    to: "/categoria/2-pares-400",
    mascots: [{ x: 82, y: -1, w: 16, fx: "climb" }],
  },
  chuteiras: {
    image: "/images/banner-chuteiras.webp",
    alt: "Coleção de chuteiras",
    to: "/categoria/mercurial",
    layout: "chuteiras",
  },
  esportes: {
    image: "/images/banner-esportes.webp",
    alt: "Esportes e academia — comprar",
    to: "/categoria/esportivos",
  },
  entrega: {
    image: "/images/breck-van.png",
    alt: "Entrega expressa para todo o Brasil — Breck Imports",
    to: "/produtos",
    streak: true,
  },
} satisfies Record<string, Banner>;

export const services = [
  { icon: "/images/icon-rastreio.png", title: "RASTREIE SEU PEDIDO", text: "Clique e veja onde está seu pedido.", to: "/pagina/rastreio" },
  { icon: "/images/icon-loja-confiavel.png", title: "LOJA CONFIÁVEL", text: "Diversos clientes e loja física com estoque pronta-entrega." },
  { icon: "/images/icon-pix.png", title: "PAGUE COM PIX", text: "Simples, seguro e com aprovação imediata." },
  { icon: "/images/icon-suporte.png", title: "SUPORTE BRECK IMPORTS", text: "Estamos prontos para te ajudar.", href: contact.whatsappUrl },
];

export const homeCategories = [
  { name: "Mercurial", image: "/images/categorias/breck-chuteira1.png", to: "/categoria/mercurial" },
  { name: "Chuteiras", image: "/images/categorias/breck-chuteira2.png", to: "/categoria/chuteiras" },
  { name: "Phantom", image: "/images/categorias/chuteira-phantom.png", to: "/categoria/chuteiras" },
  { name: "Chuteira 4", image: "/images/categorias/breck-chuteira4.png", to: "/categoria/chuteiras" },
  { name: "Chuteira 5", image: "/images/categorias/breck-chuteira5.png", to: "/categoria/chuteiras" },
];

export const faq = [
  {
    q: "A BRECK IMPORTS É CONFIAVEL?",
    a: "Sim! Temos loja física na Rua Conselheiro Belisário 41, Shopping Stunt (ST1-177,178), milhares de clientes atendidos em todo o Brasil e site protegido com certificado de segurança. Você também pode falar com a gente a qualquer momento pelo WhatsApp.",
  },
  {
    q: "QUAL PRAZO DE ENTREGA?",
    a: "O prazo varia de acordo com a sua região e é calculado no carrinho ao informar o CEP. Todos os pedidos são postados após a confirmação do pagamento — no Pix a aprovação é imediata.",
  },
  {
    q: "CONSIGO RASTREAR MINHA COMPRA?",
    a: "Sim. Assim que o pedido é postado você recebe o código de rastreio por e-mail e pode acompanhar a entrega pela página \"Rastreie Seu Pedido\".",
  },
  {
    q: "COMO SÃO REALIZADAS AS ENTREGAS?",
    a: "Enviamos para todo o Brasil via Correios e transportadoras parceiras, com embalagem reforçada. Para a região Sudeste o frete é grátis.",
  },
  {
    q: "POSSO TROCAR CASO NÃO SERVIR?",
    a: "Pode sim! Caso o tamanho não sirva, entre em contato pelo WhatsApp em até 7 dias após o recebimento para solicitar a troca. Consulte nossa Política de Reembolso e o Guia de Medidas antes de comprar.",
  },
];

export const testimonials = [
  { name: "Lucas, São Paulo", image: "/images/depo-lucas.webp", text: "Tênis top demais, sem palavras pela qualidade e excelência no trabalho de vocês." },
  { name: "Ricardo, Tocantins", image: "/images/depo-ricardo.webp", text: "Chegou tudo certo, tênis lindo e bem embalado, chegou na data prevista valeu muito a pena." },
  { name: "Igor, Belo Horizonte", image: "/images/depo-igor.webp", text: "Que chuteira fera, ja indiquei para os amigos. Em breve estou de volta para comprar mais kkk, tmj" },
  { name: "Jorge, Londrina", image: "/images/depo-jorge.webp", text: "Segundo Air Max que compro na Breck Imports, impossivel não falar dessa loja quando o assunto é tênis de alta qualidade rs." },
];

export const footerNav = [
  { label: "Início", to: "/" },
  { label: "Produtos", to: "/produtos" },
  { label: "Promoções", to: "/categoria/promocoes" },
  { label: "Chuteiras", to: "/categoria/chuteiras" },
  { label: "Esportivos", to: "/categoria/esportivos" },
  { label: "Nike", to: "/categoria/nike" },
  { label: "Mizuno", to: "/categoria/mizuno" },
  { label: "New Balance", to: "/categoria/new-balance" },
  { label: "Prazos e Entregas", to: "/pagina/prazos-e-entregas" },
  { label: "Rastreie Seu Pedido!", to: "/pagina/rastreio" },
];

export const institutionalNav = [
  { label: "Contato", to: "/pagina/contato" },
  { label: "Como Comprar", to: "/pagina/como-comprar" },
  { label: "Guia de Medidas", to: "/pagina/guia-de-medidas" },
  { label: "Política de Privacidade", to: "/pagina/politica-de-privacidade" },
  { label: "Política de Reembolso", to: "/pagina/politica-de-reembolso" },
  { label: "Termos e Condições de uso", to: "/pagina/termos-e-condicoes-de-uso" },
];

export const paymentLogos = ["visa", "mastercard", "amex", "diners", "aura", "elo", "discover", "boleto", "pix"];
