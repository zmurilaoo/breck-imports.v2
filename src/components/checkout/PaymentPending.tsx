// Telas de Pix (QR + copia e cola + contador + polling) e boleto (abrir/copiar) depois de criar o pagamento.
import { useEffect, useState } from "react";
import { formatPrice } from "../../utils/format";

export interface PayResult {
  status: string;
  statusDetail: string;
  paymentId: string;
  reference: string;
  message?: string;
  pix?: { qrCode: string; qrCodeBase64: string; ticketUrl: string; expiresAt: string | null };
  boleto?: { url: string; barcode: string | null; expiresAt: string | null };
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };
  return { copied, copy };
}

function useCountdown(expiresAt: string | null) {
  const end = expiresAt ? Date.parse(expiresAt) : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!Number.isFinite(end)) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [end]);
  if (!Number.isFinite(end)) return null;
  const left = Math.max(0, Math.floor((end - now) / 1000));
  return { left, label: `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}` };
}

/** Consulta /api/pay-status até aprovar (ou recusar/expirar) */
function usePaymentStatus(id: string, active: boolean, onApproved: () => void) {
  const [status, setStatus] = useState("pending");
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let timer = 0;
    const tick = async () => {
      try {
        const r = await fetch(`/api/pay-status?id=${encodeURIComponent(id)}`);
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (d.status) setStatus(d.status);
        if (d.status === "approved") return onApproved();
        if (d.status === "rejected" || d.status === "cancelled") return;
      } catch {
        /* rede oscilou: tenta de novo */
      }
      if (alive) timer = window.setTimeout(tick, 4000);
    };
    timer = window.setTimeout(tick, 4000);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [id, active]); // eslint-disable-line react-hooks/exhaustive-deps
  return status;
}

export function PixPending({ result, total, onApproved, onRetry }: { result: PayResult; total: number; onApproved: () => void; onRetry: () => void }) {
  const pix = result.pix!;
  const { copied, copy } = useCopy();
  const countdown = useCountdown(pix.expiresAt);
  const expired = countdown?.left === 0;
  const status = usePaymentStatus(result.paymentId, !expired, onApproved);
  const dead = expired || status === "cancelled" || status === "rejected";

  return (
    <div className="co-pix" aria-live="polite">
      <p className="co-pix-title">
        Pague {formatPrice(total)} com Pix
      </p>
      {dead ? (
        <>
          <p className="co-pay-error" role="alert">
            O código Pix expirou. Gere um novo para concluir o pedido.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={onRetry}>
            Gerar novo Pix
          </button>
        </>
      ) : (
        <>
          <ol className="co-pix-steps">
            <li>Abra o app do seu banco e escolha pagar com Pix.</li>
            <li>Escaneie o QR code ou use o Pix copia e cola.</li>
            <li>Pronto: esta tela confirma sozinha quando o pagamento cair.</li>
          </ol>
          {pix.qrCodeBase64 && <img className="co-pix-qr" src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR code do Pix" width={220} height={220} />}
          <label className="co-pix-code">
            <span>Pix copia e cola</span>
            <input readOnly value={pix.qrCode} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <button type="button" className="btn btn-primary btn-block" onClick={() => copy(pix.qrCode)}>
            {copied ? "Código copiado!" : "Copiar código Pix"}
          </button>
          <p className="co-pix-wait" role="status">
            <span className="spinner" aria-hidden="true" /> Aguardando pagamento
            {countdown && <> · expira em <strong>{countdown.label}</strong></>}
          </p>
        </>
      )}
      <p className="checkout-hint">Pedido nº {result.reference}</p>
    </div>
  );
}

export function BoletoPending({ result, total, onDone }: { result: PayResult; total: number; onDone: () => void }) {
  const b = result.boleto!;
  const { copied, copy } = useCopy();
  const due = b.expiresAt ? new Date(b.expiresAt).toLocaleDateString("pt-BR") : null;
  return (
    <div className="co-pix">
      <p className="co-pix-title">Boleto de {formatPrice(total)} gerado</p>
      <p className="checkout-hint">
        {due ? `Pague até ${due}. ` : ""}A confirmação leva até 3 dias úteis; enviamos seu pedido assim que ela chegar.
      </p>
      {b.url && (
        <a className="btn btn-primary btn-block" href={b.url} target="_blank" rel="noreferrer">
          Abrir boleto
        </a>
      )}
      {b.barcode && (
        <button type="button" className="btn btn-outline btn-block" onClick={() => copy(b.barcode!)}>
          {copied ? "Linha digitável copiada!" : "Copiar linha digitável"}
        </button>
      )}
      <button type="button" className="btn btn-outline btn-block" onClick={onDone}>
        Já salvei o boleto
      </button>
      <p className="checkout-hint">Pedido nº {result.reference}</p>
    </div>
  );
}
