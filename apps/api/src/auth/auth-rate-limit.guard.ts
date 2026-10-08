import { createHmac } from "node:crypto";
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { AuthErrorResponse } from "@aop/types";
import { AuthConfig } from "./auth.config.js";
import { AuthCookieService } from "./auth-cookie.service.js";
import { AuthRateLimitStore } from "./auth-rate-limit.store.js";

const RATE_LIMIT_METADATA = "auth-rate-limit";

export type AuthRateLimitPolicy = Readonly<{
  limit: number;
  windowMs: number;
}>;

export const AuthRateLimit = (policy: AuthRateLimitPolicy) =>
  SetMetadata(RATE_LIMIT_METADATA, policy);

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: AuthRateLimitStore,
    private readonly config: AuthConfig,
    private readonly cookies: AuthCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<AuthRateLimitPolicy>(
      RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!policy) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const endpoint = `${request.method}:${request.path}`;
    const ip = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const keys = [`ip:${endpoint}:${ip}`];
    const account = this.accountKey(request);
    if (account) keys.push(`account:${endpoint}:${account}`);

    try {
      // All API hosts consume the same atomic PostgreSQL counters.
      for (const key of keys) {
        const digest = createHmac("sha256", this.config.tokenPepper)
          .update(key)
          .digest("hex");
        const attempts = await this.store.consume(digest, policy.windowMs);
        if (attempts > policy.limit) {
          const response: AuthErrorResponse = {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            code: "RATE_LIMITED",
            message: "Too many requests. Try again later.",
          };
          throw new HttpException(response, HttpStatus.TOO_MANY_REQUESTS);
        }
      }
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // Never fall back to process-local counters when the shared store fails.
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: "SERVICE_UNAVAILABLE",
          message: "Authentication is temporarily unavailable.",
        } satisfies AuthErrorResponse,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private accountKey(request: Request): string | null {
    const body = request.body as Record<string, unknown> | undefined;
    const email = body?.email;
    if (typeof email === "string" && email.length <= 320) {
      return `email:${email.trim().toLowerCase()}`;
    }
    if (
      request.path === "/auth/verify-email" ||
      request.path === "/auth/resend-verification"
    ) {
      const context = this.cookies.readVerificationContext(request);
      return context ? `verification:${context}` : null;
    }
    if (request.path === "/auth/reset-password") {
      const token = body?.resetToken;
      return typeof token === "string" && token.length <= 512
        ? `reset:${token}`
        : null;
    }
    return null;
  }
}
