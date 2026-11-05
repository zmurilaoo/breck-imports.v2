import type { InputHTMLAttributes, Ref } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  inputRef?: Ref<HTMLInputElement>;
};

/** Campo com rótulo visível, dica e erro ligados por aria-describedby. */
export function Field({ id, label, hint, error, optional, inputRef, className = "", ...input }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`field${error ? " has-error" : ""} ${className}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="field-optional"> (opcional)</span>}
      </label>
      <input
        id={id}
        ref={inputRef}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...input}
      />
      {error ? (
        <p id={errorId} className="field-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 7v6M12 17h.01" />
          </svg>
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
