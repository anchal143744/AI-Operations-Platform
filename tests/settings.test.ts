import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  INTEGRATION_UNAVAILABLE_MESSAGE,
  TEAM_INVITE_UNAVAILABLE_MESSAGE,
  approvalPolicyModes,
  configurableApprovalActions,
  initialAISettings,
  initialApprovalPolicies,
  initialNotificationSettings,
  initialWorkflowSettings,
  initialWorkspaceSettings,
  integrationCategories,
  integrations,
  permissionCategories,
  securitySettings,
  settingsSections,
  workspaceRoles,
} from "../apps/web/lib/settings/model";

describe("workspace settings domain", () => {
  it("defines every requested section", () => {
    expect(settingsSections.map((section) => section.id)).toEqual([
      "general",
      "team",
      "roles-permissions",
      "ai-settings",
      "approval-policies",
      "workflow-settings",
      "integrations",
      "notifications",
      "security",
      "danger-zone",
    ]);
  });

  it("starts profile editing from empty values until real API data loads", () => {
    expect(initialWorkspaceSettings.workspaceName).toBe("");
    expect(initialWorkspaceSettings.industry).toBe("");
  });

  it("lists role names and product categories without a second role matrix", () => {
    expect(workspaceRoles).toEqual([
      "OWNER",
      "ADMIN",
      "MANAGER",
      "SALES",
      "VIEWER",
    ]);
    expect(permissionCategories).toContain("APPROVALS");
    expect(permissionCategories).toContain("ACTIVITY");
    expect(permissionCategories).toContain("LEADS");
  });

  it("keeps AI authority bounded and approval policies unconfigured", () => {
    expect(initialAISettings.actionPermission).toBe("PROPOSE_ONLY");
    expect(initialAISettings.humanApprovalRequirement).toBe("UNCONFIGURED");
    expect(approvalPolicyModes).toEqual([
      "AUTOMATIC",
      "REQUIRES_APPROVAL",
      "BLOCKED",
    ]);
    expect(configurableApprovalActions).toHaveLength(7);
    expect(
      initialApprovalPolicies.every((policy) => policy.mode === null),
    ).toBe(true);
  });

  it("prepares workflow configuration without execution", () => {
    expect(initialWorkflowSettings.executionMode).toBe("UNCONFIGURED");
    expect(initialWorkflowSettings.failureHandling).toBe("UNCONFIGURED");
    expect(initialWorkflowSettings.executionLimit).toBeNull();
  });

  it("keeps every integration disconnected and notifications local-only", () => {
    expect(integrationCategories).toHaveLength(6);
    expect(
      integrations.every(
        (integration) => integration.status === "NOT_CONNECTED",
      ),
    ).toBe(true);
    expect(
      Object.values(initialNotificationSettings).every(
        (value) => value === false,
      ),
    ).toBe(true);
  });

  it("states the current server security boundary honestly", () => {
    expect(securitySettings.authentication).toBe("BACKEND_CONNECTED");
    expect(securitySettings.accessControl).toBe("INFRASTRUCTURE_ONLY");
    expect(securitySettings.auditLogging).toBe("SERVER_RECORDED");
  });

  it("uses controlled invite and integration messages", () => {
    expect(TEAM_INVITE_UNAVAILABLE_MESSAGE).toContain(
      "workspace services are connected",
    );
    expect(INTEGRATION_UNAVAILABLE_MESSAGE).toContain(
      "provider services are connected",
    );
  });

  it("renders all settings surfaces and disables destructive controls", () => {
    const page = read("../apps/web/components/settings/settings-page.tsx");
    const danger = read("../apps/web/components/settings/danger-zone.tsx");
    const route = read("../apps/web/app/settings/page.tsx");
    expect(page).toContain("settingsService.general(selected)");
    expect(page).toContain(
      "settingsService.updateGeneral(selected, workspace)",
    );
    expect(page).toContain("settingsService.team(selected)");
    expect(danger).toContain("disabled");
    expect(route).toContain('currentRoute="/settings"');
  });
});

function read(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}
