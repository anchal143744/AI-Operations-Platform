import type { Metadata } from "next";
import { AppShell } from "../../components/app-shell/app-shell";
import { FollowUpsPage } from "../../components/follow-ups/follow-ups-page";

export const metadata: Metadata = {
  title: "Follow-ups | AI Operations Platform",
  description:
    "Schedule and manage tenant-scoped customer follow-ups and next actions.",
};

export default function FollowUpsRoute() {
  return (
    <AppShell
      currentRoute="/follow-ups"
      pageSection="Work"
      pageTitle="Follow-ups"
    >
      <FollowUpsPage />
    </AppShell>
  );
}
