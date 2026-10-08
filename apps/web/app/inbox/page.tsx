import type { Metadata } from "next";
import { AppShell } from "../../components/app-shell/app-shell";
import { InboxPage } from "../../components/inbox/inbox-page";

export const metadata: Metadata = {
  title: "Inbox | AI Operations Platform",
  description:
    "Frontend-only communication workspace for future customer conversations, review, and operational follow-up.",
};

export default function InboxRoute() {
  return (
    <AppShell currentRoute="/inbox" pageSection="Work" pageTitle="Inbox">
      <InboxPage />
    </AppShell>
  );
}
