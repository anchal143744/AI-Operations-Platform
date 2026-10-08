import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  APPROVAL_POLICY_UNAVAILABLE_MESSAGE,
  APPROVAL_PROCESSING_UNAVAILABLE_MESSAGE,
  approvalContextLinks,
  approvalControlStages,
  approvalDecisionTypes,
  approvalExecutionStatuses,
  approvalPriorities,
  approvalSortOptions,
  approvalSourceTypes,
  approvalStatuses,
  approvalViews,
  rejectionReasonCategories,
  requestedActionTypes,
  type ApprovalRequest,
} from "../apps/web/lib/approvals/model";
import {
  emptyApprovalRequests,
  getActiveApprovalFilterCount,
  getApprovalEmptyState,
  initialApprovalFilterState,
  toggleApprovalFilterValue,
} from "../apps/web/lib/approvals/state";
import { leadPriorities } from "../apps/web/lib/leads/model";

describe("approval request domain", () => {
  it("defines the requested status and action vocabularies", () => {
    expect(approvalStatuses).toEqual([
      "NEEDS_REVIEW",
      "APPROVED",
      "REJECTED",
      "EXPIRED",
      "CANCELLED",
    ]);
    expect(requestedActionTypes).toEqual([
      "SEND_MESSAGE",
      "UPDATE_LEAD",
      "CREATE_FOLLOW_UP",
      "ASSIGN_OWNER",
      "CHANGE_STATUS",
      "TRIGGER_WORKFLOW",
      "EXECUTE_WORKFLOW",
      "OTHER",
    ]);
  });

  it("reuses the operational priority scale", () => {
    expect(approvalPriorities).toBe(leadPriorities);
    expect(approvalPriorities).toEqual(["LOW", "MEDIUM", "HIGH", "URGENT"]);
  });

  it("references all existing operational source domains", () => {
    expect(approvalSourceTypes).toEqual([
      "AI_OPERATION",
      "WORKFLOW",
      "LEAD",
      "CONVERSATION",
      "FOLLOW_UP",
    ]);
    const shape: ApprovalRequest = {
      id: "shape-only",
      title: "Shape",
      description: "Compile-time contract",
      status: "NEEDS_REVIEW",
      priority: "HIGH",
      source: { type: "AI_OPERATION", resourceId: "ai-operation-id" },
      requestedAction: "SEND_MESSAGE",
      reason: "Policy boundary",
      requiresHumanReview: true,
      requestedBy: "system",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(shape.source.type).toBe("AI_OPERATION");
    expect(approvalDecisionTypes).toEqual([
      "APPROVE",
      "REJECT",
      "EDIT_AND_APPROVE",
    ]);
    expect(approvalExecutionStatuses).toContain("NOT_STARTED");
  });
});

describe("approval queue state", () => {
  it("keeps the collection empty and defines the requested views and sorting", () => {
    expect(emptyApprovalRequests).toEqual([]);
    expect(approvalViews.map((view) => view.label)).toEqual([
      "All",
      "Needs review",
      "High priority",
      "Approved",
      "Rejected",
    ]);
    expect(approvalSortOptions.map((option) => option.label)).toEqual([
      "Newest",
      "Oldest",
      "Priority",
      "Needs review first",
    ]);
  });

  it("provides honest default, search, filter, and view empty states", () => {
    expect(
      getApprovalEmptyState("", initialApprovalFilterState, "ALL").title,
    ).toBe("No actions need your review");
    expect(
      getApprovalEmptyState("message", initialApprovalFilterState, "ALL").title,
    ).toBe("No review requests match your search.");
    expect(
      getApprovalEmptyState(
        "",
        { ...initialApprovalFilterState, statuses: ["REJECTED"] },
        "ALL",
      ).title,
    ).toBe("No review requests match these filters.");
    expect(
      getApprovalEmptyState("", initialApprovalFilterState, "APPROVED").title,
    ).toBe("No approved requests");
  });

  it("counts and toggles all filter groups without mutation", () => {
    const original = ["APPROVED"] as const;
    expect(toggleApprovalFilterValue(original, "REJECTED")).toEqual([
      "APPROVED",
      "REJECTED",
    ]);
    expect(original).toEqual(["APPROVED"]);
    expect(
      getActiveApprovalFilterCount({
        ...initialApprovalFilterState,
        statuses: ["NEEDS_REVIEW"],
        priorities: ["HIGH"],
        sources: ["WORKFLOW"],
        actions: ["EXECUTE_WORKFLOW"],
        reviewers: ["UNASSIGNED"],
      }),
    ).toBe(5);
  });
});

describe("approval control architecture", () => {
  it("separates AI, policy, human, and system responsibility", () => {
    expect(approvalControlStages.map((stage) => stage.label)).toEqual([
      "AI",
      "Policy",
      "Human",
      "System",
    ]);
    expect(rejectionReasonCategories).toContain("Insufficient context");
  });

  it("links only to existing operational routes", () => {
    expect(approvalContextLinks.map((link) => link.href)).toEqual([
      "/leads",
      "/inbox",
      "/follow-ups",
      "/ai-operations",
      "/workflows",
    ]);
  });

  it("uses honest policy and decision unavailable states", () => {
    expect(APPROVAL_POLICY_UNAVAILABLE_MESSAGE).toBe(
      "Approval policies will be configurable when the policy engine is connected.",
    );
    expect(APPROVAL_PROCESSING_UNAVAILABLE_MESSAGE).toContain(
      "backend approval service is connected",
    );
  });

  it("renders empty AI, action, context, and audit states", () => {
    const detail = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/approvals/approval-details.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    const context = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/approvals/approval-context.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    const audit = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/approvals/approval-audit-preview.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(detail).toContain("No AI recommendation is available.");
    expect(detail).toContain("No action has been proposed.");
    expect(context).toContain("No operational context linked");
    expect(audit).toContain("No approval activity recorded yet.");
  });

  it("renders the real tenant-scoped review queue and keeps route active", () => {
    const page = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/approvals/approval-page.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    const route = readFileSync(
      fileURLToPath(
        new URL("../apps/web/app/approvals/page.tsx", import.meta.url),
      ),
      "utf8",
    );
    expect(page).toContain("ApprovalRuntimePanel");
    const runtime = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/workflow-control/approval-runtime-panel.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(runtime).toContain("workflowControlService.approvals");
    expect(runtime).toContain("workflowControlService.decide");
    expect(runtime).toContain("No external provider will be called.");
    expect(route).toContain('currentRoute="/approvals"');
  });
});
