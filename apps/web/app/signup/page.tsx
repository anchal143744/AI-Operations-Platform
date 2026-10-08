import type { Metadata } from "next";
import { AuthShell } from "../../components/auth/auth-shell";
import { SignupForm } from "../../components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account | AI Operations Platform",
  description: "Create a secure AI Operations Platform account.",
};

export default function SignupPage() {
  return (
    <AuthShell
      titleId="signup-heading"
      skipLabel="Skip to account creation"
      eyebrow="A more deliberate operation"
      title="Build a smarter"
      accentTitle="operation."
      description="Bring enquiries, qualification, communication, and follow-up into one controlled workflow."
      cardSize="wide"
    >
      <SignupForm />
    </AuthShell>
  );
}
