import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthorizedRequest } from "./tenant-authorization.guard.js";
import { tenantContextRequired } from "../tenancy/tenant-errors.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): VerifiedTenantScope => {
    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    if (!request.verifiedTenant) throw tenantContextRequired();
    return request.verifiedTenant;
  },
);
