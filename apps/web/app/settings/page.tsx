import type { Metadata } from "next";
import { AppShell } from "../../components/app-shell/app-shell";
import { SettingsPage } from "../../components/settings/settings-page";

export const metadata: Metadata = {
  title: "Workspace Settings | AI Operations Platform",
  description:
    "Manage the persisted workspace profile and inspect current organization membership and configuration boundaries.",
};

export default function SettingsRoute() {
  return (
    <AppShell
      currentRoute="/settings"
      pageSection="System"
      pageTitle="Settings"
    >
      <SettingsPage />
    </AppShell>
  );
}
