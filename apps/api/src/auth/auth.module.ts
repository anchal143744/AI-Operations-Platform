import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "../database/database.module.js";
import { AuthCookieService } from "./auth-cookie.service.js";
import { AUTH_ENVIRONMENT, AuthConfig } from "./auth.config.js";
import { AuthController } from "./auth.controller.js";
import { AuthRateLimitGuard } from "./auth-rate-limit.guard.js";
import { AuthRateLimitStore } from "./auth-rate-limit.store.js";
import { AuthService } from "./auth.service.js";
import { CsrfOriginGuard } from "./csrf-origin.guard.js";
import {
  AUTH_EMAIL_SERVICE,
  DevelopmentAuthEmailService,
} from "./email.service.js";
import { PasswordService } from "./password.service.js";
import { selectAuthEmailService } from "./ses-auth-email.service.js";
import { SessionAuthGuard } from "./session-auth.guard.js";
import { SessionService } from "./session.service.js";
import { AuthTokenService } from "./token.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    { provide: AUTH_ENVIRONMENT, useValue: process.env },
    AuthConfig,
    AuthCookieService,
    AuthService,
    AuthTokenService,
    AuthRateLimitStore,
    PasswordService,
    SessionService,
    SessionAuthGuard,
    DevelopmentAuthEmailService,
    {
      provide: AUTH_EMAIL_SERVICE,
      inject: [DevelopmentAuthEmailService, AuthConfig],
      useFactory: (
        development: DevelopmentAuthEmailService,
        config: AuthConfig,
      ) => selectAuthEmailService(process.env, config.appOrigin, development),
    },
    { provide: APP_GUARD, useClass: CsrfOriginGuard },
    { provide: APP_GUARD, useClass: AuthRateLimitGuard },
  ],
  exports: [AuthCookieService, SessionAuthGuard, SessionService],
})
export class AuthModule {}
