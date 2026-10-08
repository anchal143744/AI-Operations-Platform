import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { AuthenticatedRequest } from "../auth/session-auth.guard.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import {
  tenantContextClaimRejected,
  tenantContextRequired,
} from "../tenancy/tenant-errors.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import { unauthenticated, permissionDenied } from "./authorization.errors.js";
import { AuthorizationService } from "./authorization.service.js";
import { REQUIRED_PERMISSION, type Permission } from "./permissions.js";

export type AuthorizedRequest = AuthenticatedRequest & {
  verifiedTenant?: VerifiedTenantScope;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const protectedClaims = new Set([
  "organizationId",
  "workspaceId",
  "membershipId",
  "role",
  "userId",
  "actorId",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasProtectedClaims(request: Request): boolean {
  for (const submitted of [request.body as unknown, request.query as unknown]) {
    if (isRecord(submitted)) {
      if (Object.keys(submitted).some((key) => protectedClaims.has(key))) {
        return true;
      }
    }
  }
  return [
    "x-user-id",
    "x-actor-id",
    "x-membership-id",
    "x-role",
    "x-aop-user-id",
    "x-aop-actor-id",
    "x-aop-membership-id",
    "x-aop-role",
  ].some((header) => request.headers[header] !== undefined);
}

function selectionHeader(request: Request, name: string): string {
  const value = request.headers[name];
  if (typeof value !== "string" || !UUID.test(value)) {
    throw tenantContextRequired();
  }
  return value.toLowerCase();
}

@Injectable()
export class TenantAuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenants: TenantContextService,
    private readonly authorization: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    if (!request.authenticatedSession) throw unauthenticated();

    const permission = this.reflector.getAllAndOverride<Permission>(
      REQUIRED_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) throw permissionDenied();
    if (hasProtectedClaims(request)) throw tenantContextClaimRejected();

    const organizationId = selectionHeader(request, "x-aop-organization-id");
    const workspaceId = selectionHeader(request, "x-aop-workspace-id");
    const scope = await this.tenants.resolve(
      request.authenticatedSession,
      organizationId,
      workspaceId,
    );
    this.authorization.assertCan(scope, permission);
    request.verifiedTenant = scope;
    return true;
  }
}
