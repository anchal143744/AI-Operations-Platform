import { Injectable } from "@nestjs/common";
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { AuthConfig } from "./auth.config.js";

@Injectable()
export class AuthTokenService {
  constructor(private readonly config: AuthConfig) {}

  issueOpaqueToken(): Readonly<{ rawToken: string; tokenHash: string }> {
    const rawToken = randomBytes(32).toString("base64url");
    return { rawToken, tokenHash: this.hash(rawToken) };
  }

  issueVerificationCode(): Readonly<{ code: string; tokenHash: string }> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    return { code, tokenHash: this.hash(code) };
  }

  hash(value: string): string {
    return createHmac("sha256", this.config.tokenPepper)
      .update(value)
      .digest("hex");
  }

  matches(value: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hash(value), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  expiresIn(milliseconds: number, now = new Date()): Date {
    return new Date(now.getTime() + milliseconds);
  }

  isExpired(expiresAt: Date, now = new Date()): boolean {
    return expiresAt.getTime() <= now.getTime();
  }
}
