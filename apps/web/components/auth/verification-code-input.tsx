"use client";

import { ClipboardEvent, KeyboardEvent, useRef } from "react";
import { Icon } from "../icons";

const codeLength = 6;

export function VerificationCodeInput({
  value,
  error,
  disabled,
  onChange,
}: {
  value: readonly string[];
  error: string | undefined;
  disabled: boolean;
  onChange: (value: string[]) => void;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from(
    { length: codeLength },
    (_, index) => value[index] ?? "",
  );

  const updateDigit = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    onChange(nextDigits);
    if (digit && index < codeLength - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      const nextDigits = [...digits];
      nextDigits[index - 1] = "";
      onChange(nextDigits);
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < codeLength - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, codeLength);
    if (!pastedDigits) return;

    onChange(
      Array.from(
        { length: codeLength },
        (_, index) => pastedDigits[index] ?? "",
      ),
    );
    const focusIndex = Math.min(pastedDigits.length, codeLength - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <fieldset className="verification-fieldset">
      <legend>Verification code</legend>
      <div
        className={`verification-code${error ? " verification-code-error" : ""}`}
        aria-describedby={
          error ? "verification-code-error" : "verification-code-help"
        }
        onPaste={handlePaste}
      >
        {digits.map((digit, index) => (
          <input
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            key={index}
            value={digit}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            disabled={disabled}
            aria-label={`Verification code digit ${index + 1} of ${codeLength}`}
            aria-invalid={Boolean(error)}
            onChange={(event) => updateDigit(index, event.currentTarget.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
          />
        ))}
      </div>
      <span className="field-support" id="verification-code-help">
        Enter the 6-digit code from your verification email.
      </span>
      {error ? (
        <span className="field-error" id="verification-code-error">
          <Icon name="alert" size="small" /> {error}
        </span>
      ) : null}
    </fieldset>
  );
}
