"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  AuthenticationError,
  authenticationService,
} from "../../lib/auth/authentication-service";
import { validateVerificationCode } from "../../lib/auth/validation";
import { Icon } from "../icons";
import { Button, ButtonLink } from "../ui/primitives";
import {
  AuthHeader,
  AuthIntegrationNote,
  AuthNotice,
  AuthSuccessState,
  type AuthNoticeValue,
} from "./auth-elements";
import { VerificationCodeInput } from "./verification-code-input";

export function VerifyEmailForm({ verified = false }: { verified?: boolean }) {
  const [verificationComplete, setVerificationComplete] = useState(verified);
  const [digits, setDigits] = useState(() =>
    Array.from({ length: 6 }, () => ""),
  );
  const [error, setError] = useState<string | undefined>();
  const [operation, setOperation] = useState<"verify" | "resend" | null>(null);
  const [notice, setNotice] = useState<AuthNoticeValue | null>(null);
  const isBusy = operation !== null;

  if (verificationComplete) {
    return (
      <AuthSuccessState
        tone="success"
        icon="shield-check"
        eyebrow="Verification complete"
        title="Email verified"
        description="Your verified identity is ready for the onboarding flow."
      >
        <ButtonLink className="auth-submit" href="/onboarding">
          Continue to onboarding <Icon name="arrow-right" size="small" />
        </ButtonLink>
      </AuthSuccessState>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) return;
    const code = digits.join("");
    const nextError = validateVerificationCode(code);
    setError(nextError);
    setNotice(null);
    if (nextError) return;

    setOperation("verify");
    try {
      await authenticationService.verifyEmail({ code });
      setDigits(Array.from({ length: 6 }, () => ""));
      setVerificationComplete(true);
    } catch (submissionError) {
      setNotice({
        tone: "error",
        message:
          submissionError instanceof AuthenticationError
            ? submissionError.message
            : "Verification is currently unavailable. Try again shortly.",
      });
    } finally {
      setOperation(null);
    }
  };

  const handleResend = async () => {
    if (isBusy) return;
    setOperation("resend");
    setNotice(null);
    try {
      const result = await authenticationService.resendVerification();
      setNotice({
        tone: "information",
        message: result.localDevelopmentCode
          ? `Local development only: your new verification code is ${result.localDevelopmentCode}. No email was sent.`
          : result.deliveryConfigured
            ? "A new verification code has been requested."
            : "Email delivery is not configured, so a new code cannot be delivered yet.",
      });
    } catch (submissionError) {
      setNotice({
        tone: "error",
        message:
          submissionError instanceof AuthenticationError
            ? submissionError.message
            : "Verification delivery is currently unavailable.",
      });
    } finally {
      setOperation(null);
    }
  };

  return (
    <>
      <AuthHeader
        eyebrow="Identity check"
        title="Verify your email"
        titleId="verification-heading"
        description="Enter the single-use verification code sent to your work email."
      />
      <AuthIntegrationNote
        id="verification-status"
        title="Single-use verification"
        description="Codes expire after 15 minutes and are checked against a secure, HttpOnly verification context."
        state="active"
      />

      <form
        className="auth-form"
        noValidate
        aria-busy={isBusy}
        aria-labelledby="verification-heading"
        onSubmit={handleSubmit}
      >
        <VerificationCodeInput
          value={digits}
          error={error}
          disabled={isBusy}
          onChange={(nextDigits) => {
            setDigits(nextDigits);
            if (error) setError(validateVerificationCode(nextDigits.join("")));
          }}
        />

        <Button
          className="auth-submit"
          type="submit"
          disabled={isBusy}
          aria-describedby="verification-status"
        >
          {operation === "verify" ? (
            <>
              <span className="button-spinner" aria-hidden="true" /> Verifying…
            </>
          ) : (
            <>
              Verify email <Icon name="arrow-right" size="small" />
            </>
          )}
        </Button>
        <Button
          className="auth-secondary-button"
          variant="outline"
          type="button"
          disabled={isBusy}
          aria-describedby="verification-status"
          onClick={handleResend}
        >
          {operation === "resend" ? "Checking delivery…" : "Resend code"}
        </Button>
        {notice ? <AuthNotice notice={notice} /> : null}
      </form>

      <div className="auth-account-prompt">
        <span>Need to use a different email?</span>
        <Link className="auth-inline-action" href="/signup">
          Return to signup
        </Link>
      </div>
    </>
  );
}
