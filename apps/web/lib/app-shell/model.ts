import type { IconName } from "../../components/icons";

export type ApplicationRoute =
  | "/dashboard"
  | "/leads"
  | "/inbox"
  | "/follow-ups"
  | "/ai-operations"
  | "/approvals"
  | "/workflows"
  | "/activity"
  | "/analytics"
  | "/settings";

export type ApplicationNavigationItem = Readonly<{
  label: string;
  href: ApplicationRoute;
  icon: IconName;
  available: boolean;
}>;

export type ApplicationNavigationGroup = Readonly<{
  label: string;
  items: readonly ApplicationNavigationItem[];
}>;

export const applicationNavigation: readonly ApplicationNavigationGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "grid", available: true },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Leads", href: "/leads", icon: "target", available: true },
      { label: "Inbox", href: "/inbox", icon: "inbox", available: true },
      {
        label: "Follow-ups",
        href: "/follow-ups",
        icon: "repeat",
        available: true,
      },
    ],
  },
  {
    label: "AI",
    items: [
      {
        label: "AI Operations",
        href: "/ai-operations",
        icon: "spark",
        available: true,
      },
      {
        label: "Human Review",
        href: "/approvals",
        icon: "user-check",
        available: true,
      },
      {
        label: "Workflows",
        href: "/workflows",
        icon: "workflow",
        available: true,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Activity",
        href: "/activity",
        icon: "history",
        available: true,
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: "analytics",
        available: false,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: "sliders",
        available: true,
      },
    ],
  },
] as const;

export type ShellWorkspace = Readonly<{
  name: string;
  descriptor: string;
  isDemo: boolean;
}>;

export type ShellUser = Readonly<{
  name: string;
  role: string;
  initials: string;
  isDemo: boolean;
}>;

export type ShellContext = Readonly<{
  workspace: ShellWorkspace;
  user: ShellUser;
}>;

export const demoShellContext: ShellContext = {
  workspace: {
    name: "Acme Operations",
    descriptor: "Demo workspace",
    isDemo: true,
  },
  user: {
    name: "Alex Morgan",
    role: "Operations",
    initials: "AM",
    isDemo: true,
  },
};

export const dashboardWorkflow = [
  { label: "Enquiry", icon: "inbox" },
  { label: "AI understanding", icon: "spark" },
  { label: "Qualification", icon: "score" },
  { label: "Human control", icon: "user-check" },
  { label: "Follow-up", icon: "repeat" },
] as const satisfies readonly { label: string; icon: IconName }[];

export const dashboardEmptyModules = [
  {
    title: "Leads",
    icon: "target",
    description: "Customer opportunities in the selected workspace.",
    href: "/leads",
    dataKey: "leads",
    unit: "lead",
  },
  {
    title: "Inbox",
    icon: "inbox",
    description: "Conversations in the selected workspace.",
    href: "/inbox",
    dataKey: "conversations",
    unit: "conversation",
  },
  {
    title: "Follow-ups",
    icon: "repeat",
    description:
      "Scheduled next actions in the selected workspace. Reminders are not connected yet.",
    href: "/follow-ups",
    dataKey: "followUps",
    unit: "follow-up",
  },
  {
    title: "AI Operations",
    icon: "spark",
    description: "AI processing and review are not connected yet.",
    href: "/ai-operations",
  },
] as const satisfies readonly {
  title: string;
  icon: IconName;
  description: string;
  href: `/${string}`;
  dataKey?: "leads" | "conversations" | "followUps";
  unit?: string;
}[];

export function isApplicationRouteActive(
  item: ApplicationNavigationItem,
  currentRoute: ApplicationRoute,
) {
  return item.href === currentRoute;
}

export type MobileNavigationAction = "open" | "close" | "escape";

export function mobileNavigationReducer(
  isOpen: boolean,
  action: MobileNavigationAction,
) {
  if (action === "open") return true;
  if (action === "close" || action === "escape") return false;
  return isOpen;
}
