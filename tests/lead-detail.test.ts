import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEMO_LEAD_ID,
  demoLeadDetail,
  getDemoLeadDetail,
} from "../apps/web/lib/leads/demo-lead";
import {
  leadPriorityLabels,
  leadSourceLabels,
  leadStatusLabels,
  LEAD_ACTIONS_UNAVAILABLE_MESSAGE,
} from "../apps/web/lib/leads/model";

describe("lead detail demo boundary", () => {
  it("resolves the one explicitly supported demo lead", () => {
    expect(getDemoLeadDetail(DEMO_LEAD_ID)).toBe(demoLeadDetail);
    expect(demoLeadDetail.lead).toMatchObject({
      id: "demo-lead-001",
      name: "Alex Morgan",
      company: "Northstar Solutions",
      email: "alex@example.com",
      phone: "+1 555 010 1000",
    });
  });

  it("returns no lead for unsupported IDs", () => {
    expect(getDemoLeadDetail("not-a-demo-lead")).toBeNull();
    expect(getDemoLeadDetail("")).toBeNull();
  });

  it("uses the centralized status, priority, and source contracts", () => {
    expect(leadStatusLabels[demoLeadDetail.lead.status]).toBe("New");
    expect(leadPriorityLabels[demoLeadDetail.lead.priority]).toBe("Medium");
    expect(leadSourceLabels[demoLeadDetail.lead.source]).toBe("Website");
  });

  it("does not fabricate activity, AI output, actions, notes, or tags", () => {
    expect(demoLeadDetail.activity).toEqual([]);
    expect(demoLeadDetail.aiContext).toBeNull();
    expect(demoLeadDetail.nextAction).toBeNull();
    expect(demoLeadDetail.notes).toEqual([]);
    expect(demoLeadDetail.tags).toEqual([]);
  });
});

describe("lead detail controlled states", () => {
  it("uses the required unavailable action message", () => {
    expect(LEAD_ACTIONS_UNAVAILABLE_MESSAGE).toBe(
      "Lead actions will be available when the workspace is connected.",
    );
  });

  it("renders empty activity, AI, and next-action states", () => {
    const activityPath = fileURLToPath(
      new URL(
        "../apps/web/components/lead-detail/lead-activity-timeline.tsx",
        import.meta.url,
      ),
    );
    const aiPath = fileURLToPath(
      new URL(
        "../apps/web/components/lead-detail/lead-ai-section.tsx",
        import.meta.url,
      ),
    );
    const nextActionPath = fileURLToPath(
      new URL(
        "../apps/web/components/lead-detail/lead-next-action.tsx",
        import.meta.url,
      ),
    );

    expect(readFileSync(activityPath, "utf8")).toContain("No activity yet");
    expect(readFileSync(aiPath, "utf8")).toContain(
      "when AI processing is connected",
    );
    expect(readFileSync(nextActionPath, "utf8")).toContain("Not scheduled");
  });

  it("provides navigation back to the Leads workspace", () => {
    const headerPath = fileURLToPath(
      new URL(
        "../apps/web/components/lead-detail/lead-header.tsx",
        import.meta.url,
      ),
    );
    const notFoundPath = fileURLToPath(
      new URL(
        "../apps/web/components/lead-detail/lead-not-found.tsx",
        import.meta.url,
      ),
    );
    const leadListPath = fileURLToPath(
      new URL(
        "../apps/web/components/leads/lead-empty-state.tsx",
        import.meta.url,
      ),
    );

    expect(readFileSync(headerPath, "utf8")).toContain('href="/leads"');
    expect(readFileSync(notFoundPath, "utf8")).toContain('href="/leads"');
    expect(readFileSync(leadListPath, "utf8")).toContain(
      'href="/leads/demo-lead-001"',
    );
  });
});
