import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  WorkspaceStatus,
  type UserStatus,
} from "@prisma/client";
import type { AuthenticatedSession } from "@aop/types";
import type { VerifiedTenantScope } from "../apps/api/src/tenancy/tenant-scope";

export const ids = {
  user: "10000000-0000-4000-8000-000000000001",
  otherUser: "10000000-0000-4000-8000-000000000002",
  organization: "20000000-0000-4000-8000-000000000001",
  otherOrganization: "20000000-0000-4000-8000-000000000002",
  workspace: "30000000-0000-4000-8000-000000000001",
  otherWorkspace: "30000000-0000-4000-8000-000000000002",
  membership: "40000000-0000-4000-8000-000000000001",
  otherMembership: "40000000-0000-4000-8000-000000000002",
} as const;

export function buildUser(status: UserStatus = "ACTIVE") {
  return { id: ids.user, status, emailVerifiedAt: new Date() };
}

export function buildOrganization(
  status: OrganizationStatus = OrganizationStatus.ACTIVE,
) {
  return { id: ids.organization, status };
}

export function buildWorkspace(
  status: WorkspaceStatus = WorkspaceStatus.ACTIVE,
) {
  return { id: ids.workspace, organizationId: ids.organization, status };
}

export function buildMembership(
  overrides: Partial<{
    id: string;
    userId: string;
    organizationId: string;
    role: MembershipRole;
    status: MembershipStatus;
    organization: ReturnType<typeof buildOrganization>;
  }> = {},
) {
  return {
    id: ids.membership,
    userId: ids.user,
    organizationId: ids.organization,
    role: MembershipRole.SALES,
    status: MembershipStatus.ACTIVE,
    organization: buildOrganization(),
    ...overrides,
  };
}

export function buildSession(userId = ids.user): AuthenticatedSession {
  return {
    user: {
      id: userId,
      email: "operator@example.invalid",
      name: "Test Operator",
      emailVerified: true,
    },
    session: { expiresAt: new Date(Date.now() + 60_000).toISOString() },
    workspaceAccess: [],
  };
}

export function buildTenantScope(role: MembershipRole = MembershipRole.SALES) {
  return {
    userId: ids.user,
    membershipId: ids.membership,
    organizationId: ids.organization,
    workspaceId: ids.workspace,
    role,
  } as VerifiedTenantScope;
}
