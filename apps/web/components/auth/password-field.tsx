"use client";

import { useEffect, useRef, useState } from "react";
import { getPasswordStrength } from "../../lib/auth/validation";
import { Icon } from "../icons";
import { PasswordStrength } from "./password-strength";

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  error,
  disabled,
  onBlur,
  showStrength = false,
  helpText,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  error: string | undefined;
  disabled: boolean;
  onBlur: () => void;
  showStrength?: boolean;
  helpText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [strength, setStrength] = useState(() => getPasswordStrength(""));
  const requirementsId = `${id}-requirements`;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [requirementsId, errorId].filter(Boolean).join(" ");

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    const handleReset = () => {
      setIsVisible(false);
      setStrength(getPasswordStrength(""));
    };

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div
        className={"password-control" + (error ? " field-control-error" : "")}
      >
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onBlur={onBlur}
          onInput={(event) => {
            if (showStrength) {
              setStrength(getPasswordStrength(event.currentTarget.value));
            }
          }}
        />
        <button
          className="password-toggle"
          type="button"
          disabled={disabled}
          aria-label={`${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
        >
          <Icon name={isVisible ? "eye-off" : "eye"} />
        </button>
      </div>
      {showStrength ? (
        <PasswordStrength strength={strength} />
      ) : (
        <span className="field-support" id={requirementsId}>
          {helpText ?? "At least 8 characters."}
        </span>
      )}
      {showStrength ? (
        <span id={requirementsId} className="sr-only">
          Password requirements are shown in the strength indicator.
        </span>
      ) : null}
      {error ? (
        <span className="field-error" id={errorId}>
          <Icon name="alert" size="small" /> {error}
        </span>
      ) : null}
    </div>
  );
}
