import type { Metadata } from "next";
import { AuthShell } from "../../components/auth/auth-shell";
import { LoginForm } from "../../components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | AI Operations Platform",
  description: "Sign in securely to your AI Operations Platform workspace.",
};

export default function LoginPage() {
  return (
    <AuthShell
      titleId="login-heading"
      skipLabel="Skip to sign in"
      eyebrow="Controlled business execution"
      title="Intelligent operations."
      accentTitle="Human-controlled."
      description="Bring enquiries, qualification, communication, and follow-up into one controlled workflow."
    >
      <LoginForm />
    </AuthShell>
  );
}
