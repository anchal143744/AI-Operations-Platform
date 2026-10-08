import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthConfig } from "../apps/api/src/auth/auth.config";
import { AuthRateLimitStore } from "../apps/api/src/auth/auth-rate-limit.store";
import { AuthService } from "../apps/api/src/auth/auth.service";
import type {
  AuthEmailService,
  PasswordResetEmail,
  VerificationEmail,
} from "../apps/api/src/auth/email.service";
import { PasswordService } from "../apps/api/src/auth/password.service";
import { SessionService } from "../apps/api/src/auth/session.service";
import { AuthTokenService } from "../apps/api/src/auth/token.service";
import { assertDisposableTestDatabaseUrl } from "./disposable-database";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" && Boolean(databaseUrl);

class CapturingEmailService implements AuthEmailService {
  readonly deliveryConfigured = true;
  verification: VerificationEmail | undefined;
  reset: PasswordResetEmail | undefined;

  async sendVerificationCode(message: VerificationEmail): Promise<void> {
    this.verification = message;
  }

  async sendPasswordReset(message: PasswordResetEmail): Promise<void> {
    this.reset = message;
  }
}

describe.skipIf(!integrationEnabled)(
  "PostgreSQL authentication lifecycle",
  () => {
    let prisma: PrismaClient;
    let auth: AuthService;
    let email: CapturingEmailService;
    let createdUserId: string | undefined;

    beforeAll(async () => {
      assertDisposableTestDatabaseUrl(databaseUrl as string);
      prisma = new PrismaClient({ datasourceUrl: databaseUrl });
      const config = new AuthConfig({
        NODE_ENV: "test",
        APP_ORIGIN: "http://localhost:3000",
        AUTH_TOKEN_PEPPER: "database-test-pepper-with-at-least-32-characters",
      });
      const passwords = new PasswordService();
      await passwords.onModuleInit();
      const tokens = new AuthTokenService(config);
      const sessions = new SessionService(prisma as never, tokens, config);
      email = new CapturingEmailService();
      auth = new AuthService(
        prisma as never,
        passwords,
        tokens,
        sessions,
        config,
        email,
      );
    });

    afterAll(async () => {
      if (createdUserId) {
        await prisma.session.deleteMany({ where: { userId: createdUserId } });
        await prisma.passwordResetToken.deleteMany({
          where: { userId: createdUserId },
        });
        await prisma.emailVerificationToken.deleteMany({
          where: { userId: createdUserId },
        });
        await prisma.user.deleteMany({ where: { id: createdUserId } });
      }
      await prisma?.$disconnect();
    });

    it("registers, verifies, authenticates, resets, and revokes sessions", async () => {
      const emailAddress = `phase21-${randomUUID()}@example.com`;
      const registration = await auth.register({
        firstName: "Authentication",
        lastName: "Test",
        email: emailAddress,
        password: "Controlled10!",
      });
      expect(registration.response).toMatchObject({
        accepted: true,
        verificationRequired: true,
      });
      expect(registration.verificationContext).toBeTruthy();
      expect(email.verification?.code).toMatch(/^\d{6}$/);

      const persistedUser = await prisma.user.findUniqueOrThrow({
        where: { normalizedEmail: emailAddress },
      });
      createdUserId = persistedUser.id;
      expect(persistedUser.passwordHash).not.toBe("Controlled10!");
      expect(
        await prisma.emailVerificationToken.findFirstOrThrow({
          where: { userId: persistedUser.id },
        }),
      ).not.toHaveProperty("code");

      const verification = await auth.verifyEmail(
        registration.verificationContext,
        email.verification?.code ?? "",
      );
      expect(verification.response.verified).toBe(true);
      await expect(
        auth.verifyEmail(
          registration.verificationContext,
          email.verification?.code ?? "",
        ),
      ).rejects.toThrow();

      const login = await auth.login({
        email: emailAddress,
        password: "Controlled10!",
      });
      expect(login.response.user.email).toBe(emailAddress);
      expect(JSON.stringify(login.response)).not.toContain("passwordHash");

      await auth.forgotPassword({ email: emailAddress });
      expect(email.reset?.resetToken).toBeTruthy();
      const persistedReset = await prisma.passwordResetToken.findFirstOrThrow({
        where: { userId: persistedUser.id, consumedAt: null },
      });
      expect(persistedReset.tokenHash).not.toBe(email.reset?.resetToken);

      await auth.resetPassword({
        resetToken: email.reset?.resetToken ?? "",
        newPassword: "UpdatedControl20!",
      });
      await expect(auth.session(login.sessionToken)).rejects.toThrow(
        "Your session is invalid or has expired.",
      );
      await expect(
        auth.resetPassword({
          resetToken: email.reset?.resetToken ?? "",
          newPassword: "AnotherControl30!",
        }),
      ).rejects.toThrow();
      await expect(
        auth.login({ email: emailAddress, password: "Controlled10!" }),
      ).rejects.toThrow();
      await expect(
        auth.login({ email: emailAddress, password: "UpdatedControl20!" }),
      ).resolves.toBeDefined();
    });

    it("shares atomic auth limits across instances and resets an expired window", async () => {
      const keyHash = createHash("sha256").update(randomUUID()).digest("hex");
      const first = new AuthRateLimitStore(prisma as never);
      const second = new AuthRateLimitStore(prisma as never);
      try {
        const attempts = await Promise.all([
          first.consume(keyHash, 60_000),
          second.consume(keyHash, 60_000),
          first.consume(keyHash, 60_000),
          second.consume(keyHash, 60_000),
        ]);
        expect(attempts.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
        await prisma.authRateLimitBucket.update({
          where: { keyHash },
          data: { resetAt: new Date(Date.now() - 1_000) },
        });
        expect(await second.consume(keyHash, 60_000)).toBe(1);
      } finally {
        await prisma.authRateLimitBucket.deleteMany({ where: { keyHash } });
      }
    });
  },
);
