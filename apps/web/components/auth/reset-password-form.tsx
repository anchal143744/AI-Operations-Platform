"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import {
  AuthenticationError,
  authenticationService,
} from "../../lib/auth/authentication-service";
import {
  validateResetPasswordInput,
  type ResetPasswordInput,
  type ResetPasswordValidationErrors,
} from "../../lib/auth/validation";
import { Icon } from "../icons";
import { Button } from "../ui/primitives";
import {
  AuthHeader,
  AuthIntegrationNote,
  AuthNotice,
  AuthSuccessState,
  BackToSignIn,
  type AuthNoticeValue,
} from "./auth-elements";
import { PasswordField } from "./password-field";

function readResetInput(form: HTMLFormElement): ResetPasswordInput {
  const data = new FormData(form);
  return {
    password: String(data.get("password") ?? ""),
    confirmPassword: String(data.get("confirmPassword") ?? ""),
  };
}

export function ResetPasswordForm({
  passwordUpdated = false,
  resetToken,
}: {
  passwordUpdated?: boolean;
  resetToken?: string | undefined;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<ResetPasswordValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<AuthNoticeValue | null>(null);
  const [updateComplete, setUpdateComplete] = useState(passwordUpdated);

  if (updateComplete) {
    return (
      <AuthSuccessState
        tone="success"
        icon="shield-check"
        eyebrow="Recovery complete"
        title="Password updated"
        description="Your password has been successfully updated."
      >
        <BackToSignIn />
      </AuthSuccessState>
    );
  }

  const validateField = (field: keyof ResetPasswordInput) => {
    const form = formRef.current;
    if (!form) return;
    const fieldErrors = validateResetPasswordInput(readResetInput(form));
    setErrors((current) => ({ ...current, [field]: fieldErrors[field] }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const input = readResetInput(form);
    const nextErrors = validateResetPasswordInput(input);
    setErrors(nextErrors);
    setNotice(null);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidName = ["password", "confirmPassword"].find(
        (name) => nextErrors[name as keyof ResetPasswordInput],
      );
      const invalidControl = firstInvalidName
        ? form.elements.namedItem(firstInvalidName)
        : null;
      if (invalidControl instanceof HTMLElement) invalidControl.focus();
      return;
    }

    if (!resetToken) {
      setNotice({
        tone: "error",
        message: "Open the complete password-reset link from your email.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await authenticationService.resetPassword({
        resetToken,
        newPassword: input.password,
      });
      form.reset();
      setUpdateComplete(true);
    } catch (submissionError) {
      setNotice({
        tone: "error",
        message:
          submissionError instanceof AuthenticationError
            ? submissionError.message
            : "Password reset is currently unavailable. Try again shortly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthHeader
        eyebrow="Secure recovery"
        title="Set a new password"
        titleId="reset-password-heading"
        description="Choose a strong password for your account."
      />
      <AuthIntegrationNote
        id="reset-status"
        title={resetToken ? "Secure password reset" : "Reset link required"}
        description={
          resetToken
            ? "The reset token is single-use, time-limited, and existing sessions are revoked after a successful reset."
            : "Use the complete link from a password-reset email to continue."
        }
        state={resetToken ? "active" : "pending"}
      />

      <form
        ref={formRef}
        className="auth-form"
        noValidate
        aria-busy={isSubmitting}
        aria-labelledby="reset-password-heading"
        onSubmit={handleSubmit}
      >
        <PasswordField
          id="newPassword"
          name="password"
          label="New password"
          autoComplete="new-password"
          error={errors.password}
          disabled={isSubmitting}
          showStrength
          onBlur={() => validateField("password")}
        />
        <PasswordField
          id="confirmNewPassword"
          name="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword}
          disabled={isSubmitting}
          helpText="Enter the same password again."
          onBlur={() => validateField("confirmPassword")}
        />
        <Button
          className="auth-submit"
          type="submit"
          disabled={isSubmitting}
          aria-describedby="reset-status"
        >
          {isSubmitting ? (
            <>
              <span className="button-spinner" aria-hidden="true" /> Resetting
              password…
            </>
          ) : (
            <>
              Reset password <Icon name="arrow-right" size="small" />
            </>
          )}
        </Button>
        {notice ? <AuthNotice notice={notice} /> : null}
      </form>

      <div className="auth-account-prompt">
        <Link className="auth-inline-action auth-back-link" href="/login">
          <Icon name="arrow-right" size="small" /> Back to sign in
        </Link>
      </div>
    </>
  );
}
