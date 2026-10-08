export type HealthStatus = { status: "ok" | "degraded"; scope: string };

export type AuthUser = Readonly<{
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}>;

export type AuthWorkspaceAccess = Readonly<{
  organizationId: string;
  organizationName: string;
  membershipId: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "VIEWER";
  workspaceIds: readonly string[];
  workspaces: readonly Readonly<{ id: string; name: string }>[];
}>;

export type AuthenticatedSession = Readonly<{
  user: AuthUser;
  session: Readonly<{ expiresAt: string }>;
  workspaceAccess: readonly AuthWorkspaceAccess[];
  activeWorkspace?: Readonly<{
    organizationId: string;
    workspaceId: string;
  }> | null;
}>;

export type LoginRequest = Readonly<{
  email: string;
  password: string;
  rememberMe?: boolean;
}>;

export type RegistrationRequest = Readonly<{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}>;

export type RegistrationResponse = Readonly<{
  accepted: true;
  verificationRequired: true;
  deliveryConfigured: boolean;
  /** Only present for loopback development with the non-delivering adapter. */
  localDevelopmentCode?: string;
}>;

export type EmailVerificationRequest = Readonly<{ code: string }>;

export type EmailVerificationResponse = Readonly<{
  verified: true;
  session: AuthenticatedSession;
}>;

export type PasswordResetRequest = Readonly<{ email: string }>;

export type PasswordUpdateRequest = Readonly<{
  resetToken: string;
  newPassword: string;
}>;

export type GenericAuthResponse = Readonly<{
  accepted: true;
  deliveryConfigured?: boolean;
  /** Only present for loopback development with the non-delivering adapter. */
  localDevelopmentCode?: string;
}>;

export type WorkspaceSummary = Readonly<{
  id: string;
  name: string;
  slug: string;
}>;

export type OrganizationSummary = Readonly<{
  id: string;
  name: string;
  slug: string;
  role: AuthWorkspaceAccess["role"];
  workspaces: readonly WorkspaceSummary[];
}>;

export type OrganizationBootstrapRequest = Readonly<{
  name: string;
  slug: string;
  workspaceName: string;
  workspaceSlug: string;
  profile?: Omit<WorkspaceProfile, "workspaceName">;
}>;

export type OrganizationBootstrapResponse = Readonly<{
  organization: OrganizationSummary;
  membershipId: string;
  workspace: WorkspaceSummary;
}>;

export type CreateWorkspaceRequest = Readonly<{
  name: string;
  slug: string;
}>;

export type SelectWorkspaceRequest = Readonly<{
  organizationId: string;
  workspaceId: string;
}>;

export const activityActorTypes = ["USER", "SYSTEM", "AI", "PROVIDER"] as const;
export type ActivityActorType = (typeof activityActorTypes)[number];
export const activityEventTypes = [
  "USER_LOGIN",
  "USER_LOGOUT",
  "ORGANIZATION_CREATED",
  "WORKSPACE_CREATED",
  "WORKSPACE_SELECTED",
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "FOLLOW_UP_CREATED",
  "FOLLOW_UP_COMPLETED",
  "FOLLOW_UP_RESCHEDULED",
  "SETTINGS_UPDATED",
  "CONVERSATION_CREATED",
  "MESSAGE_RECORDED",
  "MESSAGE_QUEUED",
  "MESSAGE_SUBMITTED",
  "MESSAGE_DELIVERY_ACCEPTED",
  "MESSAGE_DELIVERY_UNCERTAIN",
  "MESSAGE_DELIVERED",
  "MESSAGE_FAILED",
  "WEBHOOK_RECEIVED",
  "WORKFLOW_CREATED",
  "WORKFLOW_DEFINITION_CHANGED",
  "WORKFLOW_STATUS_CHANGED",
  "POLICY_CHANGED",
  "POLICY_EVALUATED",
  "APPROVAL_DECIDED",
  "WORKFLOW_EXECUTION_CHANGED",
  "NOTIFICATION_CREATED",
  "NOTIFICATION_READ",
  "APPROVAL_EXPIRED",
] as const;
export type ActivityEventType = (typeof activityEventTypes)[number];
export type ActivityRecord = Readonly<{
  id: string;
  actorType: ActivityActorType;
  eventType: ActivityEventType;
  resourceType: string | null;
  resourceId: string | null;
  action: string;
  summary: string;
  occurredAt: string;
}>;
export type ActivityListResponse = Readonly<{
  items: readonly ActivityRecord[];
  page: number;
  limit: number;
  total: number;
}>;

export type AuthErrorCode =
  | "AUTHENTICATION_FAILED"
  | "EMAIL_VERIFICATION_REQUIRED"
  | "INVALID_OR_EXPIRED_TOKEN"
  | "INVALID_SESSION"
  | "RATE_LIMITED"
  | "CSRF_ORIGIN_REJECTED"
  | "VALIDATION_FAILED"
  | "SERVICE_UNAVAILABLE";

export type AuthErrorResponse = Readonly<{
  statusCode: number;
  code: AuthErrorCode;
  message: string;
}>;

export const leadStatuses = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "IN_PROGRESS",
  "CONVERTED",
  "LOST",
] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type LeadPriority = (typeof leadPriorities)[number];

export const leadSources = [
  "WEBSITE",
  "WHATSAPP",
  "EMAIL",
  "INSTAGRAM",
  "PHONE",
  "MANUAL",
  "OTHER",
] as const;
export type LeadSource = (typeof leadSources)[number];

export const leadSortValues = [
  "NEWEST",
  "OLDEST",
  "RECENTLY_UPDATED",
  "PRIORITY",
] as const;
export type LeadSort = (typeof leadSortValues)[number];

export type LeadRecord = Readonly<{
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string | null;
  nextFollowUpAt: string | null;
}>;

export type LeadListResponse = Readonly<{
  items: readonly LeadRecord[];
  page: number;
  limit: number;
  total: number;
}>;

export type LeadStatusTotals = Readonly<Record<LeadStatus, number>>;

export type CreateLeadRequest = Readonly<{
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: LeadSource;
  priority?: LeadPriority;
}>;

export type UpdateLeadRequest = Readonly<
  Partial<CreateLeadRequest> & {
    status?: LeadStatus;
  }
>;

export const conversationChannels = [
  "WHATSAPP",
  "INSTAGRAM",
  "EMAIL",
  "SMS",
  "WEB_CHAT",
  "PHONE",
  "WEBSITE",
  "OTHER",
] as const;
export type ConversationChannel = (typeof conversationChannels)[number];

export const conversationStatuses = [
  "OPEN",
  "WAITING",
  "RESOLVED",
  "ARCHIVED",
] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];

export const conversationAttentionStates = [
  "NONE",
  "HUMAN_REQUIRED",
  "AI_REVIEW_REQUIRED",
  "FOLLOW_UP_DUE",
] as const;
export type ConversationAttentionState =
  (typeof conversationAttentionStates)[number];

export const messageDirections = ["INBOUND", "OUTBOUND"] as const;
export type MessageDirection = (typeof messageDirections)[number];
export const messageSenderTypes = ["CUSTOMER", "HUMAN", "AI"] as const;
export type MessageSenderType = (typeof messageSenderTypes)[number];
export const messageStatuses = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "SENT",
  "QUEUED",
  "SUBMITTED",
  "PROVIDER_ACCEPTED",
  "DELIVERED",
  "READ",
  "FAILED",
  "CANCELLED",
] as const;
export type MessageStatus = (typeof messageStatuses)[number];

export const conversationSortValues = [
  "NEWEST_ACTIVITY",
  "OLDEST_ACTIVITY",
] as const;
export type ConversationSort = (typeof conversationSortValues)[number];

export type ConversationRecord = Readonly<{
  id: string;
  leadId: string | null;
  channel: ConversationChannel;
  status: ConversationStatus;
  attentionState: ConversationAttentionState;
  subject: string | null;
  participantName: string;
  participantCompany: string | null;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessagePreview?: string;
}>;

export type ConversationMessageRecord = Readonly<{
  id: string;
  conversationId: string;
  direction: MessageDirection;
  senderType: MessageSenderType;
  content: string;
  createdAt: string;
  status: MessageStatus;
}>;

export type ConversationDetailResponse = Readonly<{
  conversation: ConversationRecord;
  messages: readonly ConversationMessageRecord[];
  lead: LeadRecord | null;
}>;

export type ConversationListResponse = Readonly<{
  items: readonly ConversationRecord[];
  page: number;
  limit: number;
  total: number;
}>;

export type CreateConversationRequest = Readonly<{
  participantName: string;
  participantCompany?: string;
  subject?: string;
  channel: ConversationChannel;
  leadId?: string;
}>;

export type CreateMessageRequest = Readonly<{ content: string }>;

export const followUpTypes = [
  "CALL",
  "EMAIL",
  "MESSAGE",
  "MEETING",
  "TASK",
  "OTHER",
] as const;
export type FollowUpType = (typeof followUpTypes)[number];
export const followUpStatuses = [
  "PENDING",
  "DUE",
  "OVERDUE",
  "COMPLETED",
  "CANCELLED",
] as const;
export type FollowUpStatus = (typeof followUpStatuses)[number];
export type FollowUpRecord = Readonly<{
  id: string;
  leadId: string | null;
  conversationId: string | null;
  title: string | null;
  description: string | null;
  type: FollowUpType | null;
  status: FollowUpStatus;
  priority: LeadPriority;
  owner: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}>;
export type FollowUpListResponse = Readonly<{
  items: readonly FollowUpRecord[];
  page: number;
  limit: number;
  total: number;
}>;
export type FollowUpSummary = Readonly<{
  DUE_TODAY: number;
  UPCOMING: number;
  OVERDUE: number;
  COMPLETED: number;
}>;
export type CreateFollowUpRequest = Readonly<{
  title: string;
  description?: string;
  type: FollowUpType;
  priority: LeadPriority;
  dueAt: string;
  leadId?: string;
  conversationId?: string;
}>;

export type WorkspaceProfile = Readonly<{
  workspaceName: string;
  website: string;
  industry: string;
  companySize: string;
  timezone: string;
  responseExpectation: string;
}>;

export type TeamMemberRecord = Readonly<{
  id: string;
  name: string;
  email: string;
  role: AuthWorkspaceAccess["role"];
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "REVOKED";
  lastActiveAt: string | null;
}>;
