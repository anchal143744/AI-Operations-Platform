import type { Metadata } from "next";
import { AppShell } from "../../components/app-shell/app-shell";
import { WorkflowsPage } from "../../components/workflows/workflows-page";

export const metadata: Metadata = {
  title: "Workflows | AI Operations Platform",
  description:
    "Frontend-only architecture for controlled operational automation.",
};

export default function WorkflowsRoute() {
  return (
    <AppShell currentRoute="/workflows" pageSection="AI" pageTitle="Workflows">
      <WorkflowsPage />
    </AppShell>
  );
}
