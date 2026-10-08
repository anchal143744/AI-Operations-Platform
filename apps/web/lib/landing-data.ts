import type { IconName } from "../components/icons";

export interface LandingItem {
  title: string;
  description: string;
  icon: IconName;
}

export interface PreviewLead {
  id: string;
  company: string;
  contact: string;
  requirement: string;
  timeline: string;
  priority: string;
  classification: string;
  score: number;
  reasons: readonly string[];
  recommendedAction: string;
}

export const trustPrinciples: ReadonlyArray<{
  label: string;
  icon: IconName;
}> = [
  { label: "Human-controlled AI", icon: "user-check" },
  { label: "Secure by design", icon: "shield-check" },
  { label: "Workflow-driven", icon: "workflow" },
  { label: "Auditable actions", icon: "history" },
];

export const howItWorksSteps: ReadonlyArray<
  LandingItem & { number: string; note?: string }
> = [
  {
    number: "01",
    title: "Capture",
    description:
      "Bring website and email enquiries into one consistent workflow.",
    icon: "inbox",
  },
  {
    number: "02",
    title: "Understand",
    description:
      "AI extracts meaningful business information into validated fields.",
    icon: "spark",
  },
  {
    number: "03",
    title: "Decide",
    description:
      "Rules and AI recommendations determine the appropriate next step.",
    icon: "sliders",
  },
  {
    number: "04",
    title: "Execute",
    description:
      "Authorized actions are carried out and recorded automatically.",
    icon: "bolt",
  },
  {
    number: "05",
    title: "Learn",
    description:
      "Operational outcomes reveal where teams can refine their workflows.",
    icon: "analytics",
    note: "Continuous optimization is planned; V1 analytics do not autonomously retrain the system.",
  },
];

export const capabilities: ReadonlyArray<LandingItem> = [
  {
    title: "AI enquiry understanding",
    description: "Turn unstructured requests into validated business context.",
    icon: "spark",
  },
  {
    title: "Lead qualification",
    description: "Evaluate fit, intent, urgency, and requirement completeness.",
    icon: "target",
  },
  {
    title: "Lead scoring",
    description:
      "Prioritize opportunities with explainable reasons and confidence.",
    icon: "score",
  },
  {
    title: "AI response drafting",
    description:
      "Prepare grounded, reviewable responses without invented commitments.",
    icon: "draft",
  },
  {
    title: "Human approval",
    description:
      "Route consequential actions to the right person before execution.",
    icon: "user-check",
  },
  {
    title: "Email automation",
    description:
      "Send authorized communication through a controlled provider layer.",
    icon: "mail",
  },
  {
    title: "Follow-up automation",
    description:
      "Maintain timely sequences and stop them when customers reply.",
    icon: "repeat",
  },
  {
    title: "Workflow automation",
    description: "Coordinate triggers, conditions, actions, and durable waits.",
    icon: "workflow",
  },
  {
    title: "Activity history",
    description: "Trace decisions, actions, actors, and outcomes in context.",
    icon: "history",
  },
  {
    title: "Analytics",
    description: "See real lead and workflow performance from recorded events.",
    icon: "analytics",
  },
];

export const outcomes: ReadonlyArray<LandingItem> = [
  {
    title: "Respond faster",
    description:
      "Move from incoming request to a reviewable next action with less delay.",
    icon: "clock",
  },
  {
    title: "Reduce repetitive work",
    description:
      "Let software handle extraction, organization, and routine coordination.",
    icon: "bolt",
  },
  {
    title: "Never forget a follow-up",
    description:
      "Use explicit, observable schedules instead of individual memory.",
    icon: "repeat",
  },
  {
    title: "Give teams visibility",
    description:
      "Keep the enquiry, decision history, and current state together.",
    icon: "analytics",
  },
  {
    title: "Keep humans in control",
    description: "Match approval requirements to the risk of each action.",
    icon: "user-check",
  },
  {
    title: "Create consistent processes",
    description:
      "Turn team knowledge into repeatable, policy-guided execution.",
    icon: "workflow",
  },
];

export const securityPrinciples: ReadonlyArray<LandingItem> = [
  {
    title: "Secure architecture",
    description:
      "Boundaries, validation, safe defaults, and least privilege guide implementation.",
    icon: "shield-check",
  },
  {
    title: "Role-based access",
    description:
      "Permissions are designed around responsibilities, not scattered role checks.",
    icon: "users",
  },
  {
    title: "Tenant isolation",
    description:
      "Business data is designed to remain scoped to its organization and workspace.",
    icon: "lock",
  },
  {
    title: "Auditability",
    description:
      "Important decisions and side effects are intended to remain traceable.",
    icon: "history",
  },
  {
    title: "Controlled AI actions",
    description:
      "Model output is validated advice, never unchecked authorization.",
    icon: "sliders",
  },
  {
    title: "Data protection",
    description:
      "Secrets, sensitive context, and provider access remain server-side concerns.",
    icon: "lock",
  },
];

// Static presentation data for Page 01 only. Replace at this typed boundary when APIs exist.
export const previewLead: PreviewLead = {
  id: "LD-0248",
  company: "Ardent Manufacturing",
  contact: "Anika Mehra",
  requirement: "200 ergonomic office chairs",
  timeline: "Delivery before 15 October",
  priority: "High",
  classification: "HOT",
  score: 87,
  reasons: [
    "High purchase intent",
    "Large, specific requirement",
    "Clear delivery timeline",
  ],
  recommendedAction: "Contact within 2 hours",
};
