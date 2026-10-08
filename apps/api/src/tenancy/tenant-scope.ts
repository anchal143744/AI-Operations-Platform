import type { MembershipRole } from "@prisma/client";

declare const verifiedTenantScope: unique symbol;

/**
 * Server-verified identity and tenant ownership for future business queries.
 * The brand prevents accidental use of request DTOs as repository scope;
 * runtime authority comes from TenantContextService's database checks.
 */
export type VerifiedTenantScope = Readonly<{
  userId: string;
  membershipId: string;
  organizationId: string;
  workspaceId: string;
  role: MembershipRole;
  [verifiedTenantScope]: true;
}>;

/** Resource IDs are selectors, not authority: future queries require both tenant keys. */
export function tenantOwnedWhere(scope: VerifiedTenantScope, id: string) {
  return {
    id,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  } as const;
}
