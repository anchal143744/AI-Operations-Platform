import type { Metadata } from "next";
import { AuthShell } from "../../components/auth/auth-shell";
import { VerifyEmailForm } from "../../components/auth/verify-email-form";

export const metadata: Metadata = {
  title: "Verify email | AI Operations Platform",
  description: "Verify an AI Operations Platform account email securely.",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell
      titleId="verification-heading"
      skipLabel="Skip to email verification"
      eyebrow="Trusted workspace access"
      title="Verify once."
      accentTitle="Operate with confidence."
      description="Identity checks are designed to protect the boundary between every person, workspace, and business."
    >
      <VerifyEmailForm />
    </AuthShell>
  );
}
