import type { LeadDetail } from "./model";

export const DEMO_LEAD_ID = "demo-lead-001";

export const demoLeadDetail: LeadDetail = {
  lead: {
    id: DEMO_LEAD_ID,
    name: "Alex Morgan",
    company: "Northstar Solutions",
    email: "alex@example.com",
    phone: "+1 555 010 1000",
    status: "NEW",
    priority: "MEDIUM",
    source: "WEBSITE",
    owner: "Demo Owner",
    createdAt: "2026-01-15T09:30:00.000Z",
    updatedAt: "2026-01-15T09:30:00.000Z",
    lastActivityAt: null,
    nextFollowUpAt: null,
  },
  enquiryContext:
    "Interested in understanding how automated enquiry handling could improve their sales operation.",
  activity: [],
  notes: [],
  tags: [],
  aiContext: null,
  nextAction: null,
};

export function getDemoLeadDetail(leadId: string): LeadDetail | null {
  return leadId === DEMO_LEAD_ID ? demoLeadDetail : null;
}
