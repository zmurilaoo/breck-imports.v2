import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatedPrice } from "../components/checkout/AnimatedNumber";
import { Field } from "../components/checkout/Field";
import { loadSdk, MP_PUBLIC_KEY, PaymentBrick, type BrickFormData } from "../components/checkout/PaymentBrick";
import { BoletoPending, PixPending, type PayResult } from "../components/checkout/PaymentPending";
import {
  daysLabel,
  emptyCustomer,
  fieldError,
  maskCep,
  maskCpf,
  maskPhone,
  onlyDigits,
  STEP_FIELDS,
  STEPS,
  type Customer,
  type CustomerField,
  type StepId,
} from "../components/checkout/validation";
import { CheckIcon, LockIcon } from "../components/checkout/icons";
import { Mascot } from "../components/Mascot";
import { PaymentMethods } from "../components/product/PaymentMethods";
import { ChevronDown, PinIcon, WhatsAppIcon } from "../components/Icons";
import { useCart } from "../context/cart-context";
import { contact, institutionalNav } from "../data/site";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatPrice } from "../utils/format";

interface ShippingOption {
  id: number;
  name: string;
  price: number;
  days: number;
}

/** Dados do formulário guardados na aba (o CPF fica de fora de propósito). */
export const FORM_KEY = "breck-checkout";

function loadSaved(): { customer: Customer; step: StepId } {
  try {
    const raw = sessionStorage.getItem(FORM_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { customer: { ...emptyCustomer, ...saved.customer, cpf: "" }, step: saved.step ?? "contato" };
    }
  } catch {
    /* sem storage: começa vazio */
  }
  return { customer: emptyCustomer, step: "contato" };
}

/** Esconde cabeçalho, rodapé e flutuantes do site enquanto o checkout está aberto. */
function useCheckoutChrome() {
  useEffect(() => {
    document.body.classList.add("is-checkout");
    return () => document.body.classList.remove("is-checkout");
  }, []);
}

export function CheckoutPage() {
  usePageTitle("Finalizar compra");
  useCheckoutChrome();
  const { lines, subtotal, count } = useCart();
  const [initial] = useState(loadSaved);
  const [customer, setCustomer] = useState<Customer>(initial.customer);
  const [step, setStep] = useState<StepId>(initial.step);
  const [done, setDone] = useState<Record<StepId, boolean>>({ contato: false, entrega: false, pagamento: false });
  const [touched, setTouched] = useState<Partial<Record<CustomerField, boolean>>>({});
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [freight, setFreight] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [freightError, setFreightError] = useState("");
  const [retry, setRetry] = useState(0);
  const [cepState, setCepState] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [shipMissing, setShipMissing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Pagamento transparente (Payment Brick). Se o Brick não carregar, cai no Checkout Pro (redirect).
  const [brickFailed, setBrickFailed] = useState(!MP_PUBLIC_KEY);
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [brickRound, setBrickRound] = useState(0);
  const navigate = useNavigate();
  // Pré-carrega o SDK ao abrir o checkout: o Brick abre rápido no passo 3 e, se o SDK estiver bloqueado, o fallback já aparece
  useEffect(() => {
    if (MP_PUBLIC_KEY) loadSdk().catch(() => setBrickFailed(true));
  }, []);
  const formRef = useRef<HTMLFormElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);

  const items = lines.map((l) => ({ slug: l.slug, size: l.size, quantity: l.quantity }));
  const ship = options.find((o) => o.id === shippingId);
  const total = subtotal + (ship?.price ?? 0);
  const err = (k: CustomerField) => (touched[k] ? fieldError(k, customer) : "");
  const set = (k: CustomerField, mask?: (v: string) => string) => (e: { target: { value: string } }) =>
    setCustomer((c) => ({ ...c, [k]: mask ? mask(e.target.value) : e.target.value }));
  // No blur só valida o que já foi digitado: campo vazio só acusa ao tentar avançar
  // (evita o erro aparecer no meio do clique e empurrar o botão para baixo)
  const blur = (k: CustomerField) => () => customer[k].trim() && setTouched((t) => ({ ...t, [k]: true }));

  // Guarda o que já foi digitado (recarregar ou voltar do Mercado Pago não perde nada)
  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify({ customer: { ...customer, cpf: "" }, step }));
    } catch {
      /* storage indisponível */
    }
  }, [customer, step]);

  useEffect(() => {
    if (cepState === "found" && step === "entrega" && !customer.number) numberRef.current?.focus();
    // só quando o CEP acabou de ser achado
  }, [cepState]); // eslint-disable-line react-hooks/exhaustive-deps

  // CEP completo: preenche o endereço (ViaCEP) e busca o frete (SuperFrete)
  const cepDigits = onlyDigits(customer.cep);
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (cepDigits.length !== 8) {
      setCepState("idle");
      setFreight("idle");
      setOptions([]);
      setShippingId(null);
      return;
    }
    if (!items.length) return;
    let alive = true;
    setCepState((s) => (s === "found" ? s : "loading"));
    setFreight("loading");
    setOptions([]);
    setShippingId(null);
    fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
      .then((r) => r.json())
      .then((a) => {
        if (!alive) return;
        if (a.erro) return setCepState("notfound");
        setCustomer((c) => ({
          ...c,
          street: a.logradouro || c.street,
          district: a.bairro || c.district,
          city: a.localidade,
          state: a.uf,
        }));
        setCepState("found");
      })
      .catch(() => alive && setCepState("notfound"));
    fetch("/api/frete", { method: "POST", headers: { "Content-Type": "application/json" }, body: itemsBody(cepDigits, itemsKey) })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok || !Array.isArray(data.options) || !data.options.length)
          throw new Error(data.error || "Não conseguimos calcular o frete agora.");
        setOptions(data.options);
        setShippingId(data.options[0]?.id ?? null);
        setFreight("ok");
        setShipMissing(false);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setFreightError(e.message || "Não conseguimos calcular o frete agora.");
        setFreight("error");
      });
    return () => {
      alive = false;
    };
    // itemsKey resume o conteúdo do carrinho; items muda de referência a cada render
  }, [cepDigits, itemsKey, retry]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Valida os campos do passo; marca os inválidos e foca o primeiro. */
  const validate = (id: StepId) => {
    const fields = STEP_FIELDS[id] as readonly CustomerField[];
    const bad = fields.filter((k) => fieldError(k, customer));
    setTouched((t) => ({ ...t, ...Object.fromEntries(fields.map((k) => [k, true])) }));
    const noShip = id === "entrega" && (cepState !== "found" || shippingId === null);
    if (id === "entrega") setShipMissing(shippingId === null);
    if (bad.length) {
      requestAnimationFrame(() => document.getElementById(`co-${bad[0]}`)?.focus());
      return false;
    }
    if (noShip) {
      requestAnimationFrame(() => document.getElementById(cepState === "found" ? "co-ship" : "co-cep")?.focus());
      return false;
    }
    return true;
  };

  const goTo = (id: StepId) => {
    setStep(id);
    requestAnimationFrame(() => document.getElementById(`step-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  const advance = (id: StepId) => {
    if (!validate(id)) return;
    setDone((d) => ({ ...d, [id]: true }));
    const next = STEPS[STEPS.findIndex((s) => s.id === id) + 1];
    if (next) goTo(next.id);
  };

  const cpfOk = !fieldError("cpf", customer);
  const useBrick = !brickFailed;
  const goResult = (status: "sucesso" | "pendente", reference: string) =>
    navigate(`/pedido/${status}?external_reference=${encodeURIComponent(reference)}`);

  /** Recebe o formData do Brick, cria o pagamento no nosso servidor e mostra o resultado */
  const payWithBrick = async (formData: BrickFormData) => {
    setPayError("");
    try {
      const r = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, items, customer, shippingId }),
      });
      const data = (await r.json().catch(() => ({}))) as PayResult & { error?: string };
      if (!r.ok || !data.status) throw new Error(data.error || "Não foi possível processar o pagamento. Tente de novo.");
      if (data.status === "approved") return goResult("sucesso", data.reference);
      if (data.status === "rejected") {
        setPayError(data.message || "O pagamento não foi aprovado. Tente outro cartão ou o Pix.");
        setBrickRound((n) => n + 1); // recria o Brick para uma nova tentativa limpa
        return;
      }
      if (data.pix || data.boleto) setPayResult(data);
      else goResult("pendente", data.reference);
    } catch (error) {
      setPayError((error as Error).message);
      setBrickRound((n) => n + 1);
    }
  };

  const pay = async (e?: FormEvent) => {
    e?.preventDefault();
    if (paying) return;
    // Botão sempre ativo: se falta algo, leva o cliente até o que falta
    for (const s of STEPS) {
      if (!validate(s.id)) {
        setStep(s.id);
        return;
      }
    }
    if (useBrick) {
      // Com o Brick, o pagamento acontece no próprio passo 3: o botão só leva até ele
      setDone((d) => ({ ...d, contato: true, entrega: true }));
      requestAnimationFrame(() => document.getElementById("co-brick")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    setDone({ contato: true, entrega: true, pagamento: true });
    setPayError("");
    setPaying(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, customer, shippingId }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) throw new Error(data.error);
      window.location.href = data.url;
    } catch (error) {
      setPayError((error as Error).message || "Não foi possível abrir o Mercado Pago. Seus dados continuam aqui, tente de novo.");
      setPaying(false);
    }
  };

  const primary = () => (step === "pagamento" ? pay() : advance(step));

  if (!lines.length)
    return (
      <>
        <CheckoutTop current={null} />
        <section className="section container checkout-empty">
          <Mascot crop="head" className="checkout-mascot" />
          <h1>Seu carrinho está vazio</h1>
          <p>Escolhe a sua e volta aqui, o checkout leva menos de 2 minutos.</p>
          <Link to="/categoria/chuteiras" className="btn btn-primary">
            Ver chuteiras
          </Link>
        </section>
      </>
    );

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const summaryLine: Record<StepId, ReactNode> = {
    contato: (
      <>
        {customer.name} · {customer.email} · {customer.phone}
      </>
    ),
    entrega: (
      <>
        {customer.street}, {customer.number} · {customer.city}/{customer.state}
        {ship && <> · {ship.name}</>}
      </>
    ),
    pagamento: <>{useBrick ? "Pix, cartão ou boleto" : "Mercado Pago"}</>,
  };

  const renderStep = (id: StepId, title: string, n: number, body: ReactNode) => {
    const open = step === id;
    return (
      <section id={`step-${id}`} className={`co-step${open ? " is-open" : ""}${done[id] && !open ? " is-done" : ""}`} aria-labelledby={`step-${id}-title`}>
        <header className="co-step-head">
          <span className="co-step-num" aria-hidden="true">
            {done[id] && !open ? <CheckIcon /> : n}
          </span>
          <div className="co-step-title">
            <h2 id={`step-${id}-title`}>{title}</h2>
            {!open && done[id] && <p className="co-step-summary">{summaryLine[id]}</p>}
          </div>
          {!open && done[id] && (
            <button type="button" className="co-step-edit" onClick={() => goTo(id)} aria-label={`Editar ${title.toLowerCase()}`}>
              Editar
            </button>
          )}
        </header>
        {open && <div className="co-step-body">{body}</div>}
      </section>
    );
  };

  return (
    <>
      <CheckoutTop current={stepIndex} />
      <div className="container checkout">
        <h1 className="sr-only">Finalizar compra</h1>

        <button
          type="button"
          className="co-summary-toggle"
          aria-expanded={summaryOpen}
          aria-controls="co-summary"
          onClick={() => setSummaryOpen((o) => !o)}
        >
          <span>{summaryOpen ? "Esconder resumo" : "Ver resumo"}</span>
          <span className="co-summary-toggle-total">
            <AnimatedPrice value={total} />
            <ChevronDown size={16} />
          </span>
        </button>

        <form ref={formRef} className="checkout-grid" onSubmit={pay} noValidate>
          <fieldset className="checkout-form" disabled={paying}>
            {renderStep(
              "contato",
              "Contato",
              1,
              <>
                <Field
                  id="co-email"
                  label="E-mail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  hint="Enviamos a confirmação e o rastreio para ele."
                  value={customer.email}
                  onChange={set("email")}
                  onBlur={blur("email")}
                  error={err("email")}
                />
                <Field id="co-name" label="Nome completo" autoComplete="name" value={customer.name} onChange={set("name")} onBlur={blur("name")} error={err("name")} />
                <Field
                  id="co-phone"
                  label="WhatsApp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(11) 90000-0000"
                  value={customer.phone}
                  onChange={set("phone", maskPhone)}
                  onBlur={blur("phone")}
                  error={err("phone")}
                />
                <button type="button" className="btn btn-primary btn-block co-next" onClick={() => advance("contato")}>
                  Continuar para entrega
                </button>
              </>,
            )}

            {renderStep(
              "entrega",
              "Entrega",
              2,
              <>
                <Field
                  id="co-cep"
                  label="CEP"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  className="field-cep"
                  value={customer.cep}
                  onChange={set("cep", maskCep)}
                  onBlur={blur("cep")}
                  error={cepState === "notfound" ? "CEP não encontrado. Confira os números." : err("cep")}
                  hint={cepState === "loading" ? "Buscando endereço…" : undefined}
                />
                {cepState === "found" && (
                  <>
                    <p className="co-stamp" role="status">
                      <PinIcon size={16} /> {customer.city} - {customer.state}
                    </p>
                    <Field id="co-street" label="Rua" autoComplete="address-line1" value={customer.street} onChange={set("street")} onBlur={blur("street")} error={err("street")} />
                    <div className="checkout-row">
                      <Field
                        id="co-number"
                        label="Número"
                        inputMode="numeric"
                        autoComplete="off"
                        inputRef={numberRef}
                        value={customer.number}
                        onChange={set("number")}
                        onBlur={blur("number")}
                        error={err("number")}
                      />
                      <Field id="co-complement" label="Complemento" optional autoComplete="address-line2" value={customer.complement} onChange={set("complement")} />
                    </div>
                    <Field id="co-district" label="Bairro" autoComplete="address-level3" value={customer.district} onChange={set("district")} onBlur={blur("district")} error={err("district")} />
                  </>
                )}

                <div className="co-ship" id="co-ship" tabIndex={-1} role="radiogroup" aria-labelledby="co-ship-title" aria-busy={freight === "loading"}>
                  <h3 id="co-ship-title">Frete</h3>
                  {freight === "idle" && <p className="checkout-hint">Digite o CEP para ver as opções de entrega.</p>}
                  {freight === "loading" && (
                    <div aria-label="Calculando frete" role="status">
                      <div className="skeleton co-ship-skeleton" />
                      <div className="skeleton co-ship-skeleton" />
                    </div>
                  )}
                  {freight === "error" && (
                    <div className="co-ship-error" role="alert">
                      <p>{freightError}</p>
                      <div className="co-ship-error-actions">
                        <button type="button" className="btn btn-outline" onClick={() => setRetry((n) => n + 1)}>
                          Tentar de novo
                        </button>
                        <a
                          className="btn-link"
                          href={`${contact.whatsappUrl}?text=${encodeURIComponent(`Olá! Quero combinar o frete para o CEP ${customer.cep}.`)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <WhatsAppIcon size={16} /> Combinar pelo WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                  {options.map((o) => (
                    <label key={o.id} className={`checkout-ship${o.id === shippingId ? " is-active" : ""}`}>
                      <input type="radio" name="frete" checked={o.id === shippingId} onChange={() => setShippingId(o.id)} />
                      <span>
                        <strong>{o.name}</strong>
                        {o.days > 0 && <small>{daysLabel(o.days)}</small>}
                      </span>
                      <strong>{o.id === 0 ? "a combinar" : formatPrice(o.price)}</strong>
                    </label>
                  ))}
                  {shipMissing && freight !== "error" && freight !== "loading" && (
                    <p className="field-error">{cepState === "found" ? "Escolha uma opção de frete." : "Falta o CEP para calcular o frete."}</p>
                  )}
                </div>
                <button type="button" className="btn btn-primary btn-block co-next" onClick={() => advance("entrega")}>
                  Continuar para pagamento
                </button>
              </>,
            )}

            {renderStep(
              "pagamento",
              "Pagamento",
              3,
              <>
                <Field
                  id="co-cpf"
                  label="CPF"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  hint={useBrick ? "Necessário para o Pix, o boleto e a nota do pedido." : "O Mercado Pago pede o CPF de quem paga."}
                  value={customer.cpf}
                  onChange={set("cpf", maskCpf)}
                  onBlur={blur("cpf")}
                  error={err("cpf")}
                />
                {!useBrick && (
                  <p className="checkout-hint">
                    Você escolhe Pix, cartão em até 12x, débito ou boleto na próxima tela, já no ambiente seguro do Mercado Pago.
                  </p>
                )}
                {payError && (
                  <p className="co-pay-error" role="alert">
                    {payError}
                  </p>
                )}
                {!useBrick ? (
                  <PayButton total={total} paying={paying} className="co-pay-main" />
                ) : payResult?.pix ? (
                  <PixPending
                    result={payResult}
                    total={total}
                    onApproved={() => goResult("sucesso", payResult.reference)}
                    onRetry={() => {
                      setPayResult(null);
                      setBrickRound((n) => n + 1);
                    }}
                  />
                ) : payResult?.boleto ? (
                  <BoletoPending result={payResult} total={total} onDone={() => goResult("pendente", payResult.reference)} />
                ) : cpfOk && ship ? (
                  <PaymentBrick
                    key={brickRound}
                    amount={Math.round(total * 100) / 100}
                    payer={customer}
                    onSubmit={payWithBrick}
                    onFail={() => setBrickFailed(true)}
                  />
                ) : (
                  <p className="checkout-hint">Informe o CPF para escolher Pix, cartão em até 12x ou boleto.</p>
                )}
              </>,
            )}
            <p className="co-help">
              Dúvida? <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">Fala com a gente no WhatsApp</a>
            </p>
          </fieldset>

          <aside id="co-summary" className={`checkout-summary${summaryOpen ? " is-open" : ""}`} aria-label="Resumo do pedido">
            <h2>Resumo · {count} {count === 1 ? "item" : "itens"}</h2>
            {lines.map((l) => (
              <div key={`${l.slug}-${l.size}`} className="checkout-line">
                <span className="checkout-line-img">
                  <img src={l.product.images[0]} alt="" />
                  <span className="checkout-line-qty">{l.quantity}</span>
                </span>
                <span>
                  {l.product.name}
                  <small>Tam. {l.size}</small>
                </span>
                <strong>{formatPrice(l.product.price * l.quantity)}</strong>
              </div>
            ))}
            <dl className="checkout-totals">
              <dt>Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
              <dt>Frete</dt>
              <dd>{ship ? (ship.id === 0 ? "a combinar" : formatPrice(ship.price)) : freight === "loading" ? "calculando…" : "informe o CEP"}</dd>
              <dt className="checkout-total-label">Total</dt>
              <dd className="checkout-total-value" aria-live="polite">
                <AnimatedPrice value={total} />
              </dd>
            </dl>
            <PayButton total={total} paying={paying} className="co-pay-aside" transparent={useBrick} />
            <PaymentMethods variant="compact" />
            <p className="co-trust">
              <LockIcon /> Pagamento processado pelo Mercado Pago, sem precisar de conta. A Breck não vê os dados do seu cartão.
            </p>
            <p className="co-trust">
              Troca em até 7 dias. <Link to="/pagina/politica-de-reembolso">Ver política de trocas</Link>
            </p>
          </aside>
        </form>
      </div>

      <div className="co-bar" aria-hidden={paying || undefined}>
        <span className="co-bar-total">
          <small>Total</small>
          <AnimatedPrice value={total} />
        </span>
        <button type="button" className="btn btn-primary" onClick={primary} disabled={paying} aria-busy={paying || undefined}>
          {paying ? <Spinner /> : null}
          {paying ? "Abrindo…" : step === "pagamento" ? (useBrick ? "Ir para o pagamento" : "Pagar no Mercado Pago") : "Continuar"}
        </button>
      </div>

      <footer className="co-footer">
        <nav aria-label="Políticas">
          {institutionalNav
            .filter((l) => /privacidade|reembolso|termos/.test(l.to))
            .map((l) => (
              <Link key={l.to} to={l.to}>
                {l.to.includes("reembolso") ? "Trocas e Devoluções" : l.label}
              </Link>
            ))}
        </nav>
        {/* TODO(dono): informar o CNPJ da Breck Imports para exibir aqui e no rodapé (CDC / Decreto 7.962). */}
        <p>Breck Imports · {contact.address}</p>
      </footer>
    </>
  );
}

const itemsBody = (cep: string, itemsKey: string) => `{"cep":${JSON.stringify(cep)},"items":${itemsKey}}`;

function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

function PayButton({ total, paying, className, transparent = false }: { total: number; paying: boolean; className: string; transparent?: boolean }) {
  return (
    <button type="submit" className={`btn btn-primary btn-block co-pay ${className}`} aria-busy={paying || undefined} data-state={paying ? "loading" : "idle"}>
      {paying ? (
        <>
          <Spinner /> Abrindo Mercado Pago…
        </>
      ) : (
        <>
          <LockIcon /> Pagar {formatPrice(total)}
          {transparent ? "" : " no Mercado Pago"}
        </>
      )}
    </button>
  );
}

function CheckoutTop({ current }: { current: number | null }) {
  return (
    <div className="co-top">
      <div className="container co-top-inner">
        <Link to="/" className="co-logo" aria-label="Breck Imports, voltar para a loja">
          <img src="/images/logo-breck.webp" alt="" width={44} height={44} />
          <span>Breck Imports</span>
        </Link>
        {current !== null && (
          <ol className="co-stepper" aria-label="Etapas da compra">
            {STEPS.map((s, i) => (
              <li key={s.id} className={i < current ? "is-done" : i === current ? "is-current" : ""} aria-current={i === current ? "step" : undefined}>
                <span className="co-stepper-dot" aria-hidden="true">
                  {i < current ? <CheckIcon /> : i + 1}
                </span>
                <span className="co-stepper-label">{s.label}</span>
              </li>
            ))}
          </ol>
        )}
        <span className="co-secure">
          <LockIcon /> <span>Compra segura</span>
        </span>
      </div>
    </div>
  );
}

const results = {
  sucesso: {
    title: "Pagamento aprovado!",
    voice: "Partiu campo!",
    text: "Seu pedido foi confirmado e já estamos separando sua chuteira.",
    steps: ["Pagamento aprovado", "Separando seu pedido", "Enviado com código de rastreio", "Entregue"],
    current: 1,
  },
  pendente: {
    title: "Pagamento em análise",
    voice: "Quase lá!",
    text: "Assim que o Mercado Pago confirmar, seu pedido é enviado. Pix e boleto podem levar alguns minutos (boleto até 3 dias úteis).",
    steps: ["Pedido recebido", "Aguardando confirmação do pagamento", "Separando e enviando", "Entregue"],
    current: 1,
  },
  erro: {
    title: "Pagamento não concluído",
    voice: "Bola na trave",
    text: "Nada foi cobrado. Seus dados continuam salvos: dá pra tentar de novo com outro cartão ou pelo Pix.",
    steps: [] as string[],
    current: 0,
  },
};

/** Página de volta do Mercado Pago: /pedido/sucesso | pendente | erro */
export function OrderResultPage() {
  const { status = "erro" } = useParams();
  const [params] = useSearchParams();
  const key = (status in results ? status : "erro") as keyof typeof results;
  const result = results[key];
  usePageTitle(result.title);
  const { clear } = useCart();
  const cleared = useRef(false);
  // Mercado Pago devolve external_reference / payment_id na URL de retorno
  const order = params.get("external_reference") || params.get("merchant_order_id") || params.get("payment_id") || params.get("collection_id");

  useEffect(() => {
    if (cleared.current || (key !== "sucesso" && key !== "pendente")) return;
    cleared.current = true;
    clear();
    try {
      sessionStorage.removeItem(FORM_KEY);
    } catch {
      /* sem storage */
    }
  }, [key, clear]);

  return (
    <section className={`section container checkout-result is-${key}`}>
      <Mascot className={`checkout-mascot${key === "erro" ? " is-sad" : ""}`} />
      <p className="checkout-result-voice">{result.voice}</p>
      <h1>{result.title}</h1>
      {order && (
        <p className="checkout-result-order">
          Pedido nº <strong>{order}</strong>
        </p>
      )}
      <p>{result.text}</p>
      {result.steps.length > 0 && (
        <ol className="order-timeline" aria-label="Próximos passos">
          {result.steps.map((s, i) => (
            <li key={s} className={i < result.current ? "is-done" : i === result.current ? "is-current" : ""}>
              <span aria-hidden="true">{i < result.current ? <CheckIcon /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
      <div className="store-actions">
        {key === "erro" ? (
          <Link to="/checkout" className="btn btn-primary">
            Tentar de novo
          </Link>
        ) : (
          <Link to="/" className="btn btn-primary">
            Voltar pra loja
          </Link>
        )}
        <a
          className="btn btn-outline"
          href={`${contact.whatsappUrl}?text=${encodeURIComponent(order ? `Olá! Tenho uma dúvida sobre o pedido ${order}.` : "Olá! Tenho uma dúvida sobre meu pedido.")}`}
          target="_blank"
          rel="noreferrer"
        >
          <WhatsAppIcon size={18} /> Falar no WhatsApp
        </a>
      </div>
    </section>
  );
}
