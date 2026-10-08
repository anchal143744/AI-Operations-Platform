import { BadRequestException, ForbiddenException } from "@nestjs/common";

export type TenantErrorCode =
  | "TENANT_CONTEXT_REQUIRED"
  | "TENANT_CONTEXT_CLAIM_REJECTED"
  | "MEMBERSHIP_REQUIRED"
  | "MEMBERSHIP_INACTIVE"
  | "ORGANIZATION_INACTIVE"
  | "WORKSPACE_ACCESS_DENIED"
  | "WORKSPACE_INACTIVE";

function denied(code: TenantErrorCode): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    code,
    message: "The selected workspace is not available to this account.",
  });
}

export const membershipRequired = () => denied("MEMBERSHIP_REQUIRED");
export const membershipInactive = () => denied("MEMBERSHIP_INACTIVE");
export const organizationInactive = () => denied("ORGANIZATION_INACTIVE");
export const workspaceAccessDenied = () => denied("WORKSPACE_ACCESS_DENIED");
export const workspaceInactive = () => denied("WORKSPACE_INACTIVE");

export function tenantContextRequired(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: "TENANT_CONTEXT_REQUIRED",
    message: "Select an organization and workspace to continue.",
  });
}

export function tenantContextClaimRejected(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: "TENANT_CONTEXT_CLAIM_REJECTED",
    message: "Identity and tenant ownership cannot be submitted as data.",
  });
}
