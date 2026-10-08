import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell/app-shell";
import { LeadDetailPage } from "../../../components/lead-detail/lead-detail-page";
import { LeadNotFound } from "../../../components/lead-detail/lead-not-found";
import { RealLeadDetail } from "../../../components/lead-detail/real-lead-detail";
import { DEMO_LEAD_ID, getDemoLeadDetail } from "../../../lib/leads/demo-lead";

type LeadDetailRouteProps = {
  params: Promise<{ leadId: string }>;
};

export const metadata: Metadata = {
  title: "Lead detail | AI Operations Platform",
  description:
    "Lead detail in a verified workspace, with a separate frontend demo route.",
};

export default async function LeadDetailRoute({
  params,
}: LeadDetailRouteProps) {
  const { leadId } = await params;
  const detail = leadId === DEMO_LEAD_ID ? getDemoLeadDetail(leadId) : null;

  return (
    <AppShell
      currentRoute="/leads"
      pageSection="Work"
      pageTitle="Lead"
      breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Lead" }]}
    >
      {detail ? (
        <LeadDetailPage detail={detail} />
      ) : leadId === DEMO_LEAD_ID ? (
        <LeadNotFound />
      ) : (
        <RealLeadDetail leadId={leadId} />
      )}
    </AppShell>
  );
}
