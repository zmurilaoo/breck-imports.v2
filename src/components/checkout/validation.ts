/** Máscaras e validações do checkout (sem dependência externa). */

export const onlyDigits = (v: string) => v.replace(/\D/g, "");
const digits = (v: string, max: number) => onlyDigits(v).slice(0, max);

export const maskCep = (v: string) => digits(v, 8).replace(/^(\d{5})(\d)/, "$1-$2");
export const maskCpf = (v: string) =>
  digits(v, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
export const maskPhone = (v: string) => {
  const d = digits(v, 11);
  if (!d) return "";
  if (d.length <= 2) return d.replace(/^(\d+)/, "($1");
  if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, "($1) $2");
  return d.length <= 10 ? d.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3") : d.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
};

/** CPF com dígito verificador (rejeita também sequências repetidas como 111.111.111-11). */
export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

export const emptyCustomer = {
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
export type Customer = typeof emptyCustomer;
export type CustomerField = keyof Customer;

/** Mensagem de erro do campo, ou "" se estiver ok. */
export function fieldError(k: CustomerField, c: Customer): string {
  const v = c[k].trim();
  switch (k) {
    case "email":
      if (!v) return "Informe seu e-mail.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "E-mail incompleto. Confira se tem @ e o domínio (ex.: nome@gmail.com).";
    case "name":
      if (!v) return "Informe seu nome.";
      return v.split(/\s+/).length >= 2 ? "" : "Informe nome e sobrenome.";
    case "phone": {
      const n = onlyDigits(v).length;
      if (!n) return "Informe seu WhatsApp.";
      return n >= 10 ? "" : "WhatsApp com DDD: 10 ou 11 números.";
    }
    case "cep":
      return onlyDigits(v).length === 8 ? "" : "CEP com 8 números.";
    case "street":
      return v ? "" : "Informe a rua.";
    case "number":
      return v ? "" : "Informe o número (ou S/N).";
    case "district":
      return v ? "" : "Informe o bairro.";
    case "cpf":
      if (!v) return "Informe seu CPF.";
      if (onlyDigits(v).length < 11) return "CPF com 11 números.";
      return isValidCpf(v) ? "" : "Esse CPF não existe. Confira os números.";
    default:
      return "";
  }
}

export const STEP_FIELDS = {
  contato: ["email", "name", "phone"],
  entrega: ["cep", "street", "number", "district"],
  pagamento: ["cpf"],
} as const satisfies Record<string, readonly CustomerField[]>;
export type StepId = keyof typeof STEP_FIELDS;
export const STEPS: { id: StepId; label: string }[] = [
  { id: "contato", label: "Contato" },
  { id: "entrega", label: "Entrega" },
  { id: "pagamento", label: "Pagamento" },
];

export const daysLabel = (days: number) => (days === 1 ? "até 1 dia útil" : `até ${days} dias úteis`);
