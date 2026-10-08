import type { ReactNode } from "react";

export function SelectionCard({
  id,
  type,
  name,
  value,
  label,
  description,
  checked,
  disabled,
  invalid,
  describedBy,
  onChange,
}: {
  id: string;
  type: "radio" | "checkbox";
  name: string;
  value: string;
  label: string;
  description?: string | undefined;
  checked: boolean;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
  onChange: () => void;
}) {
  return (
    <label className={`selection-card${checked ? " is-selected" : ""}`}>
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={onChange}
      />
      <span className="selection-control" aria-hidden="true">
        <span />
      </span>
      <span className="selection-copy">
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}

export function SelectionFieldset({
  legend,
  description,
  error,
  errorId,
  children,
  className,
}: {
  legend: string;
  description?: string | undefined;
  error?: string | undefined;
  errorId: string;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <fieldset
      className={`selection-fieldset${className ? ` ${className}` : ""}`}
      aria-describedby={error ? errorId : undefined}
    >
      <legend>{legend}</legend>
      {description ? <p>{description}</p> : null}
      {children}
      {error ? (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}
