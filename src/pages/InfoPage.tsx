import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { contact } from "../data/site";
import { usePageTitle } from "../hooks/usePageTitle";
import { NotFoundPage } from "./NotFoundPage";

function TrackingForm() {
  const [code, setCode] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) window.open(`https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(c)}`, "_blank", "noopener");
  };
  return (
    <form className="tracking-form" onSubmit={submit}>
      <label htmlFor="tracking-code">Código de rastreio</label>
      <div className="tracking-row">
        <input
          id="tracking-code"
          placeholder="Ex.: AA123456789BR"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">
          Rastrear
        </button>
      </div>
    </form>
  );
}

function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = encodeURIComponent(`Olá! Meu nome é ${name}. ${message}`);
    window.open(`${contact.whatsappUrl}?text=${text}`, "_blank", "noopener");
  };
  return (
    <form className="account-form" onSubmit={submit}>
      <label>
        Nome
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Mensagem
        <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
      </label>
      <button type="submit" className="btn btn-primary">
        Enviar pelo WhatsApp
      </button>
    </form>
  );
}

const sizeTable = [
  ["34", "22,5"],
  ["35", "23"],
  ["36", "23,5"],
  ["37", "24"],
  ["38", "25"],
  ["39", "25,5"],
  ["40", "26"],
  ["41", "27"],
  ["42", "27,5"],
  ["43", "28"],
  ["44", "29"],
];

const pages: Record<string, { title: string; content: ReactNode }> = {
  rastreio: {
    title: "Rastreie Seu Pedido!",
    content: (
      <>
        <p>
          Assim que seu pedido for postado, você receberá o código de rastreio no e-mail cadastrado. Digite o código
          abaixo para acompanhar a entrega.
        </p>
        <TrackingForm />
        <p>
          Não recebeu o código? Fale com a gente pelo{" "}
          <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          .
        </p>
      </>
    ),
  },
  "prazos-e-entregas": {
    title: "Prazos e Entregas",
    content: (
      <>
        <p>Enviamos para todo o Brasil. O pedido é postado após a confirmação do pagamento — no Pix a aprovação é imediata.</p>
        <ul>
          <li>Frete grátis para a região Sudeste.</li>
          <li>O prazo de entrega é calculado no carrinho a partir do seu CEP.</li>
          <li>Você recebe o código de rastreio por e-mail assim que o pedido for postado.</li>
        </ul>
      </>
    ),
  },
  contato: {
    title: "Contato",
    content: (
      <>
        <ul className="info-contact">
          <li>
            WhatsApp:{" "}
            <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
              {contact.phoneDisplay}
            </a>
          </li>
          <li>
            Site: <a href={contact.siteUrl} target="_blank" rel="noreferrer">{contact.site}</a>
          </li>
          <li>Loja física: {contact.address}</li>
          <li>
            Instagram:{" "}
            <a href={contact.instagram} target="_blank" rel="noreferrer">
              {contact.instagramHandle}
            </a>
          </li>
        </ul>
        <ContactForm />
      </>
    ),
  },
  "como-comprar": {
    title: "Como Comprar",
    content: (
      <ol>
        <li>Escolha o modelo e clique em “Comprar”.</li>
        <li>Selecione o tamanho e adicione ao carrinho.</li>
        <li>No carrinho, confira os itens e calcule o frete pelo seu CEP.</li>
        <li>Clique em “Finalizar compra” e escolha a forma de pagamento: Pix (5% OFF), cartão em até 12x ou boleto.</li>
        <li>Pronto! Você receberá a confirmação e, após a postagem, o código de rastreio.</li>
      </ol>
    ),
  },
  "guia-de-medidas": {
    title: "Guia de Medidas",
    content: (
      <>
        <p>Meça o pé do calcanhar até a ponta do dedo maior e compare com a tabela abaixo.</p>
        <div className="table-wrap">
          <table className="size-table">
            <thead>
              <tr>
                <th>Tamanho (BR)</th>
                <th>Comprimento do pé (cm)</th>
              </tr>
            </thead>
            <tbody>
              {sizeTable.map(([br, cm]) => (
                <tr key={br}>
                  <td>{br}</td>
                  <td>{cm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Ficou em dúvida entre dois tamanhos? Fale com a gente pelo WhatsApp antes de comprar.</p>
      </>
    ),
  },
  "politica-de-privacidade": {
    title: "Política de Privacidade",
    content: (
      <>
        <p>
          A Breck Imports respeita a sua privacidade. Os dados informados (nome, e-mail, telefone e endereço) são usados
          exclusivamente para processar pedidos, realizar entregas e prestar atendimento.
        </p>
        <p>Não vendemos nem compartilhamos seus dados com terceiros, exceto parceiros de pagamento e logística necessários à compra.</p>
        <p>Utilizamos cookies para melhorar a sua experiência de navegação. Você pode desativá-los no seu navegador.</p>
      </>
    ),
  },
  "politica-de-reembolso": {
    title: "Política de Reembolso",
    content: (
      <>
        <p>Você pode solicitar troca ou devolução em até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor.</p>
        <ul>
          <li>O produto deve estar sem sinais de uso e na embalagem original.</li>
          <li>Para iniciar, entre em contato pelo WhatsApp informando o número do pedido.</li>
          <li>O reembolso é feito pela mesma forma de pagamento utilizada na compra.</li>
        </ul>
      </>
    ),
  },
  "termos-e-condicoes-de-uso": {
    title: "Termos e Condições de uso",
    content: (
      <>
        <p>Ao utilizar este site você concorda com os termos abaixo.</p>
        <ul>
          <li>Preços e condições podem ser alterados sem aviso prévio; vale o valor exibido no momento da compra.</li>
          <li>As imagens dos produtos são ilustrativas e podem apresentar pequenas variações de cor.</li>
          <li>Pedidos estão sujeitos à confirmação de pagamento e disponibilidade em estoque.</li>
        </ul>
      </>
    ),
  },
};

export function InfoPage() {
  const { slug = "" } = useParams();
  const page = pages[slug];
  usePageTitle(page?.title);
  if (!page) return <NotFoundPage />;
  return (
    <div className="container container-narrow info-page">
      <nav className="breadcrumbs" aria-label="Você está em">
        <Link to="/">Início</Link>
        <span>/</span>
        <span aria-current="page">{page.title}</span>
      </nav>
      <h1>{page.title}</h1>
      <div className="info-content">{page.content}</div>
    </div>
  );
}
