import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import type { AuthErrorResponse } from "@aop/types";
import { AuthConfig } from "./auth.config.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfOriginGuard implements CanActivate {
  constructor(private readonly config: AuthConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const origin = request.headers.origin;
    if (typeof origin === "string" && this.isAllowedOrigin(origin)) return true;

    const response: AuthErrorResponse = {
      statusCode: HttpStatus.FORBIDDEN,
      code: "CSRF_ORIGIN_REJECTED",
      message: "This request origin is not allowed.",
    };
    throw new HttpException(response, HttpStatus.FORBIDDEN);
  }

  private isAllowedOrigin(value: string): boolean {
    try {
      return new URL(value).origin === this.config.appOrigin;
    } catch {
      return false;
    }
  }
}
