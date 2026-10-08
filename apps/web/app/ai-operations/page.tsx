import type { Metadata } from "next";
import { AIOperationsPage } from "../../components/ai-operations/ai-operations-page";
import { AppShell } from "../../components/app-shell/app-shell";

export const metadata: Metadata = {
  title: "AI Operations | AI Operations Platform",
  description:
    "Frontend-only control center for future AI-assisted operational work.",
};

export default function AIOperationsRoute() {
  return (
    <AppShell
      currentRoute="/ai-operations"
      pageSection="AI"
      pageTitle="AI Operations"
    >
      <AIOperationsPage />
    </AppShell>
  );
}
