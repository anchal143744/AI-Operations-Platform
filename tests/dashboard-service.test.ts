import { afterEach, describe, expect, it, vi } from "vitest";
import { conversationsService } from "../apps/web/lib/conversations/conversations-service";
import { followUpsService } from "../apps/web/lib/follow-ups/follow-ups-service";
import {
  dashboardWorkspaceKey,
  loadDashboardSummary,
} from "../apps/web/lib/dashboard/dashboard-service";
import { leadsService } from "../apps/web/lib/leads/leads-service";
import { workflowControlService } from "../apps/web/lib/workflows/workflow-control-service";
import { notificationsService } from "../apps/web/lib/app-shell/notifications-service";

const workspace = {
  organizationId: "organization-a",
  organizationName: "Organization A",
  workspaceId: "workspace-a",
  workspaceName: "Workspace A",
  role: "OWNER" as const,
};

afterEach(() => vi.restoreAllMocks());

describe("dashboard data boundary", () => {
  it("uses the selected workspace for real API counts", async () => {
    const leads = vi.spyOn(leadsService, "list").mockResolvedValue({
      items: [],
      page: 1,
      limit: 1,
      total: 3,
    });
    const conversations = vi
      .spyOn(conversationsService, "list")
      .mockResolvedValue({ items: [], page: 1, limit: 1, total: 2 });
    const followUps = vi.spyOn(followUpsService, "list").mockResolvedValue({
      items: [],
      page: 1,
      limit: 1,
      total: 4,
    });
    vi.spyOn(workflowControlService, "summary").mockResolvedValue({
      workflows: 5,
      running: 1,
      failed: 2,
    });
    vi.spyOn(workflowControlService, "approvalSummary").mockResolvedValue({
      pending: 3,
    });
    vi.spyOn(notificationsService, "list").mockResolvedValue({
      items: [],
      unreadCount: 4,
    });

    expect(await loadDashboardSummary(workspace)).toEqual({
      leads: 3,
      conversations: 2,
      followUps: 4,
      workflows: 5,
      pendingApprovals: 3,
      runningExecutions: 1,
      failedExecutions: 2,
      unreadNotifications: 4,
    });
    expect(leads).toHaveBeenCalledWith(workspace, { page: 1, limit: 1 });
    expect(conversations).toHaveBeenCalledWith(workspace, {
      page: 1,
      limit: 1,
    });
    expect(followUps).toHaveBeenCalledWith(
      workspace,
      expect.objectContaining({ page: 1, limit: 1, view: "ALL" }),
    );
  });

  it("never converts an API failure into a fabricated zero", async () => {
    vi.spyOn(leadsService, "list").mockRejectedValue(new Error("unavailable"));
    vi.spyOn(conversationsService, "list").mockResolvedValue({
      items: [],
      page: 1,
      limit: 1,
      total: 0,
    });
    vi.spyOn(followUpsService, "list").mockRejectedValue(
      new Error("unavailable"),
    );
    vi.spyOn(workflowControlService, "summary").mockRejectedValue(
      new Error("unavailable"),
    );
    vi.spyOn(workflowControlService, "approvalSummary").mockResolvedValue({
      pending: 0,
    });
    vi.spyOn(notificationsService, "list").mockRejectedValue(
      new Error("unavailable"),
    );

    expect(await loadDashboardSummary(workspace)).toEqual({
      leads: null,
      conversations: 0,
      followUps: null,
      workflows: null,
      pendingApprovals: 0,
      runningExecutions: null,
      failedExecutions: null,
      unreadNotifications: null,
    });
  });

  it("keys displayed results by both organization and workspace", () => {
    expect(dashboardWorkspaceKey(workspace)).not.toBe(
      dashboardWorkspaceKey({ ...workspace, workspaceId: "workspace-b" }),
    );
    expect(dashboardWorkspaceKey(workspace)).not.toBe(
      dashboardWorkspaceKey({ ...workspace, organizationId: "organization-b" }),
    );
  });
});
