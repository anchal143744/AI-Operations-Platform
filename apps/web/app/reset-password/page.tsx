import type { Metadata } from "next";
import { AuthShell } from "../../components/auth/auth-shell";
import { ResetPasswordForm } from "../../components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password | AI Operations Platform",
  description: "Set a new account password using a secure recovery token.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const parameters = await searchParams;
  const resetToken =
    typeof parameters.token === "string" ? parameters.token : undefined;

  return (
    <AuthShell
      titleId="reset-password-heading"
      skipLabel="Skip to password reset"
      eyebrow="Credential security"
      title="Strong access."
      accentTitle="Controlled operations."
      description="Secure credentials are one layer in a system designed around permission, policy, and traceability."
    >
      <ResetPasswordForm resetToken={resetToken} />
    </AuthShell>
  );
}
