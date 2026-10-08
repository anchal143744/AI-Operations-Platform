import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  ActivityEventService,
  activityDateStart,
} from "../apps/api/src/activity/activity.service";
import {
  ACTIVITY_EXPORT_UNAVAILABLE_MESSAGE,
  activityActorTypes,
  activityDateRanges,
  activityEventStatuses,
  activityEventTypes,
  activitySortOptions,
  activityViews,
  auditControlStages,
  emptyActivityEvents,
  type ActivityEvent,
} from "../apps/web/lib/activity/model";
import {
  getActiveActivityFilterCount,
  getActivityEmptyState,
  initialActivityFilterState,
  toggleActivityFilterValue,
} from "../apps/web/lib/activity/state";

describe("activity domain", () => {
  it("defines the requested cross-domain event categories", () => {
    expect(activityEventTypes).toEqual([
      "AI_OPERATION",
      "APPROVAL",
      "WORKFLOW",
      "LEAD",
      "CONVERSATION",
      "FOLLOW_UP",
      "SYSTEM",
      "SECURITY",
    ]);
    expect(activityEventStatuses).toContain("RECORDED");
    expect(activityActorTypes).toEqual([
      "USER",
      "AI",
      "WORKFLOW",
      "SYSTEM",
      "PROVIDER",
    ]);
    expect(activityDateRanges.map((range) => range.label)).toContain(
      "Last 30 days",
    );
  });

  it("references an existing domain id without duplicating the source model", () => {
    const event: ActivityEvent = {
      id: "shape-only",
      type: "LEAD",
      source: { type: "LEAD", resourceId: "lead-id" },
      status: "RECORDED",
      priority: "LOW",
      actor: { type: "SYSTEM" },
      action: "Shape",
      summary: "Compile-time contract only",
      createdAt: "2026-01-01T00:00:00.000Z",
      context: { leadId: "lead-id" },
    };
    expect(event.source.type).toBe("LEAD");
  });
});

describe("activity workspace state", () => {
  it("keeps the collection empty and prepares all views and sorting", () => {
    expect(emptyActivityEvents).toEqual([]);
    expect(activityViews.map((view) => view.label)).toEqual([
      "All Activity",
      "AI Operations",
      "Approvals",
      "Workflows",
      "Customer Operations",
      "System",
      "Security",
    ]);
    expect(activitySortOptions.map((option) => option.label)).toEqual([
      "Newest",
      "Oldest",
      "Priority",
      "Source",
    ]);
  });

  it("returns honest default, search, filter, and view empty states", () => {
    expect(
      getActivityEmptyState("", initialActivityFilterState, "ALL").title,
    ).toBe("No activity recorded yet");
    expect(
      getActivityEmptyState("policy", initialActivityFilterState, "ALL").title,
    ).toBe("No activity matches your search.");
    expect(
      getActivityEmptyState(
        "",
        { ...initialActivityFilterState, statuses: ["BLOCKED"] },
        "ALL",
      ).title,
    ).toBe("No activity matches these filters.");
    expect(
      getActivityEmptyState("", initialActivityFilterState, "SECURITY").title,
    ).toBe("No activity in this view");
  });

  it("toggles filters without mutation and counts filter groups", () => {
    const original = ["LEAD"] as const;
    expect(toggleActivityFilterValue(original, "WORKFLOW")).toEqual([
      "LEAD",
      "WORKFLOW",
    ]);
    expect(original).toEqual(["LEAD"]);
    expect(
      getActiveActivityFilterCount({
        ...initialActivityFilterState,
        eventTypes: ["APPROVAL"],
        sources: ["AI_OPERATION"],
        statuses: ["BLOCKED"],
        actors: ["SYSTEM"],
        priorities: ["HIGH"],
        dateRange: "TODAY",
      }),
    ).toBe(6);
  });

  it("keeps export controlled and separates proposal, decision, execution, and audit", () => {
    expect(ACTIVITY_EXPORT_UNAVAILABLE_MESSAGE).toContain(
      "audited export service is connected",
    );
    expect(auditControlStages.map((stage) => stage.label)).toEqual([
      "Proposal",
      "Decision",
      "Execution",
      "Audit",
    ]);
  });

  it("renders the route active with a server-backed audit collection", () => {
    const page = read("../apps/web/components/activity/activity-page.tsx");
    const details = read(
      "../apps/web/components/activity/activity-details.tsx",
    );
    const route = read("../apps/web/app/activity/page.tsx");
    expect(page).toContain("activityService");
    expect(page).toContain("category: view");
    expect(page).toContain("Append-only audit");
    expect(details).toContain("AI recommendation ≠ action");
    expect(details).toContain("Human approval ≠ execution");
    expect(route).toContain('currentRoute="/activity"');
  });

  it("queries audit history with verified tenant scope and real filters", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const service = new ActivityEventService({
      activityEvent: { findMany, count },
      $transaction: (tasks: Promise<unknown>[]) => Promise.all(tasks),
    } as never);
    await service.list(
      { organizationId: "org-a", workspaceId: "workspace-a" } as never,
      {
        category: "WORKFLOWS",
        workflowId: "00000000-0000-4000-8000-000000000001",
        search: "approved",
        actorType: "USER",
        sort: "OLDEST",
        page: 2,
        limit: 10,
      } as never,
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-a",
          workspaceId: "workspace-a",
          workflowId: "00000000-0000-4000-8000-000000000001",
          actorType: "USER",
          eventType: {
            in: expect.arrayContaining([
              "POLICY_EVALUATED",
              "WORKFLOW_EXECUTION_CHANGED",
            ]),
          },
          OR: expect.arrayContaining([
            { action: { contains: "approved", mode: "insensitive" } },
          ]),
        }),
        orderBy: { occurredAt: "asc" },
        skip: 10,
        take: 10,
      }),
    );
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-a",
          workspaceId: "workspace-a",
        }),
      }),
    );
    expect(
      activityDateStart("TODAY", new Date("2026-10-07T21:00:00Z")),
    ).toEqual(new Date("2026-10-07T00:00:00Z"));
  });
});

function read(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}
