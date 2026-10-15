import type { Metadata } from "next";
import { ApprovalPage } from "../../components/approvals/approval-page";
import { AppShell } from "../../components/app-shell/app-shell";

export const metadata: Metadata = {
  title: "Human Review | AI Operations Platform",
  description:
    "Review and decide approval requests for controlled internal workflow actions.",
};

export default function ApprovalsRoute() {
  return (
    <AppShell
      currentRoute="/approvals"
      pageSection="AI"
      pageTitle="Human Review"
    >
      <ApprovalPage />
    </AppShell>
  );
}
