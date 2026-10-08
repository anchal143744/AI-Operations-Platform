import { Injectable } from "@nestjs/common";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import { permissionDenied } from "./authorization.errors.js";
import { rolePermissions, type Permission } from "./permissions.js";

@Injectable()
export class AuthorizationService {
  can(scope: VerifiedTenantScope, permission: Permission): boolean {
    const granted = rolePermissions[scope.role] as
      readonly Permission[] | undefined;
    return granted?.includes(permission) ?? false;
  }

  assertCan(scope: VerifiedTenantScope, permission: Permission): void {
    if (!this.can(scope, permission)) throw permissionDenied();
  }
}
