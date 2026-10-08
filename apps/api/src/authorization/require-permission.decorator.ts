import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { TenantAuthorizationGuard } from "./tenant-authorization.guard.js";
import { REQUIRED_PERMISSION, type Permission } from "./permissions.js";

/** A protected route must opt in explicitly; omitted metadata is denied. */
export function RequirePermission(permission: Permission) {
  return applyDecorators(
    SetMetadata(REQUIRED_PERMISSION, permission),
    UseGuards(SessionAuthGuard, TenantAuthorizationGuard),
  );
}
