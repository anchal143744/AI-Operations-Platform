import type { Metadata } from "next";
import { AppShell } from "../../components/app-shell/app-shell";
import { LeadsPage } from "../../components/leads/leads-page";

export const metadata: Metadata = {
  title: "Leads | AI Operations Platform",
  description:
    "Tenant-scoped Leads workspace for authenticated operational records.",
};

export default function LeadsRoute() {
  return (
    <AppShell currentRoute="/leads" pageSection="Work" pageTitle="Leads">
      <LeadsPage />
    </AppShell>
  );
}
