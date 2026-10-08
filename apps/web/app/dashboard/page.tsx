import type { Metadata } from "next";
import { AppShell } from "../../components/app-shell/app-shell";
import { DashboardOverview } from "../../components/dashboard/dashboard-overview";

export const metadata: Metadata = {
  title: "Dashboard | AI Operations Platform",
  description:
    "Operational overview for the selected AI Operations Platform workspace.",
};

export default function DashboardPage() {
  return (
    <AppShell
      currentRoute="/dashboard"
      pageSection="Overview"
      pageTitle="Dashboard"
    >
      <DashboardOverview />
    </AppShell>
  );
}
