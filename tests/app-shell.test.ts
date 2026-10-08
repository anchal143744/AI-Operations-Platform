import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  applicationNavigation,
  dashboardEmptyModules,
  isApplicationRouteActive,
  mobileNavigationReducer,
} from "../apps/web/lib/app-shell/model";

describe("application navigation", () => {
  const items = applicationNavigation.flatMap((group) => group.items);

  it("exposes implemented routes and keeps future modules controlled", () => {
    expect(items.map((item) => item.label)).toEqual([
      "Dashboard",
      "Leads",
      "Inbox",
      "Follow-ups",
      "AI Operations",
      "Human Review",
      "Workflows",
      "Activity",
      "Analytics",
      "Settings",
    ]);
    expect(items.filter((item) => item.available)).toEqual([
      expect.objectContaining({ label: "Dashboard", href: "/dashboard" }),
      expect.objectContaining({ label: "Leads", href: "/leads" }),
      expect.objectContaining({ label: "Inbox", href: "/inbox" }),
      expect.objectContaining({ label: "Follow-ups", href: "/follow-ups" }),
      expect.objectContaining({
        label: "AI Operations",
        href: "/ai-operations",
      }),
      expect.objectContaining({ label: "Human Review", href: "/approvals" }),
      expect.objectContaining({ label: "Workflows", href: "/workflows" }),
      expect.objectContaining({ label: "Activity", href: "/activity" }),
      expect.objectContaining({ label: "Settings", href: "/settings" }),
    ]);
  });

  it("marks only Dashboard active for the current route", () => {
    expect(
      items.filter((item) => isApplicationRouteActive(item, "/dashboard")),
    ).toEqual([expect.objectContaining({ label: "Dashboard" })]);
  });

  it("marks only Leads active for the Leads route", () => {
    expect(
      items.filter((item) => isApplicationRouteActive(item, "/leads")),
    ).toEqual([expect.objectContaining({ label: "Leads", href: "/leads" })]);
  });

  it("marks only Inbox active for the Inbox route", () => {
    expect(
      items.filter((item) => isApplicationRouteActive(item, "/inbox")),
    ).toEqual([expect.objectContaining({ label: "Inbox", href: "/inbox" })]);
  });

  it("marks only Follow-ups active for the Follow-ups route", () => {
    expect(
      items.filter((item) => isApplicationRouteActive(item, "/follow-ups")),
    ).toEqual([
      expect.objectContaining({ label: "Follow-ups", href: "/follow-ups" }),
    ]);
  });

  it("marks the new AI and Workflow destinations independently", () => {
    expect(
      items.filter((item) => isApplicationRouteActive(item, "/ai-operations")),
    ).toEqual([expect.objectContaining({ label: "AI Operations" })]);
    expect(
      items.filter((item) => isApplicationRouteActive(item, "/workflows")),
    ).toEqual([expect.objectContaining({ label: "Workflows" })]);
  });

  it("marks only Human Review active for the approvals route", () => {
    expect(
      items.filter((item) => isApplicationRouteActive(item, "/approvals")),
    ).toEqual([
      expect.objectContaining({ label: "Human Review", href: "/approvals" }),
    ]);
  });

  it("marks Activity and Settings active independently", () => {
    expect(
      items.filter((item) => isApplicationRouteActive(item, "/activity")),
    ).toEqual([
      expect.objectContaining({ label: "Activity", href: "/activity" }),
    ]);
    expect(
      items.filter((item) => isApplicationRouteActive(item, "/settings")),
    ).toEqual([
      expect.objectContaining({ label: "Settings", href: "/settings" }),
    ]);
  });
});

describe("mobile navigation state", () => {
  it("opens, closes, and responds to Escape", () => {
    expect(mobileNavigationReducer(false, "open")).toBe(true);
    expect(mobileNavigationReducer(true, "close")).toBe(false);
    expect(mobileNavigationReducer(true, "escape")).toBe(false);
  });

  it("uses a route-neutral main-content skip target", () => {
    const source = readFileSync(
      fileURLToPath(
        new URL(
          "../apps/web/components/app-shell/app-shell.tsx",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(source).toContain('href="#app-main-content"');
    expect(source).toContain('id="app-main-content"');
    expect(source).toContain("previousHeaderMenuRef");
    expect(source).toContain("Sign in to continue");
    expect(source).not.toContain("demoShellContext");
  });
});

describe("dashboard empty state", () => {
  it("links real modules and identifies their API data sources", () => {
    expect(dashboardEmptyModules.map((module) => module.title)).toEqual([
      "Leads",
      "Inbox",
      "Follow-ups",
      "AI Operations",
    ]);
    expect(
      dashboardEmptyModules.every((module) => module.description.length > 0),
    ).toBe(true);
    expect(dashboardEmptyModules.map((module) => module.href)).toEqual([
      "/leads",
      "/inbox",
      "/follow-ups",
      "/ai-operations",
    ]);
  });

  it("distinguishes a connected workspace from unavailable modules", () => {
    const componentPath = fileURLToPath(
      new URL(
        "../apps/web/components/dashboard/dashboard-overview.tsx",
        import.meta.url,
      ),
    );
    const source = readFileSync(componentPath, "utf8");
    expect(source).toContain("Your operations start here.");
    expect(source).toContain("No data yet");
    expect(source).toContain("Workspace connected");
    expect(source).toContain("Not connected");
  });
});
