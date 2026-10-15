import type { Metadata } from "next";
import { ActivityPage } from "../../components/activity/activity-page";
import { AppShell } from "../../components/app-shell/app-shell";

export const metadata: Metadata = {
  title: "Activity & Audit | AI Operations Platform",
  description:
    "Inspect persisted workspace activity for operational and workflow events.",
};

export default function ActivityRoute() {
  return (
    <AppShell
      currentRoute="/activity"
      pageSection="Insights"
      pageTitle="Activity & Audit"
    >
      <ActivityPage />
    </AppShell>
  );
}
