import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedSession } from "@aop/types";
import { AuthCookieService } from "./auth-cookie.service.js";
import { invalidSession } from "./auth.errors.js";
import { SessionService } from "./session.service.js";

export type AuthenticatedRequest = Request & {
  authenticatedSession?: AuthenticatedSession;
  rawSessionToken?: string;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly cookies: AuthCookieService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawToken = this.cookies.readSession(request);
    if (!rawToken) throw invalidSession();
    request.rawSessionToken = rawToken;
    request.authenticatedSession = await this.sessions.authenticate(rawToken);
    return true;
  }
}
