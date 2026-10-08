export const industries = [
  { value: "technology", label: "Technology" },
  { value: "software", label: "Software" },
  { value: "professional-services", label: "Professional Services" },
  { value: "real-estate", label: "Real Estate" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "financial-services", label: "Financial Services" },
  { value: "marketing-advertising", label: "Marketing & Advertising" },
  { value: "other", label: "Other" },
] as const;

export const companySizes = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "500+",
] as const;

export const roles = [
  {
    value: "founder-owner",
    label: "Founder / Owner",
    description: "Set direction and stay close to execution.",
  },
  {
    value: "sales",
    label: "Sales",
    description: "Qualify demand and move opportunities forward.",
  },
  {
    value: "marketing",
    label: "Marketing",
    description: "Connect acquisition activity to business outcomes.",
  },
  {
    value: "operations",
    label: "Operations",
    description: "Design reliable processes across the team.",
  },
  {
    value: "customer-success",
    label: "Customer Success",
    description: "Coordinate responsive customer follow-through.",
  },
  {
    value: "management",
    label: "Management",
    description: "Improve visibility, ownership, and consistency.",
  },
  {
    value: "other",
    label: "Other",
    description: "Configure the workspace around another primary role.",
  },
] as const;

export const primaryGoals = [
  {
    value: "respond-faster",
    label: "Respond to enquiries faster",
    description:
      "Reduce the delay between an incoming request and a useful response.",
  },
  {
    value: "qualify-leads",
    label: "Qualify leads automatically",
    description:
      "Turn enquiry context into a consistent, reviewable qualification.",
  },
  {
    value: "reduce-follow-ups",
    label: "Reduce repetitive follow-ups",
    description: "Coordinate timely follow-through without relying on memory.",
  },
  {
    value: "centralize-conversations",
    label: "Centralize customer conversations",
    description:
      "Keep incoming context and team activity in one operating view.",
  },
  {
    value: "sales-visibility",
    label: "Improve sales visibility",
    description:
      "Make priorities, ownership, and progress easier to understand.",
  },
  {
    value: "automate-operations",
    label: "Automate repetitive operations",
    description:
      "Let software handle predictable coordination and preparation.",
  },
  {
    value: "better-workflows",
    label: "Create better operational workflows",
    description:
      "Turn business policy into a clear, repeatable execution path.",
  },
  {
    value: "other",
    label: "Other",
    description: "Start with another outcome that matters to your team.",
  },
] as const;

export const channels = [
  { value: "website", label: "Website enquiries" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "instagram", label: "Instagram" },
  { value: "phone", label: "Phone" },
  { value: "manual", label: "Manual entry" },
  { value: "other", label: "Other" },
] as const;

export const enquiryOwners = [
  { value: "sales", label: "Sales team" },
  { value: "founder-owner", label: "Founder / Owner" },
  { value: "operations", label: "Operations team" },
  { value: "support", label: "Customer support" },
  { value: "shared", label: "Shared team" },
  { value: "other", label: "Other" },
] as const;

export const responseExpectations = [
  { value: "immediately", label: "Immediately" },
  { value: "15-minutes", label: "Within 15 minutes" },
  { value: "1-hour", label: "Within 1 hour" },
  { value: "same-day", label: "Within the same day" },
  { value: "24-hours", label: "Within 24 hours" },
] as const;

export type Industry = (typeof industries)[number]["value"];
export type CompanySize = (typeof companySizes)[number];
export type UserRole = (typeof roles)[number]["value"];
export type PrimaryGoal = (typeof primaryGoals)[number]["value"];
export type EnquiryChannel = (typeof channels)[number]["value"];
export type EnquiryOwner = (typeof enquiryOwners)[number]["value"];
export type ResponseExpectation =
  (typeof responseExpectations)[number]["value"];

export type OnboardingData = Readonly<{
  businessName: string;
  website: string;
  industry: Industry | "";
  companySize: CompanySize | "";
  role: UserRole | "";
  primaryGoal: PrimaryGoal | "";
  channels: readonly EnquiryChannel[];
  enquiryOwner: EnquiryOwner | "";
  responseExpectation: ResponseExpectation | "";
}>;

export const initialOnboardingData: OnboardingData = {
  businessName: "",
  website: "",
  industry: "",
  companySize: "",
  role: "",
  primaryGoal: "",
  channels: [],
  enquiryOwner: "",
  responseExpectation: "",
};

export const onboardingSteps = [
  { id: "welcome", number: "01", label: "Welcome" },
  { id: "business", number: "02", label: "Business" },
  { id: "role", number: "03", label: "Role" },
  { id: "goal", number: "04", label: "Goal" },
  { id: "workflow", number: "05", label: "Workflow" },
  { id: "review", number: "06", label: "Review" },
] as const;

export type OnboardingStepId = (typeof onboardingSteps)[number]["id"];
export type OnboardingView = OnboardingStepId | "complete";

export function getOptionLabel<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T | "",
) {
  return (
    options.find((option) => option.value === value)?.label ?? "Not provided"
  );
}
