// Pagamento transparente com o Payment Brick do Mercado Pago (SDK JS v2 carregado do CDN oficial, sem lib no bundle).
// Cartão é tokenizado pelo SDK dentro de iframes do Mercado Pago: o nosso servidor só recebe o token.
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "../../utils/format";

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
export const MP_PUBLIC_KEY = (import.meta.env.VITE_MP_PUBLIC_KEY ?? "").trim();

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    MercadoPago?: new (key: string, opts?: { locale?: string }) => { bricks: () => { create: (...a: any[]) => Promise<{ unmount: () => void }> } };
  }
}

let sdkPromise: Promise<void> | null = null;
export function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => (window.MercadoPago ? resolve() : reject(new Error("SDK sem MercadoPago")));
    s.onerror = () => {
      sdkPromise = null;
      s.remove();
      reject(new Error("Falha ao carregar o SDK do Mercado Pago"));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export interface BrickPayer {
  email: string;
  name: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
}

export type BrickFormData = Record<string, unknown>;

interface Props {
  amount: number;
  payer: BrickPayer;
  /** Recebe o formData do Brick; resolve quando o nosso servidor respondeu (o Brick tira o loading) */
  onSubmit: (formData: BrickFormData) => Promise<void>;
  /** O Brick não carregou: a página oferece o Checkout Pro */
  onFail: () => void;
}

const CONTAINER = "co-brick";

export function PaymentBrick({ amount, payer, onSubmit, onFail }: Props) {
  const [state, setState] = useState<"loading" | "ready">("loading");
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;
  const failRef = useRef(onFail);
  failRef.current = onFail;
  const payerKey = JSON.stringify(payer);

  useEffect(() => {
    if (!MP_PUBLIC_KEY) {
      failRef.current();
      return;
    }
    let ctrl: { unmount: () => void } | null = null;
    let alive = true;
    setState("loading");
    // Sem onReady em 15 s (rede ruim, bloqueador): cai no Checkout Pro
    const timer = window.setTimeout(() => alive && failRef.current(), 15000);
    const [first, ...rest] = payer.name.trim().split(/\s+/);
    loadSdk()
      .then(async () => {
        if (!alive) return;
        const mp = new window.MercadoPago!(MP_PUBLIC_KEY, { locale: "pt-BR" });
        const c = await mp.bricks().create("payment", CONTAINER, {
          initialization: {
            amount,
            payer: {
              email: payer.email,
              firstName: first ?? "",
              lastName: rest.join(" "),
              identification: { type: "CPF", number: payer.cpf.replace(/\D/g, "") },
              address: {
                zipCode: payer.cep.replace(/\D/g, ""),
                federalUnit: payer.state,
                city: payer.city,
                neighborhood: payer.district,
                streetName: payer.street,
                streetNumber: payer.number,
              },
            },
          },
          customization: {
            // Sem "mercadoPago" (conta/login do MP) de propósito: o cliente paga sem conta
            paymentMethods: { bankTransfer: "all", creditCard: "all", debitCard: "all", ticket: "all", maxInstallments: 12 },
            visual: {
              style: {
                theme: "dark",
                customVariables: {
                  baseColor: "#ffe600",
                  baseColorFirstVariant: "#ffd400",
                  baseColorSecondVariant: "#fff04d",
                  buttonTextColor: "#111111",
                  formBackgroundColor: "#111111",
                  inputBackgroundColor: "#1a1a1a",
                  textPrimaryColor: "#f2f2f2",
                  outlinePrimaryColor: "#ffe600",
                  borderRadiusMedium: "10px",
                },
              },
            },
          },
          callbacks: {
            onReady: () => {
              window.clearTimeout(timer);
              if (alive) setState("ready");
            },
            onSubmit: ({ formData }: { selectedPaymentMethod: string; formData: BrickFormData }) => submitRef.current(formData),
            onError: (error: unknown) => {
              console.error("Payment Brick", error);
              if (alive && (error as { type?: string })?.type === "critical") failRef.current();
            },
          },
        });
        if (alive) ctrl = c;
        else c.unmount();
      })
      .catch((e) => {
        console.error(e);
        if (alive) failRef.current();
      });
    return () => {
      alive = false;
      window.clearTimeout(timer);
      ctrl?.unmount();
    };
    // Recria o Brick quando o total ou o pagador mudam (as parcelas dependem do total)
  }, [amount, payerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="co-brick" data-state={state}>
      {state === "loading" && (
        <p className="co-brick-loading" role="status">
          <span className="spinner" aria-hidden="true" /> Carregando pagamento seguro de {formatPrice(amount)}…
        </p>
      )}
      <div id={CONTAINER} />
    </div>
  );
}
