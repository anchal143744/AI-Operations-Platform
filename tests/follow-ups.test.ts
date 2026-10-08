import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { leadPriorities } from "../apps/web/lib/leads/model";
import {
  FOLLOW_UP_AI_UNAVAILABLE_MESSAGE,
  followUpPriorities,
  followUpSortOptions,
  followUpStatuses,
  followUpTypes,
  followUpViews,
  getActiveFollowUpFilterCount,
  getFollowUpEmptyState,
  initialFollowUpFilterState,
  toggleFollowUpFilterValue,
  type FollowUp,
} from "../apps/web/lib/follow-ups/model";

describe("follow-up domain model", () => {
  it("centralizes the requested status values", () => {
    expect(followUpStatuses).toEqual([
      "PENDING",
      "DUE",
      "OVERDUE",
      "COMPLETED",
      "CANCELLED",
    ]);
  });

  it("reuses the existing operational priority scale", () => {
    expect(followUpPriorities).toBe(leadPriorities);
    expect(followUpPriorities).toEqual(["LOW", "MEDIUM", "HIGH", "URGENT"]);
  });

  it("centralizes future action types", () => {
    expect(followUpTypes).toEqual([
      "CALL",
      "EMAIL",
      "MESSAGE",
      "MEETING",
      "TASK",
      "OTHER",
    ]);
  });

  it("supports lead and conversation relationships without duplicate records", () => {
    const shape: FollowUp = {
      id: "shape-only",
      leadId: "lead-id",
      conversationId: "conversation-id",
      type: "CALL",
      status: "PENDING",
      priority: "MEDIUM",
      title: "Shape verification",
      description: null,
      owner: null,
      dueAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
    };

    expect(shape.leadId).toBe("lead-id");
    expect(shape.conversationId).toBe("conversation-id");
    expect(shape.owner).toBeNull();
  });
});

describe("follow-up controls", () => {
  it("defines all requested views", () => {
    expect(followUpViews.map((view) => view.label)).toEqual([
      "All",
      "Due today",
      "Upcoming",
      "Overdue",
      "Completed",
    ]);
  });

  it("defines all requested sort options", () => {
    expect(followUpSortOptions.map((option) => option.label)).toEqual([
      "Due soonest",
      "Due latest",
      "Priority highest",
      "Recently created",
    ]);
  });

  it("updates filter values without mutating the source", () => {
    const original = ["PENDING"] as const;
    expect(toggleFollowUpFilterValue(original, "DUE")).toEqual([
      "PENDING",
      "DUE",
    ]);
    expect(toggleFollowUpFilterValue(original, "PENDING")).toEqual([]);
    expect(original).toEqual(["PENDING"]);
  });

  it("counts status, priority, type, owner, and date filters", () => {
    expect(
      getActiveFollowUpFilterCount({
        ...initialFollowUpFilterState,
        statuses: ["DUE"],
        priorities: ["HIGH"],
        types: ["EMAIL"],
        owners: ["UNASSIGNED"],
        date: "UPCOMING",
      }),
    ).toBe(5);
  });
});

describe("follow-up workspace states", () => {
  it("provides distinct default, search, filter, and view empty states", () => {
    expect(
      getFollowUpEmptyState("", initialFollowUpFilterState, "ALL").title,
    ).toBe("No follow-ups yet");
    expect(
      getFollowUpEmptyState("Northstar", initialFollowUpFilterState, "ALL")
        .title,
    ).toBe("No follow-ups match your search.");
    expect(
      getFollowUpEmptyState(
        "",
        { ...initialFollowUpFilterState, statuses: ["OVERDUE"] },
        "ALL",
      ).title,
    ).toBe("No follow-ups match these filters.");
    expect(
      getFollowUpEmptyState("", initialFollowUpFilterState, "DUE_TODAY").title,
    ).toBe("No due today follow-ups");
  });

  it("keeps AI assistance honestly unavailable", () => {
    expect(FOLLOW_UP_AI_UNAVAILABLE_MESSAGE).toBe(
      "AI-powered follow-up recommendations will appear when conversation intelligence is connected.",
    );
  });

  it("activates the route and preserves navigation to Leads", () => {
    const routePath = fileURLToPath(
      new URL("../apps/web/app/follow-ups/page.tsx", import.meta.url),
    );
    const emptyPath = fileURLToPath(
      new URL(
        "../apps/web/components/follow-ups/follow-up-empty-state.tsx",
        import.meta.url,
      ),
    );
    const routeSource = readFileSync(routePath, "utf8");
    const emptySource = readFileSync(emptyPath, "utf8");

    expect(routeSource).toContain('currentRoute="/follow-ups"');
    expect(emptySource).toContain('href="/leads"');
  });

  it("loads real workspace follow-ups while keeping future relationships honest", () => {
    const pagePath = fileURLToPath(
      new URL(
        "../apps/web/components/follow-ups/follow-ups-page.tsx",
        import.meta.url,
      ),
    );
    const contextPath = fileURLToPath(
      new URL(
        "../apps/web/components/follow-ups/follow-up-context.tsx",
        import.meta.url,
      ),
    );
    const pageSource = readFileSync(pagePath, "utf8");
    const contextSource = readFileSync(contextPath, "utf8");

    expect(pageSource).toMatch(/followUpsService\s*\.\s*list\s*\(\s*workspace/);
    expect(pageSource).toMatch(
      /followUpsService\s*\.\s*create\s*\(\s*workspace/,
    );
    expect(pageSource).toMatch(
      /followUpsService\s*\.\s*complete\s*\(\s*workspace/,
    );
    expect(contextSource).toContain("Not linked");
    expect(contextSource).toContain("Unassigned");
  });
});
