"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import {
  AuthenticationError,
  authenticationService,
} from "../../lib/auth/authentication-service";
import { validatePasswordResetEmail } from "../../lib/auth/validation";
import { Icon } from "../icons";
import { Button } from "../ui/primitives";
import {
  AuthField,
  AuthHeader,
  AuthIntegrationNote,
  AuthNotice,
  AuthSuccessState,
  BackToSignIn,
  type AuthNoticeValue,
} from "./auth-elements";
import { useAuthFormReady } from "./use-auth-form-ready";

export function ForgotPasswordForm() {
  const formReady = useAuthFormReady();
  const formRef = useRef<HTMLFormElement>(null);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instructionNotice, setInstructionNotice] =
    useState<AuthNoticeValue | null>(null);
  const [formNotice, setFormNotice] = useState<AuthNoticeValue | null>(null);

  if (instructionNotice) {
    return (
      <AuthSuccessState
        tone="pending"
        icon="mail"
        eyebrow="Recovery instructions"
        title="Check your inbox"
        description="For privacy, this response does not confirm whether an account exists."
      >
        <AuthNotice notice={instructionNotice} />
        <BackToSignIn />
        <button
          className="auth-inline-action"
          type="button"
          onClick={() => setInstructionNotice(null)}
        >
          Use a different email
        </button>
      </AuthSuccessState>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const email = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();
    const nextError = validatePasswordResetEmail(email);
    setEmailError(nextError);
    setFormNotice(null);
    if (nextError) {
      const field = event.currentTarget.elements.namedItem("email");
      if (field instanceof HTMLInputElement) field.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authenticationService.requestPasswordReset({
        email,
      });
      setInstructionNotice({
        tone: "information",
        message: result.deliveryConfigured
          ? "If an account exists for this email, password reset instructions have been sent."
          : "If an account exists, reset instructions will be available after email delivery is configured.",
      });
    } catch (submissionError) {
      setFormNotice({
        tone: "error",
        message:
          submissionError instanceof AuthenticationError
            ? submissionError.message
            : "Password recovery is currently unavailable. Try again shortly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthHeader
        eyebrow="Account recovery"
        title="Forgot your password?"
        titleId="forgot-password-heading"
        description="Enter your work email and we'll help you regain access."
      />
      <AuthIntegrationNote
        id="recovery-status"
        title="Private account recovery"
        description="Recovery responses remain generic and reset tokens are single-use and time-limited."
        state="active"
      />

      <form
        ref={formRef}
        method="post"
        className="auth-form"
        noValidate
        aria-busy={isSubmitting}
        aria-labelledby="forgot-password-heading"
        onSubmit={handleSubmit}
      >
        <AuthField
          id="recoveryEmail"
          name="email"
          label="Work email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          disabled={isSubmitting || !formReady}
          error={emailError}
          onBlur={(event) =>
            setEmailError(validatePasswordResetEmail(event.currentTarget.value))
          }
        />
        <Button
          className="auth-submit"
          type="submit"
          disabled={isSubmitting || !formReady}
          aria-describedby="recovery-status"
        >
          {isSubmitting ? (
            <>
              <span className="button-spinner" aria-hidden="true" /> Checking…
            </>
          ) : (
            <>
              Continue <Icon name="arrow-right" size="small" />
            </>
          )}
        </Button>
        {formNotice ? <AuthNotice notice={formNotice} /> : null}
      </form>
      <div className="auth-account-prompt">
        <Link className="auth-inline-action auth-back-link" href="/login">
          <Icon name="arrow-right" size="small" /> Back to sign in
        </Link>
      </div>
    </>
  );
}
