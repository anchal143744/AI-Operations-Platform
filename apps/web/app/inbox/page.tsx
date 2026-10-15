import type { Metadata } from "next";
import { AppShell } from "../../components/app-shell/app-shell";
import { InboxPage } from "../../components/inbox/inbox-page";

export const metadata: Metadata = {
  title: "Inbox | AI Operations Platform",
  description:
    "Manage workspace conversations with persisted records; external messaging channels are not connected.",
};

export default function InboxRoute() {
  return (
    <AppShell currentRoute="/inbox" pageSection="Work" pageTitle="Inbox">
      <InboxPage />
    </AppShell>
  );
}
