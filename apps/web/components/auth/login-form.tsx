"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import {
  AuthenticationError,
  authenticationService,
} from "../../lib/auth/authentication-service";
import {
  validateLoginInput,
  type LoginInput,
  type LoginValidationErrors,
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

type SubmissionState = "idle" | "submitting" | "error";

function readLoginInput(form: HTMLFormElement): LoginInput {
  const data = new FormData(form);

  return {
    email: String(data.get("email") ?? "").trim(),
    password: String(data.get("password") ?? ""),
  };
}

export function LoginForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [notice, setNotice] = useState<AuthNoticeValue | null>(null);
  const isSubmitting = submissionState === "submitting";

  const validateField = (field: keyof LoginInput) => {
    const form = formRef.current;
    if (!form) return;

    const fieldErrors = validateLoginInput(readLoginInput(form));
    setErrors((current) => ({ ...current, [field]: fieldErrors[field] }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const input = readLoginInput(form);
    const nextErrors = validateLoginInput(input);

    setErrors(nextErrors);
    setNotice(null);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidField = nextErrors.email ? "email" : "password";
      const invalidControl = form.elements.namedItem(firstInvalidField);
      if (invalidControl instanceof HTMLInputElement) invalidControl.focus();
      return;
    }

    setSubmissionState("submitting");

    try {
      const remember = form.elements.namedItem("remember");
      await authenticationService.login({
        email: input.email,
        password: input.password,
        rememberMe:
          remember instanceof HTMLInputElement ? remember.checked : false,
      });
      const passwordField = form.elements.namedItem("password");
      if (passwordField instanceof HTMLInputElement) passwordField.value = "";
      window.location.assign("/dashboard");
    } catch (error) {
      setSubmissionState("error");
      setNotice({
        tone: "error",
        message:
          error instanceof AuthenticationError
            ? error.message
            : "Sign-in is currently unavailable. Try again shortly.",
      });
    }
  };

  return (
    <>
      <AuthHeader
        eyebrow="Workspace access"
        title="Welcome back"
        titleId="login-heading"
        description="Sign in to your workspace."
      />

      <AuthIntegrationNote
        id="authentication-status"
        title="Secure session authentication"
        description="Credentials are sent only to the configured API and are never stored in the browser."
        state="active"
      />

      <form
        ref={formRef}
        className="auth-form"
        noValidate
        aria-busy={isSubmitting}
        aria-labelledby="login-heading"
        onSubmit={handleSubmit}
      >
        <AuthField
          id="email"
          name="email"
          label="Work email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          disabled={isSubmitting}
          error={errors.email}
          onBlur={() => validateField("email")}
        />

        <PasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="current-password"
          error={errors.password}
          disabled={isSubmitting}
          onBlur={() => validateField("password")}
        />

        <div className="form-options">
          <label className="remember-control">
            <input name="remember" type="checkbox" disabled={isSubmitting} />
            <span>Remember me</span>
          </label>
          <Link className="auth-inline-action" href="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button
          className="auth-submit"
          type="submit"
          disabled={isSubmitting}
          aria-describedby="authentication-status"
        >
          {isSubmitting ? (
            <>
              <span className="button-spinner" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              Sign in <Icon name="arrow-right" size="small" />
            </>
          )}
        </Button>

        {notice ? <AuthNotice notice={notice} /> : null}
      </form>

      <div className="auth-account-prompt">
        <span>Don&apos;t have an account?</span>
        <Link className="auth-inline-action" href="/signup">
          Create account
        </Link>
      </div>
    </>
  );
}
