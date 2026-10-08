import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  emptyLeads,
  getActiveLeadFilterCount,
  getLeadEmptyState,
  initialLeadFilterState,
  leadPriorities,
  leadSortOptions,
  leadSources,
  leadStatuses,
  toggleLeadFilterValue,
} from "../apps/web/lib/leads/model";

describe("lead domain model", () => {
  it("centralizes the supported status, priority, and source values", () => {
    expect(leadStatuses).toEqual([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "IN_PROGRESS",
      "CONVERTED",
      "LOST",
    ]);
    expect(leadPriorities).toEqual(["LOW", "MEDIUM", "HIGH", "URGENT"]);
    expect(leadSources).toEqual([
      "WEBSITE",
      "WHATSAPP",
      "EMAIL",
      "INSTAGRAM",
      "PHONE",
      "MANUAL",
      "OTHER",
    ]);
  });

  it("defines the requested sort configuration", () => {
    expect(leadSortOptions.map((option) => option.label)).toEqual([
      "Newest",
      "Oldest",
      "Recently updated",
      "Priority",
    ]);
  });

  it("adds and removes filter values without mutating the input", () => {
    const original = ["NEW"] as const;
    expect(toggleLeadFilterValue(original, "QUALIFIED")).toEqual([
      "NEW",
      "QUALIFIED",
    ]);
    expect(toggleLeadFilterValue(original, "NEW")).toEqual([]);
    expect(original).toEqual(["NEW"]);
  });

  it("counts filters but not the selected sort", () => {
    expect(
      getActiveLeadFilterCount({
        ...initialLeadFilterState,
        statuses: ["NEW"],
        priorities: ["HIGH"],
        sources: ["EMAIL"],
        owners: ["UNASSIGNED"],
        sort: "PRIORITY",
      }),
    ).toBe(4);
  });
});

describe("Leads empty workspace", () => {
  it("contains no fabricated lead records", () => {
    expect(emptyLeads).toEqual([]);
  });

  it("provides a specific empty state for search and filters", () => {
    expect(getLeadEmptyState("Northstar", initialLeadFilterState).title).toBe(
      "No leads match your search.",
    );
    expect(
      getLeadEmptyState("", {
        ...initialLeadFilterState,
        statuses: ["NEW"],
      }).title,
    ).toBe("No leads match these filters.");
    expect(getLeadEmptyState("", initialLeadFilterState).title).toBe(
      "No leads yet",
    );
  });

  it("retains an empty preview fixture while querying the real Leads API", () => {
    const componentPath = fileURLToPath(
      new URL("../apps/web/components/leads/leads-page.tsx", import.meta.url),
    );
    const source = readFileSync(componentPath, "utf8");
    expect(source).toMatch(/leadsService\s*\.list/);
    expect(source).toMatch(/leadsService\s*\.create/);
    expect(source).toContain("showCreationUnavailable");
    expect(source).not.toContain("qualification: {");
  });
});
