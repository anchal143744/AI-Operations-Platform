import { conversationsService } from "../conversations/conversations-service";
import { followUpsService } from "../follow-ups/follow-ups-service";
import { initialFollowUpFilterState } from "../follow-ups/model";
import { leadsService } from "../leads/leads-service";
import { notificationsService } from "../app-shell/notifications-service";
import { workflowControlService } from "../workflows/workflow-control-service";
import type { WorkspaceSelection } from "../tenancy/tenancy-service";

export type DashboardSummary = Readonly<{
  /** A null count means its API could not be read, never an assumed zero. */
  leads: number | null;
  conversations: number | null;
  followUps: number | null;
  workflows: number | null;
  pendingApprovals: number | null;
  runningExecutions: number | null;
  failedExecutions: number | null;
  unreadNotifications: number | null;
}>;

export function dashboardWorkspaceKey(workspace: WorkspaceSelection): string {
  return `${workspace.organizationId}:${workspace.workspaceId}`;
}

export async function loadDashboardSummary(
  workspace: WorkspaceSelection,
): Promise<DashboardSummary> {
  const [leads, conversations, followUps, workflows, approvals, notifications] =
    await Promise.allSettled([
      leadsService.list(workspace, { page: 1, limit: 1 }),
      conversationsService.list(workspace, { page: 1, limit: 1 }),
      followUpsService.list(workspace, {
        page: 1,
        limit: 1,
        search: "",
        view: "ALL",
        filters: initialFollowUpFilterState,
      }),
      workflowControlService.summary(workspace),
      workflowControlService.approvalSummary(workspace),
      notificationsService.list(workspace),
    ]);

  return {
    leads: leads.status === "fulfilled" ? leads.value.total : null,
    conversations:
      conversations.status === "fulfilled" ? conversations.value.total : null,
    followUps: followUps.status === "fulfilled" ? followUps.value.total : null,
    workflows:
      workflows.status === "fulfilled" ? workflows.value.workflows : null,
    pendingApprovals:
      approvals.status === "fulfilled" ? approvals.value.pending : null,
    runningExecutions:
      workflows.status === "fulfilled" ? workflows.value.running : null,
    failedExecutions:
      workflows.status === "fulfilled" ? workflows.value.failed : null,
    unreadNotifications:
      notifications.status === "fulfilled"
        ? notifications.value.unreadCount
        : null,
  };
}
