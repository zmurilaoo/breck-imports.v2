import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { PaymentMethods } from "../components/product/PaymentMethods";
import { useCart } from "../context/cart-context";
import { contact } from "../data/site";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatPrice } from "../utils/format";

interface ShippingOption {
  id: number;
  name: string;
  price: number;
  days: number;
}

const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);
const maskCep = (v: string) => digits(v, 8).replace(/^(\d{5})(\d)/, "$1-$2");
const maskCpf = (v: string) =>
  digits(v, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
const maskPhone = (v: string) => {
  const d = digits(v, 11);
  if (d.length <= 2) return d.replace(/^(\d+)/, "($1");
  if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, "($1) $2");
  return d.length <= 10 ? d.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3") : d.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
};

const emptyCustomer = {
  name: "",
  email: "",
  phone: "",
  cpf: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

export function CheckoutPage() {
  usePageTitle("Finalizar compra");
  const { lines, subtotal } = useCart();
  const [customer, setCustomer] = useState(emptyCustomer);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [status, setStatus] = useState<{ loading?: "frete" | "pagar"; error?: string }>({});

  const items = lines.map((l) => ({ slug: l.slug, size: l.size, quantity: l.quantity }));
  const ship = options.find((o) => o.id === shippingId);
  const set = (k: keyof typeof emptyCustomer, mask?: (v: string) => string) => (e: { target: { value: string } }) =>
    setCustomer((c) => ({ ...c, [k]: mask ? mask(e.target.value) : e.target.value }));
  const numberRef = useRef<HTMLInputElement>(null);
  // "found" = CEP achado: cidade e UF vêm prontos e o cliente só completa número e complemento
  const [cepState, setCepState] = useState<"idle" | "found" | "notfound">("idle");

  // Endereço achado: o cursor já vai para o número (o campo só existe depois do CEP)
  useEffect(() => {
    if (cepState === "found") numberRef.current?.focus();
  }, [cepState]);

  // CEP completo: preenche o endereço (ViaCEP) e busca o frete na SuperFrete
  const cepDigits = customer.cep.replace(/\D/g, "");
  useEffect(() => {
    if (cepDigits.length !== 8) return setCepState("idle");
    if (!items.length) return;
    let alive = true;
    setStatus({ loading: "frete" });
    setOptions([]);
    setShippingId(null);
    fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
      .then((r) => r.json())
      .then((a) => {
        if (!alive) return;
        if (a.erro) return setCepState("notfound");
        setCustomer((c) => ({ ...c, street: a.logradouro || "", district: a.bairro || "", city: a.localidade, state: a.uf }));
        setCepState("found");
      })
      .catch(() => alive && setCepState("notfound"));
    fetch("/api/frete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cep: cepDigits, items }) })
      .then(async (r) => {
        const data = await r.json().catch(() => ({ error: "Não foi possível calcular o frete agora" }));
        if (!alive) return;
        if (!r.ok) throw new Error(data.error);
        setOptions(data.options);
        setShippingId(data.options[0]?.id ?? null);
        setStatus({});
      })
      .catch((e: Error) => alive && setStatus({ error: e.message || "Não foi possível calcular o frete" }));
    return () => {
      alive = false;
    };
    // items muda de referência a cada render; o que importa é o conteúdo do carrinho
  }, [cepDigits, JSON.stringify(items)]);

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    if (shippingId === null) return setStatus({ error: "Escolha uma opção de frete" });
    setStatus({ loading: "pagar" });
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, customer, shippingId }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setStatus({ error: (err as Error).message || "Não foi possível iniciar o pagamento" });
    }
  };

  if (!lines.length)
    return (
      <section className="section container checkout-empty">
        <h1>Seu carrinho está vazio</h1>
        <Link to="/categoria/chuteiras" className="btn btn-primary">
          Ver chuteiras
        </Link>
      </section>
    );

  return (
    <section className="section container checkout">
      <h1 className="checkout-title">Finalizar compra</h1>
      <form className="checkout-grid" onSubmit={pay}>
        <div className="checkout-form">
          <fieldset>
            <legend>Seus dados</legend>
            <input required placeholder="Nome completo" autoComplete="name" value={customer.name} onChange={set("name")} />
            <input required type="email" placeholder="E-mail" autoComplete="email" value={customer.email} onChange={set("email")} />
            <div className="checkout-row">
              <input required placeholder="WhatsApp" inputMode="tel" autoComplete="tel" value={customer.phone} onChange={set("phone", maskPhone)} />
              <input required placeholder="CPF" inputMode="numeric" pattern="\d{3}\.\d{3}\.\d{3}-\d{2}" title="CPF com 11 números" value={customer.cpf} onChange={set("cpf", maskCpf)} />
            </div>
          </fieldset>
          <fieldset>
            <legend>Entrega</legend>
            <input required placeholder="CEP" inputMode="numeric" autoComplete="postal-code" value={customer.cep} onChange={set("cep", maskCep)} />
            {cepState === "found" && (
              <p className="checkout-address">
                📍 {customer.city} - {customer.state}
              </p>
            )}
            {cepState === "notfound" && <p className="checkout-error">CEP não encontrado. Confira os números.</p>}
            {cepState === "found" && (
              <>
                {/* CEP de rua: endereço vem pronto; CEP geral da cidade: o cliente digita rua e bairro */}
                <input required placeholder="Rua" autoComplete="address-line1" value={customer.street} onChange={set("street")} />
                <div className="checkout-row">
                  <input ref={numberRef} required placeholder="Número" inputMode="numeric" value={customer.number} onChange={set("number")} />
                  <input placeholder="Complemento" value={customer.complement} onChange={set("complement")} />
                </div>
                <input required placeholder="Bairro" value={customer.district} onChange={set("district")} />
              </>
            )}
          </fieldset>
          <fieldset>
            <legend>Frete</legend>
            {status.loading === "frete" && <p className="checkout-hint">Calculando frete…</p>}
            {!options.length && status.loading !== "frete" && <p className="checkout-hint">Digite o CEP pra ver as opções de entrega.</p>}
            {options.map((o) => (
              <label key={o.id} className={`checkout-ship${o.id === shippingId ? " is-active" : ""}`}>
                <input type="radio" name="frete" checked={o.id === shippingId} onChange={() => setShippingId(o.id)} />
                <span>
                  <strong>{o.name}</strong>
                  {o.days > 0 && <> · até {o.days} dias úteis</>}
                </span>
                <strong>{o.id === 0 ? "a combinar" : formatPrice(o.price)}</strong>
              </label>
            ))}
          </fieldset>
        </div>

        <aside className="checkout-summary">
          <h2>Resumo</h2>
          {lines.map((l) => (
            <div key={`${l.slug}-${l.size}`} className="checkout-line">
              <img src={l.product.images[0]} alt="" />
              <span>
                {l.quantity}x {l.product.name}
                <small>Tam. {l.size}</small>
              </span>
              <strong>{formatPrice(l.product.price * l.quantity)}</strong>
            </div>
          ))}
          <div className="checkout-totals">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
            <span>Frete</span>
            <span>{ship ? formatPrice(ship.price) : "—"}</span>
            <strong>Total</strong>
            <strong>{formatPrice(subtotal + (ship?.price ?? 0))}</strong>
          </div>
          {status.error && <p className="checkout-error">{status.error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={status.loading === "pagar" || !ship}>
            {status.loading === "pagar" ? "Abrindo Mercado Pago…" : "Pagar com Mercado Pago"}
          </button>
          <PaymentMethods secureSeal />
        </aside>
      </form>
    </section>
  );
}

const results = {
  sucesso: { title: "Pagamento aprovado! 🔥", text: "Seu pedido foi confirmado e já estamos separando sua chuteira. Você recebe o código de rastreio por e-mail." },
  pendente: { title: "Pagamento em análise", text: "Assim que o Mercado Pago confirmar, seu pedido é enviado. Se pagou com Pix ou boleto, pode levar alguns minutos." },
  erro: { title: "Pagamento não concluído", text: "Nada foi cobrado. Você pode tentar de novo ou chamar a gente no WhatsApp." },
} as const;

/** Página de volta do Mercado Pago: /pedido/sucesso | pendente | erro */
export function OrderResultPage() {
  const { status = "erro" } = useParams();
  const result = results[status as keyof typeof results] ?? results.erro;
  usePageTitle(result.title);
  const { clear } = useCart();
  const cleared = useRef(false);
  useEffect(() => {
    if (cleared.current || (status !== "sucesso" && status !== "pendente")) return;
    cleared.current = true;
    clear();
  }, [status, clear]);

  return (
    <section className="section container checkout-result">
      <h1>{result.title}</h1>
      <p>{result.text}</p>
      <div className="store-actions">
        <Link to="/" className="btn btn-primary">
          Voltar pra loja
        </Link>
        <a className="btn btn-outline" href={contact.whatsappUrl} target="_blank" rel="noreferrer">
          Falar no WhatsApp
        </a>
      </div>
    </section>
  );
}
