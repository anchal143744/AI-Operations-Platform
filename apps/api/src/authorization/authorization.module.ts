import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { TenancyModule } from "../tenancy/tenancy.module.js";
import { AuthorizationService } from "./authorization.service.js";
import { TenantAuthorizationGuard } from "./tenant-authorization.guard.js";

@Module({
  imports: [AuthModule, TenancyModule],
  providers: [AuthorizationService, TenantAuthorizationGuard],
  exports: [
    AuthModule,
    TenancyModule,
    AuthorizationService,
    TenantAuthorizationGuard,
  ],
})
export class AuthorizationModule {}
