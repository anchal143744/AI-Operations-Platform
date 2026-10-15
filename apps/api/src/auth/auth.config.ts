import { Inject, Injectable } from "@nestjs/common";

const MINIMUM_SECRET_LENGTH = 32;
export const AUTH_ENVIRONMENT = Symbol("AUTH_ENVIRONMENT");

export function isLoopbackOrigin(origin: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname);
}

/** Opt-in preview for a built, HTTPS-only stack bound to this computer. */
export function isLocalProductionPreview(
  environment: NodeJS.ProcessEnv,
  appOrigin: string,
): boolean {
  if (environment.AOP_LOCAL_PRODUCTION !== "true") return false;
  const origin = new URL(appOrigin);
  if (
    environment.NODE_ENV !== "production" ||
    origin.protocol !== "https:" ||
    origin.hostname !== "localhost" ||
    environment.AUTH_EMAIL_TRANSPORT !== "development"
  ) {
    throw new Error(
      "AOP_LOCAL_PRODUCTION requires production mode, HTTPS localhost, and the local preview email transport.",
    );
  }
  return true;
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

@Injectable()
export class AuthConfig {
  readonly appOrigin: string;
  readonly tokenPepper: string;
  readonly secureCookies: boolean;
  readonly localCodePreviewEnabled: boolean;
  readonly sessionCookieName: string;
  readonly verificationCookieName: string;
  readonly sessionTtlMs = 12 * 60 * 60 * 1000;
  readonly rememberedSessionTtlMs = 30 * 24 * 60 * 60 * 1000;
  readonly verificationTtlMs = 15 * 60 * 1000;
  readonly passwordResetTtlMs = 30 * 60 * 1000;

  constructor(
    @Inject(AUTH_ENVIRONMENT) environment: NodeJS.ProcessEnv = process.env,
  ) {
    this.appOrigin = new URL(required(environment, "APP_ORIGIN")).origin;
    if (
      environment.NODE_ENV === "production" &&
      new URL(this.appOrigin).protocol !== "https:"
    ) {
      throw new Error("APP_ORIGIN must use HTTPS in production.");
    }
    this.tokenPepper = required(environment, "AUTH_TOKEN_PEPPER");
    if (this.tokenPepper.length < MINIMUM_SECRET_LENGTH) {
      throw new Error(
        `AUTH_TOKEN_PEPPER must contain at least ${MINIMUM_SECRET_LENGTH} characters.`,
      );
    }
    if (
      environment.NODE_ENV === "production" &&
      this.tokenPepper === "replace-with-at-least-32-random-characters"
    ) {
      throw new Error("AUTH_TOKEN_PEPPER must not use the example value.");
    }

    this.secureCookies = environment.NODE_ENV === "production";
    const localProductionPreview = isLocalProductionPreview(
      environment,
      this.appOrigin,
    );
    this.localCodePreviewEnabled =
      (environment.NODE_ENV === "development" &&
        (environment.AUTH_EMAIL_TRANSPORT ?? "development") === "development" &&
        isLoopbackOrigin(this.appOrigin)) ||
      localProductionPreview;
    this.sessionCookieName = this.secureCookies
      ? "__Host-aop_session"
      : "aop_session";
    this.verificationCookieName = this.secureCookies
      ? "__Secure-aop_verification"
      : "aop_verification";
  }
}
