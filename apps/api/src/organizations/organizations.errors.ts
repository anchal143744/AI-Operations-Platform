import { ConflictException, ForbiddenException } from "@nestjs/common";

export function organizationSlugConflict() {
  return new ConflictException({
    statusCode: 409,
    code: "ORGANIZATION_SLUG_UNAVAILABLE",
    message: "Choose a different organization URL.",
  });
}

export function workspaceSlugConflict() {
  return new ConflictException({
    statusCode: 409,
    code: "WORKSPACE_SLUG_UNAVAILABLE",
    message: "Choose a different workspace URL.",
  });
}

export function organizationAccessDenied() {
  return new ForbiddenException({
    statusCode: 403,
    code: "ORGANIZATION_ACCESS_DENIED",
    message: "This organization is not available to your account.",
  });
}

export function ownerRequired() {
  return new ForbiddenException({
    statusCode: 403,
    code: "PERMISSION_DENIED",
    message: "You do not have permission to create this workspace.",
  });
}
