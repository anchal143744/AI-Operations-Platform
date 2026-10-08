import { Injectable } from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";
import { AuthConfig } from "./auth.config.js";

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: AuthConfig) {}

  readSession(request: Request): string | undefined {
    return this.readCookie(request, this.config.sessionCookieName);
  }

  readVerificationContext(request: Request): string | undefined {
    return this.readCookie(request, this.config.verificationCookieName);
  }

  setSession(response: Response, token: string, expiresAt: Date): void {
    response.cookie(
      this.config.sessionCookieName,
      token,
      this.options(expiresAt, "/"),
    );
  }

  clearSession(response: Response): void {
    response.clearCookie(
      this.config.sessionCookieName,
      this.options(undefined, "/"),
    );
  }

  setVerificationContext(
    response: Response,
    context: string,
    expiresAt: Date,
  ): void {
    response.cookie(
      this.config.verificationCookieName,
      context,
      this.options(expiresAt, "/auth"),
    );
  }

  clearVerificationContext(response: Response): void {
    response.clearCookie(
      this.config.verificationCookieName,
      this.options(undefined, "/auth"),
    );
  }

  private options(expires: Date | undefined, path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.secureCookies,
      sameSite: "lax",
      path,
      ...(expires ? { expires, maxAge: expires.getTime() - Date.now() } : {}),
    };
  }

  private readCookie(request: Request, name: string): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;

    for (const pair of cookieHeader.split(";")) {
      const separator = pair.indexOf("=");
      if (separator < 0) continue;
      const key = pair.slice(0, separator).trim();
      if (key !== name) continue;
      const value = pair.slice(separator + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}
