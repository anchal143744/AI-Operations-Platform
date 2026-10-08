import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { leadPriorities } from "../apps/web/lib/leads/model";
import {
  AI_CONFIGURATION_UNAVAILABLE_MESSAGE,
  AI_CONTEXT_CONNECTIONS,
  AI_CONTROL_GROUPS,
  aiOperationPriorities,
  aiOperationSourceTypes,
  aiOperationStatuses,
  aiOperationTypes,
  aiOperationViews,
  emptyAIOperations,
  getActiveAIOperationFilterCount,
  getAIOperationEmptyState,
  initialAIOperationFilterState,
  toggleAIOperationFilterValue,
  type AIOperation,
} from "../apps/web/lib/ai-operations/model";

describe("AI operation domain", () => {
  it("defines the requested operation types and statuses", () => {
    expect(aiOperationTypes).toEqual([
      "ANALYZE_CONVERSATION",
      "QUALIFY_LEAD",
      "DRAFT_RESPONSE",
      "RECOMMEND_FOLLOW_UP",
      "CLASSIFY_LEAD",
      "SUMMARIZE_ACTIVITY",
      "TRIGGER_WORKFLOW",
      "OTHER",
    ]);
    expect(aiOperationStatuses).toEqual([
      "QUEUED",
      "RUNNING",
      "NEEDS_REVIEW",
      "APPROVED",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ]);
  });

  it("reuses priority semantics and references existing source identities", () => {
    expect(aiOperationPriorities).toBe(leadPriorities);
    expect(aiOperationSourceTypes).toEqual([
      "LEAD",
      "CONVERSATION",
      "FOLLOW_UP",
      "WORKFLOW",
    ]);
    const shape: AIOperation = {
      id: "shape-only",
      type: "QUALIFY_LEAD",
      status: "QUEUED",
      priority: "MEDIUM",
      source: { type: "LEAD", resourceId: "lead-id" },
      title: "Shape",
      description: "Type check",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      requiresHumanReview: true,
      assignedTo: null,
    };
    expect(shape.source).toEqual({ type: "LEAD", resourceId: "lead-id" });
  });
});

describe("AI operation controls and honest states", () => {
  it("keeps the queue empty and provides all requested views", () => {
    expect(emptyAIOperations).toEqual([]);
    expect(aiOperationViews.map((view) => view.label)).toEqual([
      "All",
      "Needs review",
      "Running",
      "Completed",
      "Failed",
    ]);
  });

  it("provides distinct empty states for search, filters, and views", () => {
    expect(
      getAIOperationEmptyState("", initialAIOperationFilterState, "ALL").title,
    ).toBe("No AI operations yet");
    expect(
      getAIOperationEmptyState("lead", initialAIOperationFilterState, "ALL")
        .title,
    ).toBe("No AI operations match your search.");
    expect(
      getAIOperationEmptyState(
        "",
        { ...initialAIOperationFilterState, statuses: ["FAILED"] },
        "ALL",
      ).title,
    ).toBe("No AI operations match these filters.");
    expect(
      getAIOperationEmptyState("", initialAIOperationFilterState, "RUNNING")
        .title,
    ).toBe("No running AI operations");
  });

  it("counts and toggles typed filters without mutation", () => {
    const original = ["RUNNING"] as const;
    expect(toggleAIOperationFilterValue(original, "FAILED")).toEqual([
      "RUNNING",
      "FAILED",
    ]);
    expect(original).toEqual(["RUNNING"]);
    expect(
      getActiveAIOperationFilterCount({
        ...initialAIOperationFilterState,
        statuses: ["FAILED"],
        priorities: ["HIGH"],
        sources: ["LEAD"],
        review: "REQUIRED",
      }),
    ).toBe(4);
  });

  it("models policy, human, system, activity, and source connections without records", () => {
    expect(AI_CONTROL_GROUPS.map((group) => group.label)).toEqual([
      "AI",
      "Policy",
      "Human",
      "System",
    ]);
    expect(AI_CONTEXT_CONNECTIONS.map((item) => item.href)).toEqual([
      "/leads",
      "/inbox",
      "/follow-ups",
      "/workflows",
    ]);
    expect(AI_CONFIGURATION_UNAVAILABLE_MESSAGE).toContain(
      "engine is connected",
    );
    const page = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/ai-operations/ai-operations-page.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    const governance = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/ai-operations/ai-governance.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(page).toContain("emptyAIOperations");
    expect(governance).toContain("No AI actions require review.");
    expect(governance).toContain("No AI activity recorded yet.");
  });
});
