import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve("database/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(
    "database/migrations/20260908143000_tenant_persistence_foundation/migration.sql",
  ),
  "utf8",
);

function block(kind: "enum" | "model", name: string): string {
  const match = schema.match(
    new RegExp(`${kind} ${name} \\{([\\s\\S]*?)\\n\\}`),
  );
  expect(match, `${kind} ${name} must exist`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("Phase 20 identity and tenancy schema", () => {
  it("defines the approved membership roles without a parallel role vocabulary", () => {
    const roles = block("enum", "MembershipRole")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[A-Z_]+$/.test(line));

    expect(roles).toEqual(["OWNER", "ADMIN", "MANAGER", "SALES", "VIEWER"]);
  });

  it("models users, organization memberships, and organizations with restrictive deletion", () => {
    const user = block("model", "User");
    const membership = block("model", "Membership");

    expect(user).toMatch(/normalizedEmail\s+String/);
    expect(user).toContain("passwordHash");
    expect(user).not.toMatch(/password\s+String/);
    expect(membership).toContain("@@unique([userId, organizationId]");
    expect(membership).toContain(
      "@relation(fields: [userId], references: [id], onDelete: Restrict",
    );
    expect(membership).toContain(
      "@relation(fields: [organizationId], references: [id], onDelete: Restrict",
    );
  });

  it("keeps organization slugs global and workspace slugs organization-scoped", () => {
    expect(block("model", "Organization")).toContain(
      'slug        String             @unique(map: "organizations_slug_key")',
    );
    expect(block("model", "Workspace")).toContain(
      "@@unique([organizationId, slug]",
    );
  });

  it("binds every business record to a verified organization/workspace pair", () => {
    const tenantModels = [
      "Lead",
      "Conversation",
      "FollowUp",
      "AIOperation",
      "Workflow",
      "ApprovalRequest",
      "ActivityEvent",
      "WorkspaceSettings",
    ];

    for (const modelName of tenantModels) {
      const model = block("model", modelName);
      expect(model, modelName).toContain("organizationId");
      expect(model, modelName).toContain("workspaceId");
      expect(model, modelName).toContain(
        "fields: [workspaceId, organizationId], references: [id, organizationId]",
      );
    }
  });

  it("uses tenant-composite foreign keys for cross-domain references", () => {
    expect(block("model", "Conversation")).toContain(
      "fields: [leadId, organizationId, workspaceId]",
    );
    expect(block("model", "FollowUp")).toContain(
      "fields: [conversationId, organizationId, workspaceId]",
    );
    expect(block("model", "ApprovalRequest")).toContain(
      "fields: [aiOperationId, organizationId, workspaceId]",
    );
    expect(block("model", "ActivityEvent")).toContain(
      "fields: [actorMembershipId, organizationId]",
    );
  });
});

describe("Phase 20 migration", () => {
  it("creates the identity, tenancy, and tenant-owned foundation tables", () => {
    for (const table of [
      "users",
      "organizations",
      "memberships",
      "workspaces",
      "leads",
      "conversations",
      "follow_ups",
      "ai_operations",
      "workflows",
      "approval_requests",
      "activity_events",
      "workspace_settings",
    ]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it("contains database-enforced tenant and uniqueness constraints", () => {
    expect(migration).toContain('"organizations_slug_key"');
    expect(migration).toContain('"workspaces_organization_slug_key"');
    expect(migration).toContain('"memberships_user_organization_key"');
    expect(migration).toContain(
      'FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("lead_id", "organization_id", "workspace_id") REFERENCES "leads"',
    );
  });

  it("does not cascade-delete tenant history and makes activity append-only", () => {
    expect(migration).not.toContain("ON DELETE CASCADE");
    expect(migration).toContain('"users_normalized_email_format_check"');
    expect(migration).toContain('"organizations_slug_format_check"');
    expect(migration).toContain('"workspaces_slug_format_check"');
    expect(migration).toContain('CREATE TRIGGER "activity_events_append_only"');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "activity_events"');
  });
});
