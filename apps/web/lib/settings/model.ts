import type {
  CompanySize,
  Industry,
  ResponseExpectation,
} from "../onboarding/model";
import type { TeamMemberRecord } from "@aop/types";

export const workspaceRoles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "SALES",
  "VIEWER",
] as const;
export type Role = (typeof workspaceRoles)[number];

export const permissionCategories = [
  "LEADS",
  "CONVERSATIONS",
  "FOLLOW_UPS",
  "AI_OPERATIONS",
  "WORKFLOWS",
  "APPROVALS",
  "ACTIVITY",
  "SETTINGS",
] as const;
export type Permission = (typeof permissionCategories)[number];

export type WorkspaceSettings = Readonly<{
  workspaceName: string;
  website: string;
  industry: Industry | "";
  companySize: CompanySize | "";
  timezone: string;
  responseExpectation: ResponseExpectation | "";
}>;

export const teamMemberStatuses = [
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
  "REVOKED",
] as const;
export type TeamMemberStatus = (typeof teamMemberStatuses)[number];

export type TeamMember = TeamMemberRecord;

export const aiActionPermissions = [
  "PROPOSE_ONLY",
  "POLICY_CONTROLLED",
  "BLOCKED",
] as const;
export type AIActionPermission = (typeof aiActionPermissions)[number];

export const humanApprovalRequirements = [
  "UNCONFIGURED",
  "RISK_BASED",
  "ALWAYS",
] as const;
export type HumanApprovalRequirement =
  (typeof humanApprovalRequirements)[number];

export type AISettings = Readonly<{
  assistanceEnabled: boolean;
  recommendationsEnabled: boolean;
  actionPermission: AIActionPermission;
  confidenceThreshold: number | null;
  humanApprovalRequirement: HumanApprovalRequirement;
}>;

export const approvalPolicyModes = [
  "AUTOMATIC",
  "REQUIRES_APPROVAL",
  "BLOCKED",
] as const;
export type ApprovalPolicyMode = (typeof approvalPolicyModes)[number];

export const configurableApprovalActions = [
  "SEND_CUSTOMER_MESSAGE",
  "UPDATE_LEAD",
  "CREATE_FOLLOW_UP",
  "ASSIGN_OWNER",
  "CHANGE_LEAD_STATUS",
  "TRIGGER_WORKFLOW",
  "EXECUTE_WORKFLOW",
] as const;
export type ConfigurableApprovalAction =
  (typeof configurableApprovalActions)[number];

export type ApprovalPolicy = Readonly<{
  action: ConfigurableApprovalAction;
  mode: ApprovalPolicyMode | null;
}>;

export const workflowExecutionModes = [
  "UNCONFIGURED",
  "MANUAL",
  "CONTROLLED_AUTOMATION",
] as const;
export type WorkflowExecutionMode = (typeof workflowExecutionModes)[number];

export type WorkflowSettings = Readonly<{
  executionMode: WorkflowExecutionMode;
  approvalRequired: boolean;
  failureHandling: "UNCONFIGURED" | "PAUSE" | "STOP" | "ESCALATE";
  retryPolicy: "UNCONFIGURED" | "NONE" | "LIMITED";
  executionLimit: number | null;
}>;

export const integrationCategories = [
  "COMMUNICATION",
  "CRM",
  "EMAIL",
  "CALENDAR",
  "AUTOMATION",
  "AI_PROVIDERS",
] as const;
export type IntegrationCategory = (typeof integrationCategories)[number];
export type IntegrationStatus = "NOT_CONNECTED";
export type Integration = Readonly<{
  category: IntegrationCategory;
  status: IntegrationStatus;
}>;

export type NotificationSettings = Readonly<{
  emailNotifications: boolean;
  inAppNotifications: boolean;
  approvalRequests: boolean;
  workflowEvents: boolean;
  followUpReminders: boolean;
  systemAlerts: boolean;
}>;

export type SecuritySettings = Readonly<{
  sessionSecurity: "SERVER_SESSIONS";
  passwordPolicy: "SERVER_VALIDATED";
  authentication: "BACKEND_CONNECTED";
  accessControl: "INFRASTRUCTURE_ONLY";
  auditLogging: "SERVER_RECORDED";
}>;

export type SettingsSectionId =
  | "general"
  | "team"
  | "roles-permissions"
  | "ai-settings"
  | "approval-policies"
  | "workflow-settings"
  | "integrations"
  | "notifications"
  | "security"
  | "danger-zone";

export const settingsSections = [
  { id: "general", label: "General", icon: "sliders" },
  { id: "team", label: "Team", icon: "users" },
  { id: "roles-permissions", label: "Roles & permissions", icon: "lock" },
  { id: "ai-settings", label: "AI settings", icon: "spark" },
  { id: "approval-policies", label: "Approval policies", icon: "user-check" },
  { id: "workflow-settings", label: "Workflow settings", icon: "workflow" },
  { id: "integrations", label: "Integrations", icon: "bolt" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "security", label: "Security", icon: "shield-check" },
  { id: "danger-zone", label: "Danger zone", icon: "alert" },
] as const satisfies readonly {
  id: SettingsSectionId;
  label: string;
  icon: import("../../components/icons").IconName;
}[];

export const initialWorkspaceSettings: WorkspaceSettings = {
  workspaceName: "",
  website: "",
  industry: "",
  companySize: "",
  timezone: "",
  responseExpectation: "",
};

export const initialAISettings: AISettings = {
  assistanceEnabled: false,
  recommendationsEnabled: false,
  actionPermission: "PROPOSE_ONLY",
  confidenceThreshold: null,
  humanApprovalRequirement: "UNCONFIGURED",
};

export const initialWorkflowSettings: WorkflowSettings = {
  executionMode: "UNCONFIGURED",
  approvalRequired: true,
  failureHandling: "UNCONFIGURED",
  retryPolicy: "UNCONFIGURED",
  executionLimit: null,
};

export const initialNotificationSettings: NotificationSettings = {
  emailNotifications: false,
  inAppNotifications: false,
  approvalRequests: false,
  workflowEvents: false,
  followUpReminders: false,
  systemAlerts: false,
};

export const securitySettings: SecuritySettings = {
  sessionSecurity: "SERVER_SESSIONS",
  passwordPolicy: "SERVER_VALIDATED",
  authentication: "BACKEND_CONNECTED",
  accessControl: "INFRASTRUCTURE_ONLY",
  auditLogging: "SERVER_RECORDED",
};

export const initialApprovalPolicies: readonly ApprovalPolicy[] =
  configurableApprovalActions.map((action) => ({ action, mode: null }));
export const integrations: readonly Integration[] = integrationCategories.map(
  (category) => ({ category, status: "NOT_CONNECTED" }),
);

export const TEAM_INVITE_UNAVAILABLE_MESSAGE =
  "Team invitations will be available when workspace services are connected.";
export const INTEGRATION_UNAVAILABLE_MESSAGE =
  "Integration connections will be available when provider services are connected.";
