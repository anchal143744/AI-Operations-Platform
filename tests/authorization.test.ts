import { MembershipRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { SessionAuthGuard } from "../apps/api/src/auth/session-auth.guard";
import { invalidSession } from "../apps/api/src/auth/auth.errors";
import { AuthorizationService } from "../apps/api/src/authorization/authorization.service";
import {
  Permissions,
  REQUIRED_PERMISSION,
  rolePermissions,
} from "../apps/api/src/authorization/permissions";
import { RequirePermission } from "../apps/api/src/authorization/require-permission.decorator";
import { TenantAuthorizationGuard } from "../apps/api/src/authorization/tenant-authorization.guard";
import {
  tenantOwnedWhere,
  type VerifiedTenantScope,
} from "../apps/api/src/tenancy/tenant-scope";
import { buildSession, buildTenantScope, ids } from "./authorization-fixtures";

function guardedRequest({
  role = MembershipRole.SALES,
  permission = Permissions.LEADS_READ,
  session = buildSession(),
  headers = {},
  body = {},
  query = {},
}: {
  role?: MembershipRole;
  permission?: (typeof Permissions)[keyof typeof Permissions] | null;
  session?: ReturnType<typeof buildSession> | null;
  headers?: Record<string, unknown>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
} = {}) {
  const request = {
    authenticatedSession: session ?? undefined,
    headers: {
      "x-aop-organization-id": ids.organization,
      "x-aop-workspace-id": ids.workspace,
      ...headers,
    },
    body,
    query,
  };
  const scope = buildTenantScope(role);
  const resolve = vi.fn().mockResolvedValue(scope);
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(permission) };
  const authorization = new AuthorizationService();
  const guard = new TenantAuthorizationGuard(
    reflector as never,
    { resolve } as never,
    authorization,
  );
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => guardedRequest,
    getClass: () => Object,
  };
  return {
    request,
    scope,
    resolve,
    guard,
    context: context as never,
    reflector,
  };
}

describe("central role permissions", () => {
  it("uses exactly the approved membership roles and no global bypass", () => {
    expect(Object.keys(rolePermissions)).toEqual([
      "OWNER",
      "ADMIN",
      "MANAGER",
      "SALES",
      "VIEWER",
    ]);
    expect(rolePermissions.OWNER).toEqual(Object.values(Permissions));
    expect(rolePermissions.ADMIN).not.toContain(
      Permissions.ORGANIZATION_MANAGE,
    );
  });

  it.each([
    [MembershipRole.VIEWER, Permissions.LEADS_READ, true],
    [MembershipRole.VIEWER, Permissions.LEADS_UPDATE, false],
    [MembershipRole.SALES, Permissions.LEADS_UPDATE, true],
    [MembershipRole.SALES, Permissions.MEMBERSHIP_MANAGE, false],
    [MembershipRole.MANAGER, Permissions.APPROVALS_DECIDE, true],
    [MembershipRole.MANAGER, Permissions.SETTINGS_MANAGE, false],
    [MembershipRole.ADMIN, Permissions.SETTINGS_MANAGE, true],
    [MembershipRole.ADMIN, Permissions.ORGANIZATION_MANAGE, false],
    [MembershipRole.OWNER, Permissions.ORGANIZATION_MANAGE, true],
  ])("%s %s => %s", (role, permission, allowed) => {
    const service = new AuthorizationService();
    expect(service.can(buildTenantScope(role), permission)).toBe(allowed);
    if (!allowed) {
      expect(() =>
        service.assertCan(buildTenantScope(role), permission),
      ).toThrow();
    }
  });

  it("does not grant Workspace A authority over Workspace B by resource ID", () => {
    const scopeA = buildTenantScope();
    const scopeB = {
      userId: ids.user,
      membershipId: ids.membership,
      organizationId: ids.organization,
      workspaceId: ids.otherWorkspace,
      role: MembershipRole.SALES,
    } as VerifiedTenantScope;
    expect(tenantOwnedWhere(scopeA, "same-global-id")).not.toEqual(
      tenantOwnedWhere(scopeB, "same-global-id"),
    );
  });
});

describe("authorization guard", () => {
  it("requires session authentication before resolving a tenant", async () => {
    const { guard, context, resolve } = guardedRequest({ session: null });
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: "UNAUTHENTICATED" },
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("keeps the existing invalid/revoked session rejection boundary", async () => {
    const request = { headers: { cookie: "session=invalid" } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;
    const missing = new SessionAuthGuard(
      { readSession: vi.fn().mockReturnValue(undefined) } as never,
      { authenticate: vi.fn() } as never,
    );
    await expect(missing.canActivate(context)).rejects.toMatchObject({
      response: { code: "INVALID_SESSION" },
    });
    const rejected = new SessionAuthGuard(
      { readSession: vi.fn().mockReturnValue("revoked") } as never,
      { authenticate: vi.fn().mockRejectedValue(invalidSession()) } as never,
    );
    await expect(rejected.canActivate(context)).rejects.toMatchObject({
      response: { code: "INVALID_SESSION" },
    });
  });

  it("denies missing permission metadata", async () => {
    const { guard, context, resolve } = guardedRequest({ permission: null });
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: "PERMISSION_DENIED" },
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each([
    { "x-aop-organization-id": undefined },
    { "x-aop-workspace-id": undefined },
    { "x-aop-organization-id": "not-a-uuid" },
    { "x-aop-workspace-id": [ids.workspace, ids.otherWorkspace] },
  ])("rejects missing or ambiguous context headers: %o", async (headers) => {
    const { guard, context, resolve } = guardedRequest({ headers });
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: "TENANT_CONTEXT_REQUIRED" },
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("resolves membership from verified identity and attaches authorized context", async () => {
    const { guard, context, request, resolve, scope } = guardedRequest();
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(resolve).toHaveBeenCalledWith(
      request.authenticatedSession,
      ids.organization,
      ids.workspace,
    );
    expect(request).toHaveProperty("verifiedTenant", scope);
  });

  it.each([
    ["organizationId", ids.otherOrganization],
    ["workspaceId", ids.otherWorkspace],
    ["membershipId", ids.otherMembership],
    ["role", "OWNER"],
    ["userId", ids.otherUser],
    ["actorId", ids.otherUser],
  ])("rejects forged %s in a request body", async (field, value) => {
    const { guard, context, resolve } = guardedRequest({
      body: { [field]: value },
    });
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: "TENANT_CONTEXT_CLAIM_REJECTED" },
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("rejects forged query and identity headers", async () => {
    for (const input of [
      { query: { role: "OWNER" } },
      { headers: { "x-user-id": ids.otherUser } },
      { headers: { "x-aop-role": "OWNER" } },
    ]) {
      const { guard, context, resolve } = guardedRequest(input);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: { code: "TENANT_CONTEXT_CLAIM_REJECTED" },
      });
      expect(resolve).not.toHaveBeenCalled();
    }
  });

  it("ignores stale or forged frontend role projections and follows a persisted role change", async () => {
    const session = {
      ...buildSession(),
      workspaceAccess: [
        {
          organizationId: ids.organization,
          organizationName: "Test",
          membershipId: ids.membership,
          role: "OWNER" as const,
          workspaceIds: [ids.workspace],
          workspaces: [{ id: ids.workspace, name: "Test workspace" }],
        },
      ],
    };
    const { guard, context, resolve } = guardedRequest({
      session,
      permission: Permissions.MEMBERSHIP_MANAGE,
    });
    resolve.mockResolvedValueOnce(buildTenantScope(MembershipRole.SALES));
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: "PERMISSION_DENIED" },
    });
    resolve.mockResolvedValueOnce(buildTenantScope(MembershipRole.ADMIN));
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(resolve).toHaveBeenCalledTimes(2);
  });
});

describe("permission decorator", () => {
  it("binds authentication and tenant guards with typed permission metadata", () => {
    class Example {
      handler() {}
    }
    const method = Object.getOwnPropertyDescriptor(
      Example.prototype,
      "handler",
    );
    RequirePermission(Permissions.LEADS_READ)(
      Example.prototype,
      "handler",
      method,
    );
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSION, Example.prototype.handler),
    ).toBe(Permissions.LEADS_READ);
    expect(
      Reflect.getMetadata("__guards__", Example.prototype.handler),
    ).toEqual([SessionAuthGuard, TenantAuthorizationGuard]);
  });
});
