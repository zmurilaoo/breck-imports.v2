import type { ProductSize } from "../../types";

interface Props {
  sizes: ProductSize[];
  value: string | null;
  onChange: (size: string) => void;
  error?: boolean;
}

export function SizeSelector({ sizes, value, onChange, error }: Props) {
  return (
    <fieldset className={`size-selector${error ? " has-error" : ""}`}>
      <legend>
        Tamanho: <strong>{value ?? "selecione"}</strong>
      </legend>
      <div className="size-options">
        {sizes.map(({ size, available }) => (
          <button
            key={size}
            type="button"
            className={`size-option${value === size ? " is-selected" : ""}`}
            disabled={!available}
            aria-pressed={value === size}
            onClick={() => onChange(size)}
          >
            {size}
          </button>
        ))}
      </div>
      {error && <p className="field-error">Selecione um tamanho para continuar.</p>}
    </fieldset>
  );
}
