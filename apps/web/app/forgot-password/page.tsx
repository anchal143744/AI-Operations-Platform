import type { Metadata } from "next";
import { AuthShell } from "../../components/auth/auth-shell";
import { ForgotPasswordForm } from "../../components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recover access | AI Operations Platform",
  description: "Request secure AI Operations Platform account recovery.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      titleId="forgot-password-heading"
      skipLabel="Skip to account recovery"
      eyebrow="Secure account recovery"
      title="Regain access."
      accentTitle="Keep control."
      description="A careful recovery flow protects access without revealing whether an account exists."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
