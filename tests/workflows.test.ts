import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  WORKFLOW_CREATION_UNAVAILABLE_MESSAGE,
  emptyWorkflows,
  getActiveWorkflowFilterCount,
  getWorkflowEmptyState,
  initialWorkflowFilterState,
  toggleWorkflowFilterValue,
  workflowControlStages,
  workflowExecutionStatuses,
  workflowSafetyPrinciples,
  workflowStatuses,
  workflowStepTypes,
  workflowTriggerTypes,
  workflowViews,
  type Workflow,
} from "../apps/web/lib/workflows/model";

describe("workflow domain", () => {
  it("defines the requested statuses and triggers", () => {
    expect(workflowStatuses).toEqual([
      "DRAFT",
      "ACTIVE",
      "PAUSED",
      "COMPLETED",
      "FAILED",
    ]);
    expect(workflowTriggerTypes).toEqual([
      "NEW_LEAD",
      "NEW_CONVERSATION",
      "LEAD_STATUS_CHANGED",
      "FOLLOW_UP_DUE",
      "FOLLOW_UP_OVERDUE",
      "AI_RECOMMENDATION",
      "FORM_SUBMITTED",
      "MANUAL_TRIGGER",
      "SCHEDULED",
    ]);
  });

  it("defines every requested non-executing step type", () => {
    expect(workflowStepTypes).toEqual([
      "ANALYZE_WITH_AI",
      "QUALIFY_LEAD",
      "UPDATE_LEAD",
      "CREATE_FOLLOW_UP",
      "SEND_MESSAGE",
      "ASSIGN_OWNER",
      "WAIT",
      "REQUEST_HUMAN_APPROVAL",
      "RUN_CONDITION",
      "CREATE_TASK",
      "LOG_ACTIVITY",
      "END",
    ]);
  });

  it("supports typed source relationships without operational data", () => {
    const shape: Workflow = {
      id: "shape-only",
      name: "Shape",
      description: "Type check",
      status: "DRAFT",
      trigger: { type: "NEW_LEAD", sourceId: "lead-id" },
      steps: [
        {
          id: "step-1",
          type: "REQUEST_HUMAN_APPROVAL",
          order: 1,
          requiresApproval: true,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      owner: null,
      requiresApproval: true,
    };
    expect(shape.trigger.sourceId).toBe("lead-id");
    expect(workflowExecutionStatuses).toEqual([
      "QUEUED",
      "RUNNING",
      "WAITING_FOR_APPROVAL",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
    ]);
  });
});

describe("workflow controls and honest states", () => {
  it("keeps collections empty and defines all views", () => {
    expect(emptyWorkflows).toEqual([]);
    expect(workflowViews.map((view) => view.label)).toEqual([
      "All",
      "Active",
      "Draft",
      "Paused",
      "Completed",
      "Failed",
    ]);
  });

  it("provides distinct default, search, filter, and view empty states", () => {
    expect(
      getWorkflowEmptyState("", initialWorkflowFilterState, "ALL").title,
    ).toBe("No workflows yet");
    expect(
      getWorkflowEmptyState("intake", initialWorkflowFilterState, "ALL").title,
    ).toBe("No workflows match your search.");
    expect(
      getWorkflowEmptyState(
        "",
        { ...initialWorkflowFilterState, statuses: ["FAILED"] },
        "ALL",
      ).title,
    ).toBe("No workflows match these filters.");
    expect(
      getWorkflowEmptyState("", initialWorkflowFilterState, "ACTIVE").title,
    ).toBe("No active workflows");
  });

  it("counts and toggles workflow filters without mutation", () => {
    const original = ["DRAFT"] as const;
    expect(toggleWorkflowFilterValue(original, "ACTIVE")).toEqual([
      "DRAFT",
      "ACTIVE",
    ]);
    expect(original).toEqual(["DRAFT"]);
    expect(
      getActiveWorkflowFilterCount({
        ...initialWorkflowFilterState,
        statuses: ["FAILED"],
        triggers: ["NEW_LEAD"],
        owners: ["UNASSIGNED"],
        approval: "REQUIRED",
      }),
    ).toBe(4);
  });

  it("models control and safety while keeping execution unavailable", () => {
    expect(workflowControlStages).toEqual([
      "Trigger",
      "Context",
      "AI decision",
      "Policy",
      "Human approval",
      "Action",
      "Audit",
    ]);
    expect(workflowSafetyPrinciples).toHaveLength(6);
    expect(WORKFLOW_CREATION_UNAVAILABLE_MESSAGE).toContain(
      "automation engine is connected",
    );
    const page = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/workflows/workflows-page.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    const controls = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/workflows/workflow-controls.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(page).toContain("WorkflowRuntimePanel");
    const runtime = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/workflow-control/workflow-runtime-panel.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(runtime).toContain("workflowControlService.workflows");
    expect(runtime).toContain("workflowControlService.dryRun");
    expect(runtime).toContain("workflowControlService.definition");
    expect(runtime).toContain("Definition v{workflow.currentVersion}");
    expect(controls).toContain("workspace activity log");
  });

  it("renders a labelled, non-executable builder preview", () => {
    const preview = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/workflows/workflow-builder-preview.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(preview).toContain("Architecture preview · Not executable");
    expect(preview).toContain("Requires human review?");
    expect(preview).toContain("Audit");
  });
});
