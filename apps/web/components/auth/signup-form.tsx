"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import {
  AuthenticationError,
  authenticationService,
} from "../../lib/auth/authentication-service";
import {
  validateSignupInput,
  type SignupInput,
  type SignupValidationErrors,
} from "../../lib/auth/validation";
import { Icon } from "../icons";
import { Button } from "../ui/primitives";
import {
  AuthField,
  AuthHeader,
  AuthIntegrationNote,
  AuthNotice,
  type AuthNoticeValue,
} from "./auth-elements";
import { PasswordField } from "./password-field";
import { useAuthFormReady } from "./use-auth-form-ready";

function readSignupInput(form: HTMLFormElement): SignupInput {
  const data = new FormData(form);
  return {
    firstName: String(data.get("firstName") ?? "").trim(),
    lastName: String(data.get("lastName") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    password: String(data.get("password") ?? ""),
    confirmPassword: String(data.get("confirmPassword") ?? ""),
    consent: data.get("consent") === "on",
  };
}

export function SignupForm() {
  const formReady = useAuthFormReady();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<SignupValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<AuthNoticeValue | null>(null);

  const validateField = (field: keyof SignupInput) => {
    const form = formRef.current;
    if (!form) return;
    const fieldErrors = validateSignupInput(readSignupInput(form));
    setErrors((current) => ({ ...current, [field]: fieldErrors[field] }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const input = readSignupInput(form);
    const nextErrors = validateSignupInput(input);
    setErrors(nextErrors);
    setNotice(null);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidName = [
        "firstName",
        "lastName",
        "email",
        "password",
        "confirmPassword",
        "consent",
      ].find((name) => nextErrors[name as keyof SignupInput]);
      const invalidControl = firstInvalidName
        ? form.elements.namedItem(firstInvalidName)
        : null;
      if (invalidControl instanceof HTMLElement) invalidControl.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authenticationService.register({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        password: input.password,
      });
      for (const name of ["password", "confirmPassword"]) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) {
          field.value = "";
          field.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
      setNotice({
        tone: "information",
        message: result.localDevelopmentCode
          ? `Local development only: your verification code is ${result.localDevelopmentCode}. No email was sent.`
          : result.deliveryConfigured
            ? "Account created. Enter the verification code sent to your email."
            : "Email delivery is not configured, so a verification code cannot be delivered.",
        action: {
          href: "/verify-email",
          label: "Continue to verification",
        },
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof AuthenticationError
            ? error.message
            : "Account creation is currently unavailable. Try again shortly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthHeader
        eyebrow="New workspace"
        title="Create your account"
        titleId="signup-heading"
        description="Start building your workspace."
      />
      <AuthIntegrationNote
        id="registration-status"
        title="Secure account registration"
        description="Passwords are transmitted to the API over the configured origin and stored only as Argon2id hashes."
        state="active"
      />

      <form
        ref={formRef}
        method="post"
        className="auth-form auth-form-compact"
        noValidate
        aria-busy={isSubmitting}
        aria-labelledby="signup-heading"
        onSubmit={handleSubmit}
      >
        <div className="auth-name-grid">
          <AuthField
            id="firstName"
            name="firstName"
            label="First name"
            autoComplete="given-name"
            required
            disabled={isSubmitting || !formReady}
            error={errors.firstName}
            onBlur={() => validateField("firstName")}
          />
          <AuthField
            id="lastName"
            name="lastName"
            label="Last name"
            autoComplete="family-name"
            required
            disabled={isSubmitting || !formReady}
            error={errors.lastName}
            onBlur={() => validateField("lastName")}
          />
        </div>
        <AuthField
          id="signupEmail"
          name="email"
          label="Work email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          disabled={isSubmitting || !formReady}
          error={errors.email}
          onBlur={() => validateField("email")}
        />
        <PasswordField
          id="signupPassword"
          name="password"
          label="Password"
          autoComplete="new-password"
          error={errors.password}
          disabled={isSubmitting || !formReady}
          showStrength
          onBlur={() => validateField("password")}
        />
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword}
          disabled={isSubmitting || !formReady}
          helpText="Enter the same password again."
          onBlur={() => validateField("confirmPassword")}
        />

        <div className="consent-field">
          <label className="remember-control">
            <input
              name="consent"
              type="checkbox"
              required
              disabled={isSubmitting || !formReady}
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={errors.consent ? "consent-error" : undefined}
              onChange={() => validateField("consent")}
            />
            <span>
              I agree to the{" "}
              <span className="policy-name">Terms of Service</span> and{" "}
              <span className="policy-name">Privacy Policy</span>.
            </span>
          </label>
          {errors.consent ? (
            <span className="field-error" id="consent-error">
              <Icon name="alert" size="small" /> {errors.consent}
            </span>
          ) : null}
        </div>

        <Button
          className="auth-submit"
          type="submit"
          disabled={isSubmitting || !formReady}
          aria-describedby="registration-status"
        >
          {isSubmitting ? (
            <>
              <span className="button-spinner" aria-hidden="true" /> Creating
              account…
            </>
          ) : (
            <>
              Create account <Icon name="arrow-right" size="small" />
            </>
          )}
        </Button>
        {notice ? <AuthNotice notice={notice} /> : null}
      </form>

      <div className="auth-account-prompt">
        <span>Already have an account?</span>
        <Link className="auth-inline-action" href="/login">
          Sign in
        </Link>
      </div>
    </>
  );
}
